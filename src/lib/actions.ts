"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin";
import { sendClaimApprovedEmail, sendClaimInstructionsEmail } from "./email";
import { eventPath, eventTypeOptions } from "./events";
import { categoryOptions, salePath, saleSharePath } from "./format";
import { geocodeAddress } from "./geocode";
import { getSupabaseAdmin } from "./supabase";
import { hashSecret, randomToken, slugifyTitle } from "./tokens";
import type {
  FeedbackRequestType,
  ListingRequestType,
  LocalEventType,
  MonetizationLeadCategory,
  MonetizationLeadPriority,
  MonetizationLeadStatus,
  OutreachStatus,
  SaleStatus,
} from "./types";

const photoBucket = "saletrail-photos";
const maxPhotos = 2;
const maxPhotoBytes = 5 * 1024 * 1024;
const allowedPhotoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const outreachStatuses = new Set<OutreachStatus>([
  "not_contacted",
  "message_sent",
  "comment_posted",
  "localized_group_posted",
  "follow_up_needed",
  "outreach_complete",
  "claimed",
  "do_not_contact",
  "removed",
]);

const feedbackRequestTypes = new Set<FeedbackRequestType>(["feature", "bug", "general"]);
const feedbackStatuses = new Set(["pending", "reviewed", "resolved", "rejected"]);
const localEventTypes = new Set<LocalEventType>(eventTypeOptions.map((option) => option.value));
const monetizationLeadCategories = new Set<MonetizationLeadCategory>([
  "local_sponsor",
  "print_partner",
  "estate_sale_company",
  "citywide_partner",
  "affiliate",
  "local_business",
  "grant",
  "other",
]);
const monetizationLeadStatuses = new Set<MonetizationLeadStatus>([
  "idea",
  "researching",
  "contacted",
  "interested",
  "not_fit",
  "active",
]);
const monetizationLeadPriorities = new Set<MonetizationLeadPriority>(["low", "medium", "high"]);

type BatchListingDay = {
  date?: string;
  start?: string;
  end?: string;
};

type BatchListing = {
  title?: string;
  description?: string;
  address_line?: string;
  city?: string;
  state?: string;
  zip?: string;
  days?: BatchListingDay[];
  categories?: string[];
  source_platform?: string;
  source_url?: string;
  source_poster_name?: string;
  source_notes?: string;
  raw_source_text?: string;
};

type ExistingBatchSale = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  address_line: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  location_precision: string | null;
  starts_at: string;
  ends_at: string;
  sale_schedule: string | null;
  categories: string[] | null;
  source_notes: string | null;
  source_platform: string | null;
  source_url: string | null;
  source_poster_name: string | null;
  raw_source_text: string | null;
};

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function values(formData: FormData, key: string) {
  return formData.getAll(key).map(String).filter(Boolean);
}

function required(formData: FormData, key: string) {
  const next = value(formData, key);
  if (!next) throw new Error(`Missing ${key}`);
  return next;
}

function asIsoLocalDateTime(dateValue: string, timeValue: string) {
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid sale day or time.");
  return date.toISOString();
}

function formatScheduleDate(dateValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateValue}T12:00`));
}

function formatScheduleTime(timeValue: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: timeValue.endsWith(":00") ? undefined : "2-digit",
  }).format(new Date(`2026-01-01T${timeValue}`));
}

function buildSchedule(formData: FormData) {
  const rows = [0, 1, 2, 3, 4]
    .map((row) => {
      const date = value(formData, `schedule_date_${row}`);
      if (!date) return null;
      const start = value(formData, `schedule_start_${row}`) || "08:00";
      const end = value(formData, `schedule_end_${row}`) || "14:00";
      return {
        date,
        start,
        end,
        startsAt: asIsoLocalDateTime(date, start),
        endsAt: asIsoLocalDateTime(date, end),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  if (rows.length === 0) throw new Error("Add at least one sale day.");
  if (rows.some((row) => row.endsAt <= row.startsAt)) {
    throw new Error("Each sale day needs an end time after its start time.");
  }

  const uncertain = formData.get("schedule_uncertain") === "on";
  const note = value(formData, "schedule_note");
  const lines = rows.map((row) => {
    const prefix = uncertain ? "Possible: " : "";
    return `${prefix}${formatScheduleDate(row.date)} ${formatScheduleTime(row.start)}-${formatScheduleTime(row.end)}`;
  });

  if (note) lines.push(note);

  return {
    starts_at: rows[0].startsAt,
    ends_at: rows[rows.length - 1].endsAt,
    sale_schedule: lines.join("\n"),
  };
}

function buildScheduleFromDays(days: BatchListingDay[] | undefined) {
  const rows = (days || [])
    .map((day) => {
      const date = String(day.date || "").trim();
      if (!date) return null;
      const start = String(day.start || "08:00").trim();
      const end = String(day.end || "14:00").trim();
      return {
        date,
        start,
        end,
        startsAt: asIsoLocalDateTime(date, start),
        endsAt: asIsoLocalDateTime(date, end),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  if (rows.length === 0) throw new Error("Each batch listing needs at least one day.");
  if (rows.some((row) => row.endsAt <= row.startsAt)) {
    throw new Error("Each batch listing day needs an end time after its start time.");
  }

  return {
    starts_at: rows[0].startsAt,
    ends_at: rows[rows.length - 1].endsAt,
    sale_schedule: rows
      .map((row) => `${formatScheduleDate(row.date)} ${formatScheduleTime(row.start)}-${formatScheduleTime(row.end)}`)
      .join("\n"),
  };
}

function normalizeCategories(formData: FormData) {
  return values(formData, "categories").filter((category) => categoryOptions.includes(category));
}

function normalizeBatchCategories(categories: string[] | undefined) {
  return (categories || []).filter((category) => categoryOptions.includes(category));
}

function normalizeText(text: string | null | undefined) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(text: string) {
  const stop = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "sale", "the", "with"]);
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !stop.has(token));
}

function titleLooksSimilar(a: string, b: string) {
  const left = meaningfulTokens(a);
  const right = new Set(meaningfulTokens(b));
  if (left.length === 0 || right.size === 0) return false;
  const overlap = left.filter((token) => right.has(token)).length;
  return overlap / Math.min(left.length, right.size) >= 0.7;
}

function normalizedMatch(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  return Boolean(left && right && left === right);
}

function hasSameSourcePoster(sale: ExistingBatchSale, listing: BatchListing) {
  return normalizedMatch(sale.source_poster_name, listing.source_poster_name);
}

function isHiddenAddress(address: string) {
  const normalized = normalizeText(address);
  return normalized.includes("hidden") || normalized.includes("available") || normalized.includes("unknown");
}

function mergeText(existing: string | null | undefined, next: string, label: string) {
  const cleanNext = next.trim();
  const cleanExisting = String(existing || "").trim();
  if (!cleanNext) return cleanExisting;
  if (!cleanExisting) return cleanNext;
  if (normalizeText(cleanExisting).includes(normalizeText(cleanNext))) return cleanExisting;
  return `${cleanExisting}\n\n${label}:\n${cleanNext}`;
}

function betterDescription(existing: string | null, next: string) {
  const cleanExisting = String(existing || "").trim();
  const cleanNext = next.trim();
  if (!cleanNext) return cleanExisting;
  if (!cleanExisting) return cleanNext;
  return cleanNext.length > cleanExisting.length ? cleanNext : cleanExisting;
}

function mergeCategories(existing: string[] | null | undefined, next: string[]) {
  return Array.from(new Set([...(existing || []), ...next].filter((category) => categoryOptions.includes(category))));
}

function addressFromForm(formData: FormData) {
  return {
    address_line: required(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: required(formData, "zip"),
  };
}

function withoutLocationPrecision(payload: Record<string, unknown>) {
  const next = { ...payload };
  delete next.location_precision;
  return next;
}

function photoFiles(formData: FormData) {
  return formData
    .getAll("photos")
    .filter((item): item is File => item instanceof File && item.size > 0);
}

async function uploadPhotos(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  slug: string,
  formData: FormData,
  existingUrls: string[] = [],
) {
  const files = photoFiles(formData);
  if (files.length === 0) return existingUrls.slice(0, maxPhotos);
  if (existingUrls.length + files.length > maxPhotos) {
    throw new Error("Each listing can have up to 2 photos.");
  }

  const uploadedUrls: string[] = [];

  for (const file of files) {
    const extension = allowedPhotoTypes.get(file.type);
    if (!extension) {
      throw new Error("Photos must be JPG, PNG, or WebP files.");
    }

    if (file.size > maxPhotoBytes) {
      throw new Error("Each photo must be 5 MB or smaller.");
    }

    const path = `${slug}/${randomToken(8)}.${extension}`;
    const { error } = await supabase.storage.from(photoBucket).upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(photoBucket).getPublicUrl(path);
    uploadedUrls.push(data.publicUrl);
  }

  return [...existingUrls, ...uploadedUrls].slice(0, maxPhotos);
}

async function findExistingBatchSale(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  listing: BatchListing,
  title: string,
  address: { address_line: string; city: string; state: string; zip: string },
  schedule: ReturnType<typeof buildScheduleFromDays>,
) {
  const columns =
    "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, categories, source_notes, source_platform, source_url, source_poster_name, raw_source_text";
  const sourceUrl = String(listing.source_url || "").trim();

  if (sourceUrl) {
    const { data, error } = await supabase.from("sales").select(columns).eq("source_url", sourceUrl).limit(1);
    if (error) throw new Error(error.message);
    if (data?.[0]) return data[0] as ExistingBatchSale;
  }

  if (!isHiddenAddress(address.address_line)) {
    const { data, error } = await supabase
      .from("sales")
      .select(columns)
      .eq("address_line", address.address_line)
      .eq("city", address.city)
      .eq("state", address.state)
      .eq("zip", address.zip)
      .limit(1);
    if (error) throw new Error(error.message);
    if (data?.[0]) return data[0] as ExistingBatchSale;
  }

  const { data, error } = await supabase
    .from("sales")
    .select(columns)
    .eq("city", address.city)
    .eq("state", address.state)
    .eq("zip", address.zip)
    .lte("starts_at", schedule.ends_at)
    .gte("ends_at", schedule.starts_at)
    .limit(12);
  if (error) throw new Error(error.message);

  return (
    ((data || []) as ExistingBatchSale[]).find((sale) => {
      if (hasSameSourcePoster(sale, listing) && titleLooksSimilar(sale.title, title)) return true;
      return titleLooksSimilar(sale.title, title) && normalizedMatch(sale.source_platform, listing.source_platform);
    }) || null
  );
}

function mergedBatchUpdate(
  existing: ExistingBatchSale,
  insertPayload: Record<string, unknown>,
  listing: BatchListing,
  coordinates: Awaited<ReturnType<typeof geocodeAddress>>,
) {
  const nextAddress = String(insertPayload.address_line || "");
  const shouldReplaceAddress = isHiddenAddress(existing.address_line) && nextAddress && !isHiddenAddress(nextAddress);
  const existingStart = String(existing.starts_at);
  const existingEnd = String(existing.ends_at);
  const nextStart = String(insertPayload.starts_at);
  const nextEnd = String(insertPayload.ends_at);
  const nextSourceUrl = String(insertPayload.source_url || "").trim();
  const updatePayload: Record<string, unknown> = {
    description: betterDescription(existing.description, String(insertPayload.description || "")),
    starts_at: nextStart < existingStart ? nextStart : existingStart,
    ends_at: nextEnd > existingEnd ? nextEnd : existingEnd,
    sale_schedule: mergeText(existing.sale_schedule, String(insertPayload.sale_schedule || ""), "Additional schedule source"),
    categories: mergeCategories(existing.categories, (insertPayload.categories as string[]) || []),
    source_notes: mergeText(existing.source_notes, String(insertPayload.source_notes || ""), "Additional source note"),
    raw_source_text: mergeText(existing.raw_source_text, String(insertPayload.raw_source_text || ""), "Additional raw source text"),
    updated_at: new Date().toISOString(),
  };

  if (!existing.source_platform && insertPayload.source_platform) updatePayload.source_platform = insertPayload.source_platform;
  if (!existing.source_poster_name && insertPayload.source_poster_name) updatePayload.source_poster_name = insertPayload.source_poster_name;
  if (!existing.source_url && nextSourceUrl) {
    updatePayload.source_url = nextSourceUrl;
  } else if (existing.source_url && nextSourceUrl && existing.source_url !== nextSourceUrl) {
    updatePayload.source_notes = mergeText(String(updatePayload.source_notes || existing.source_notes || ""), nextSourceUrl, "Additional source URL");
  }

  if (shouldReplaceAddress) {
    updatePayload.address_line = nextAddress;
    updatePayload.city = insertPayload.city;
    updatePayload.state = insertPayload.state;
    updatePayload.zip = insertPayload.zip;
    updatePayload.latitude = coordinates?.latitude ?? null;
    updatePayload.longitude = coordinates?.longitude ?? null;
    updatePayload.location_precision = coordinates?.precision ?? null;
  } else if ((existing.latitude === null || existing.longitude === null) && coordinates) {
    updatePayload.latitude = coordinates.latitude;
    updatePayload.longitude = coordinates.longitude;
    updatePayload.location_precision = coordinates.precision;
  }

  if (listing.title && String(listing.title).length > existing.title.length + 12) {
    updatePayload.title = String(listing.title).trim();
  }

  return updatePayload;
}

export async function createSellerSale(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const slug = slugifyTitle(title);
  const manageToken = randomToken();
  const schedule = buildSchedule(formData);
  const photoUrls = await uploadPhotos(supabase, slug, formData);
  const address = addressFromForm(formData);
  const coordinates = await geocodeAddress(address);

  const insertPayload: Record<string, unknown> = {
    slug,
    title,
    description: value(formData, "description"),
    ...address,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    location_precision: coordinates?.precision ?? null,
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
    sale_schedule: schedule.sale_schedule,
    categories: normalizeCategories(formData),
    status: "active",
    source_type: "seller_created",
    claim_status: "claimed",
    visibility_status: "public",
    manage_token_hash: hashSecret(manageToken),
  };

  if (photoUrls.length > 0) insertPayload.photo_urls = photoUrls;

  const { error } = await supabase.from("sales").insert(insertPayload);
  if (error?.message.includes("location_precision")) {
    const retry = await supabase.from("sales").insert(withoutLocationPrecision(insertPayload));
    if (retry.error) throw new Error(retry.error.message);
  } else if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/saletrail");
  redirect(`${saleSharePath({ slug, city: String(insertPayload.city), state: String(insertPayload.state) })}?manage=${manageToken}`);
}

export async function createCommunitySale(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const slug = slugifyTitle(title);
  const schedule = buildSchedule(formData);
  const address = addressFromForm(formData);
  const coordinates = await geocodeAddress(address);

  const insertPayload: Record<string, unknown> = {
    slug,
    title,
    description: value(formData, "description"),
    ...address,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    location_precision: coordinates?.precision ?? null,
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
    sale_schedule: schedule.sale_schedule,
    categories: normalizeCategories(formData),
    status: "active",
    source_type: "community_added",
    claim_status: "unclaimed",
    visibility_status: "public",
    source_notes: value(formData, "source_notes"),
    source_platform: value(formData, "source_platform"),
    source_url: value(formData, "source_url"),
    source_poster_name: value(formData, "source_poster_name"),
    raw_source_text: value(formData, "raw_source_text"),
    outreach_status: "not_contacted",
  };

  const { error } = await supabase.from("sales").insert(insertPayload);
  if (error?.message.includes("location_precision")) {
    const retry = await supabase.from("sales").insert(withoutLocationPrecision(insertPayload));
    if (retry.error) throw new Error(retry.error.message);
  } else if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/saletrail");
  redirect(salePath({ slug, city: address.city, state: address.state }));
}

export async function createCommunitySalesBatch(formData: FormData) {
  await requireAdmin();

  const raw = required(formData, "batch_json");
  let listings: BatchListing[];
  try {
    const parsed = JSON.parse(raw);
    listings = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    throw new Error("Batch import needs valid JSON.");
  }

  if (listings.length === 0) throw new Error("Batch import is empty.");
  if (listings.length > 25) throw new Error("Import 25 listings or fewer at a time.");

  const supabase = getSupabaseAdmin();
  let inserted = 0;
  let updated = 0;
  const skipped = 0;

  for (const listing of listings) {
    const title = String(listing.title || "").trim();
    const address = {
      address_line: String(listing.address_line || "").trim(),
      city: String(listing.city || "").trim(),
      state: String(listing.state || "").trim().toUpperCase(),
      zip: String(listing.zip || "").trim(),
    };
    if (!title || !address.address_line || !address.city || !address.state || !address.zip) {
      throw new Error("Each batch listing needs title, address_line, city, state, and zip.");
    }

    const slug = slugifyTitle(title);
    const schedule = buildScheduleFromDays(listing.days);
    const coordinates = await geocodeAddress(address);
    const insertPayload: Record<string, unknown> = {
      slug,
      title,
      description: String(listing.description || "").trim(),
      ...address,
      latitude: coordinates?.latitude ?? null,
      longitude: coordinates?.longitude ?? null,
      location_precision: coordinates?.precision ?? null,
      starts_at: schedule.starts_at,
      ends_at: schedule.ends_at,
      sale_schedule: schedule.sale_schedule,
      categories: normalizeBatchCategories(listing.categories),
      status: "active",
      source_type: "community_added",
      claim_status: "unclaimed",
      visibility_status: "public",
      source_notes: String(listing.source_notes || "Community-added from public source. Do not use source photos without permission.").trim(),
      source_platform: String(listing.source_platform || "").trim(),
      source_url: String(listing.source_url || "").trim(),
      source_poster_name: String(listing.source_poster_name || "").trim(),
      raw_source_text: String(listing.raw_source_text || "").trim(),
      outreach_status: "not_contacted",
    };

    const existing = await findExistingBatchSale(supabase, listing, title, address, schedule);
    if (existing) {
      const updatePayload = mergedBatchUpdate(existing, insertPayload, listing, coordinates);
      const { error } = await supabase.from("sales").update(updatePayload).eq("id", existing.id);
      if (error?.message.includes("location_precision")) {
        const retry = await supabase.from("sales").update(withoutLocationPrecision(updatePayload)).eq("id", existing.id);
        if (retry.error) throw new Error(retry.error.message);
      } else if (error) {
        throw new Error(error.message);
      }
      revalidatePath(salePath(existing));
      updated += 1;
      continue;
    }

    const { error } = await supabase.from("sales").insert(insertPayload);
    if (error?.message.includes("location_precision")) {
      const retry = await supabase.from("sales").insert(withoutLocationPrecision(insertPayload));
      if (retry.error) throw new Error(retry.error.message);
    } else if (error) {
      throw new Error(error.message);
    }
    inserted += 1;
  }

  revalidatePath("/saletrail");
  revalidatePath("/saletrail/map");
  redirect(`/saletrail/admin?batch=${inserted}&updated=${updated}&skipped=${skipped}`);
}

export async function updateManagedSale(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const token = required(formData, "manage_token");
  const tokenHash = hashSecret(token);
  const status = required(formData, "status") as SaleStatus;
  const schedule = buildSchedule(formData);

  let { data: sale, error: findError } = await supabase
    .from("sales")
    .select("slug, address_line, city, state, zip, latitude, longitude, location_precision, photo_urls")
    .eq("manage_token_hash", tokenHash)
    .single();

  if (findError?.message.includes("location_precision")) {
    const fallback = await supabase
      .from("sales")
      .select("slug, address_line, city, state, zip, latitude, longitude, photo_urls")
      .eq("manage_token_hash", tokenHash)
      .single();
    sale = fallback.data ? { ...fallback.data, location_precision: null } : null;
    findError = fallback.error;
  } else if (findError?.message.includes("photo_urls")) {
    const fallback = await supabase
      .from("sales")
      .select("slug, address_line, city, state, zip, latitude, longitude, location_precision")
      .eq("manage_token_hash", tokenHash)
      .single();
    sale = fallback.data ? { ...fallback.data, photo_urls: [] } : null;
    findError = fallback.error;
  }

  if (findError || !sale) throw new Error("Manage link was not found.");
  const photoUrls = await uploadPhotos(supabase, sale.slug, formData, sale.photo_urls || []);
  const address = addressFromForm(formData);
  const addressChanged =
    address.address_line !== sale.address_line ||
    address.city !== sale.city ||
    address.state !== sale.state ||
    address.zip !== sale.zip;
  const coordinates = addressChanged ? await geocodeAddress(address) : null;

  const updatePayload: Record<string, unknown> = {
    title: required(formData, "title"),
    description: value(formData, "description"),
    ...address,
    latitude: addressChanged ? (coordinates?.latitude ?? null) : sale.latitude,
    longitude: addressChanged ? (coordinates?.longitude ?? null) : sale.longitude,
    location_precision: addressChanged ? (coordinates?.precision ?? null) : sale.location_precision,
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
    sale_schedule: schedule.sale_schedule,
    categories: normalizeCategories(formData),
    status,
    updated_at: new Date().toISOString(),
  };

  if (photoFiles(formData).length > 0 || (sale.photo_urls || []).length > 0) {
    updatePayload.photo_urls = photoUrls;
  }

  const { error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("manage_token_hash", tokenHash);

  if (error?.message.includes("location_precision")) {
    const retry = await supabase
      .from("sales")
      .update(withoutLocationPrecision(updatePayload))
      .eq("manage_token_hash", tokenHash);
    if (retry.error) throw new Error(retry.error.message);
  } else if (error) {
    throw new Error(error.message);
  }
  revalidatePath(salePath(sale));
  redirect(salePath({ slug: sale.slug, city: address.city, state: address.state }));
}

export async function submitClaimRequest(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const slug = required(formData, "slug");
  const listingId = slug;

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, title, slug, city, state, source_url")
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();

  if (saleError || !sale) throw new Error("Sale was not found.");
  const claimantEmail = required(formData, "claimant_email");
  const claimantName = required(formData, "name");

  const { error } = await supabase.from("claim_requests").insert({
    sale_id: sale.id,
    name: claimantName,
    contact: claimantEmail,
    claimant_email: claimantEmail,
    facebook_profile_name: required(formData, "facebook_profile_name"),
    relationship: "original_poster",
    message: value(formData, "message"),
    claim_code: listingId,
    verification_method: null,
    wants_updates: false,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  await supabase.from("sales").update({ claim_status: "claim_pending" }).eq("id", sale.id);
  const emailResult = await sendClaimInstructionsEmail({
    claimantEmail,
    claimantName,
    listingTitle: sale.title,
    slug: sale.slug,
    city: sale.city,
    state: sale.state,
    sourceUrl: sale.source_url,
  });
  revalidatePath(salePath(sale));
  redirect(`/saletrail/claim/${slug}?submitted=1&email=${emailResult.sent ? "sent" : "setup"}`);
}

export async function submitListingRequest(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const slug = required(formData, "slug");
  const requestType = required(formData, "request_type") as ListingRequestType;

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id, slug, city, state")
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();

  if (saleError || !sale) throw new Error("Sale was not found.");

  const { error } = await supabase.from("listing_requests").insert({
    sale_id: sale.id,
    request_type: requestType,
    name: value(formData, "name"),
    contact: value(formData, "contact"),
    message: required(formData, "message"),
    status: "pending",
  });

  if (error) throw new Error(error.message);
  redirect(`${salePath(sale)}?request=received`);
}

export async function approveClaim(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const requestId = required(formData, "request_id");
  const { data: request, error: requestError } = await supabase
    .from("claim_requests")
    .select("*, sales(title, slug, city, state)")
    .eq("id", requestId)
    .single();

  if (requestError || !request) throw new Error("Claim request was not found.");

  const manageToken = randomToken();
  await supabase
    .from("sales")
    .update({
      claim_status: "claimed",
      outreach_status: "claimed",
      outreach_last_at: new Date().toISOString(),
      manage_token_hash: hashSecret(manageToken),
      claimed_at: new Date().toISOString(),
      claimed_by_name: request.name,
      claimed_by_contact: request.contact,
    })
    .eq("id", request.sale_id);

  await supabase.from("claim_requests").update({ status: "approved" }).eq("id", requestId);
  if (request.claimant_email) {
    await sendClaimApprovedEmail({
      claimantEmail: request.claimant_email,
      claimantName: request.name,
      listingTitle: request.sales?.title || "your garage sale",
      slug: request.sales?.slug || "",
      city: request.sales?.city || "",
      state: request.sales?.state || "",
      manageToken,
    });
  }
  revalidatePath("/saletrail/admin");
  redirect(`/saletrail/admin?approved=${requestId}&manage=${manageToken}`);
}

export async function rejectClaim(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const requestId = required(formData, "request_id");
  const { data: request, error: requestError } = await supabase
    .from("claim_requests")
    .select("sale_id")
    .eq("id", requestId)
    .single();

  if (requestError || !request) throw new Error("Claim request was not found.");

  const { error } = await supabase.from("claim_requests").update({ status: "rejected" }).eq("id", requestId);
  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from("claim_requests")
    .select("id", { count: "exact", head: true })
    .eq("sale_id", request.sale_id)
    .eq("status", "pending");

  if (!count) {
    await supabase.from("sales").update({ claim_status: "unclaimed" }).eq("id", request.sale_id).eq("claim_status", "claim_pending");
  }

  revalidatePath("/saletrail/admin");
  redirect("/saletrail/admin?updated=1");
}

export async function resolveListingRequest(formData: FormData) {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const requestId = required(formData, "request_id");
  const status = required(formData, "status");
  const { error } = await supabase.from("listing_requests").update({ status }).eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/saletrail/admin");
  redirect("/saletrail/admin?updated=1");
}

export async function submitFeedbackRequest(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const requestType = required(formData, "request_type") as FeedbackRequestType;
  if (!feedbackRequestTypes.has(requestType)) throw new Error("Invalid feedback type.");

  const { error } = await supabase.from("feedback_requests").insert({
    request_type: requestType,
    name: value(formData, "name"),
    contact: value(formData, "contact"),
    page_url: value(formData, "page_url"),
    message: required(formData, "message"),
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/saletrail/admin");
  redirect("/saletrail/feedback?submitted=1");
}

export async function resolveFeedbackRequest(formData: FormData) {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const requestId = required(formData, "request_id");
  const status = required(formData, "status");
  if (!feedbackStatuses.has(status)) throw new Error("Invalid feedback status.");
  const { error } = await supabase.from("feedback_requests").update({ status }).eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath("/saletrail/admin");
  redirect("/saletrail/admin?updated=1");
}

export async function createMonetizationLead(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const category = required(formData, "category") as MonetizationLeadCategory;
  const priority = required(formData, "priority") as MonetizationLeadPriority;
  if (!monetizationLeadCategories.has(category)) throw new Error("Invalid monetization category.");
  if (!monetizationLeadPriorities.has(priority)) throw new Error("Invalid monetization priority.");

  const { error } = await supabase.from("monetization_leads").insert({
    title: required(formData, "title"),
    category,
    priority,
    status: "idea",
    area: value(formData, "area"),
    company_name: value(formData, "company_name"),
    contact_name: value(formData, "contact_name"),
    contact_email: value(formData, "contact_email"),
    contact_url: value(formData, "contact_url"),
    estimated_value: value(formData, "estimated_value"),
    fit_notes: value(formData, "fit_notes"),
    next_step: value(formData, "next_step"),
    admin_notes: value(formData, "admin_notes"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/saletrail/admin");
  redirect("/saletrail/admin?updated=1");
}

export async function updateMonetizationLead(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const leadId = required(formData, "lead_id");
  const status = required(formData, "status") as MonetizationLeadStatus;
  const priority = required(formData, "priority") as MonetizationLeadPriority;
  if (!monetizationLeadStatuses.has(status)) throw new Error("Invalid monetization status.");
  if (!monetizationLeadPriorities.has(priority)) throw new Error("Invalid monetization priority.");

  const { error } = await supabase
    .from("monetization_leads")
    .update({
      status,
      priority,
      next_step: value(formData, "next_step"),
      admin_notes: value(formData, "admin_notes"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);
  revalidatePath("/saletrail/admin");
  redirect("/saletrail/admin?updated=1");
}

export async function updateOutreachStatus(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const saleId = required(formData, "sale_id");
  const status = required(formData, "outreach_status") as OutreachStatus;
  if (!outreachStatuses.has(status)) throw new Error("Invalid outreach status.");

  const databaseStatus: OutreachStatus = status === "outreach_complete" ? "localized_group_posted" : status;
  const updatePayload: Record<string, unknown> = {
    outreach_status: databaseStatus,
    outreach_last_at: new Date().toISOString(),
  };
  if (status === "not_contacted") {
    updatePayload.outreach_private_done = false;
    updatePayload.outreach_private_done_at = null;
    updatePayload.outreach_group_done = false;
    updatePayload.outreach_group_done_at = null;
  }
  if (status === "message_sent") {
    updatePayload.outreach_private_done = true;
    updatePayload.outreach_private_done_at = new Date().toISOString();
  }
  if (status === "localized_group_posted") {
    updatePayload.outreach_group_done = true;
    updatePayload.outreach_group_done_at = new Date().toISOString();
  }
  if (status === "outreach_complete") {
    updatePayload.outreach_private_done = true;
    updatePayload.outreach_private_done_at = new Date().toISOString();
    updatePayload.outreach_group_done = true;
    updatePayload.outreach_group_done_at = new Date().toISOString();
  }
  const notes = value(formData, "outreach_notes");
  if (notes) updatePayload.outreach_notes = notes;
  if (status === "removed") updatePayload.visibility_status = "removed";

  const { data, error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("id", saleId)
    .eq("source_type", "community_added")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Outreach item was not found or is not community-added.");
  revalidatePath("/saletrail/admin");
  revalidatePath("/saletrail");
  redirect("/saletrail/admin?outreach=updated#admin-outreach");
}

export async function updateOutreachChecklist(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const saleId = required(formData, "sale_id");
  const privateDone = formData.get("outreach_private_done") === "on";
  const groupDone = formData.get("outreach_group_done") === "on";
  const now = new Date().toISOString();
  const status: OutreachStatus = groupDone ? "localized_group_posted" : privateDone ? "message_sent" : "not_contacted";
  const updatePayload: Record<string, unknown> = {
    outreach_private_done: privateDone,
    outreach_private_done_at: privateDone ? now : null,
    outreach_group_done: groupDone,
    outreach_group_done_at: groupDone ? now : null,
    outreach_status: status,
    outreach_last_at: privateDone || groupDone ? now : null,
  };

  const notes = value(formData, "outreach_notes");
  if (notes) updatePayload.outreach_notes = notes;

  const { data, error } = await supabase
    .from("sales")
    .update(updatePayload)
    .eq("id", saleId)
    .eq("source_type", "community_added")
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Outreach item was not found or is not community-added.");
  revalidatePath("/saletrail/admin");
  redirect("/saletrail/admin?outreach=updated#admin-outreach");
}

export async function createLocalEvent(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const eventType = required(formData, "event_type") as LocalEventType;
  if (!localEventTypes.has(eventType)) throw new Error("Invalid event type.");

  const slug = slugifyTitle(title);
  const address = {
    address_line: value(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: value(formData, "zip"),
  };
  const startsAt = asIsoLocalDateTime(required(formData, "start_date"), value(formData, "start_time") || "08:00");
  const endsAt = asIsoLocalDateTime(required(formData, "end_date"), value(formData, "end_time") || "17:00");
  if (endsAt <= startsAt) throw new Error("Event end needs to be after the event start.");
  const coordinates = address.address_line && address.zip ? await geocodeAddress(address) : null;

  const insertPayload = {
    slug,
    title,
    event_type: eventType,
    description: value(formData, "description"),
    address_line: address.address_line,
    city: address.city,
    state: address.state,
    zip: address.zip,
    county: value(formData, "county"),
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    starts_at: startsAt,
    ends_at: endsAt,
    event_schedule: value(formData, "event_schedule"),
    source_url: value(formData, "source_url"),
    source_platform: value(formData, "source_platform"),
    source_notes: value(formData, "source_notes"),
    status: "active",
    visibility_status: "public",
  };

  const { error } = await supabase.from("local_events").insert(insertPayload);
  if (error) throw new Error(error.message);

  revalidatePath("/saletrail/admin");
  revalidatePath("/saletrail/events");
  redirect(eventPath({ slug, city: address.city, state: address.state }));
}

export async function addHouseholdToCommunityWide(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const eventId = required(formData, "event_id");

  const { data: event, error: eventError } = await supabase
    .from("local_events")
    .select("id, title, slug, event_type, city, state, zip, starts_at, ends_at, event_schedule, visibility_status, status")
    .eq("id", eventId)
    .eq("event_type", "city_wide_garage_sale")
    .eq("visibility_status", "public")
    .eq("status", "active")
    .single();

  if (eventError || !event) throw new Error("Community-wide sale was not found.");

  const address = {
    address_line: required(formData, "address_line"),
    city: event.city,
    state: event.state,
    zip: value(formData, "zip") || event.zip || "",
  };
  if (!address.zip) throw new Error("Add a ZIP code for this household stop.");

  const existing = await supabase
    .from("sales")
    .select("slug, city, state")
    .eq("event_id", event.id)
    .eq("address_line", address.address_line)
    .eq("city", address.city)
    .eq("state", address.state)
    .eq("zip", address.zip)
    .limit(1);
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data?.[0]) {
    redirect(`${salePath(existing.data[0])}?already=1`);
  }

  const title = `${address.address_line} in ${address.city}, ${address.state} - Community-Wide Garage Sale`;
  const slug = slugifyTitle(title);
  const manageToken = randomToken();
  const coordinates = await geocodeAddress(address);
  const itemNotes = value(formData, "description");
  const scheduleNote = value(formData, "schedule_note");
  const saleSchedule = [event.event_schedule || `${event.title} event hours`, scheduleNote ? `Household note: ${scheduleNote}` : ""]
    .filter(Boolean)
    .join("\n");

  const insertPayload: Record<string, unknown> = {
    slug,
    title,
    description:
      itemNotes ||
      `Household stop added to ${event.title}. Save this stop to include it in your SaleTrail route.`,
    ...address,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    location_precision: coordinates?.precision ?? null,
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    sale_schedule: saleSchedule,
    categories: ["Garage sale", "City-wide sale", "Community sale"],
    status: "active",
    source_type: "seller_created",
    claim_status: "claimed",
    visibility_status: "public",
    source_notes: `Added directly by a household from the ${event.title} page.`,
    event_id: event.id,
    manage_token_hash: hashSecret(manageToken),
  };

  const { error } = await supabase.from("sales").insert(insertPayload);
  if (error?.message.includes("location_precision")) {
    const retry = await supabase.from("sales").insert(withoutLocationPrecision(insertPayload));
    if (retry.error) throw new Error(retry.error.message);
  } else if (error) {
    throw new Error(error.message);
  }

  revalidatePath(eventPath(event));
  revalidatePath("/saletrail");
  revalidatePath("/saletrail/map");
  redirect(`${saleSharePath({ slug, city: address.city, state: address.state })}?manage=${manageToken}`);
}

export async function updateSaleEvent(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const saleId = required(formData, "sale_id");
  const eventId = value(formData, "event_id") || null;
  const { error } = await supabase.from("sales").update({ event_id: eventId, updated_at: new Date().toISOString() }).eq("id", saleId);
  if (error) throw new Error(error.message);

  revalidatePath("/saletrail/admin");
  revalidatePath("/saletrail/events");
  revalidatePath("/saletrail");
  redirect("/saletrail/admin?updated=1");
}
