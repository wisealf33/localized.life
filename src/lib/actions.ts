"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin";
import { categoryOptions } from "./format";
import { getSupabaseAdmin } from "./supabase";
import { hashSecret, randomToken, slugifyTitle } from "./tokens";
import type { ListingRequestType, SaleStatus } from "./types";

const photoBucket = "saletrail-photos";
const maxPhotos = 2;
const maxPhotoBytes = 5 * 1024 * 1024;
const allowedPhotoTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

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

function normalizeCategories(formData: FormData) {
  return values(formData, "categories").filter((category) => categoryOptions.includes(category));
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

export async function createSellerSale(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const slug = slugifyTitle(title);
  const manageToken = randomToken();
  const schedule = buildSchedule(formData);
  const photoUrls = await uploadPhotos(supabase, slug, formData);

  const insertPayload: Record<string, unknown> = {
    slug,
    title,
    description: value(formData, "description"),
    address_line: required(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: required(formData, "zip"),
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

  if (error) throw new Error(error.message);
  revalidatePath("/saletrail");
  redirect(`/saletrail/sale/${slug}/share?manage=${manageToken}`);
}

export async function createCommunitySale(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const slug = slugifyTitle(title);
  const schedule = buildSchedule(formData);

  const { error } = await supabase.from("sales").insert({
    slug,
    title,
    description: value(formData, "description"),
    address_line: required(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: required(formData, "zip"),
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
    sale_schedule: schedule.sale_schedule,
    categories: normalizeCategories(formData),
    status: "active",
    source_type: "community_added",
    claim_status: "unclaimed",
    visibility_status: "public",
    source_notes: value(formData, "source_notes"),
    source_url: value(formData, "source_url"),
    raw_source_text: value(formData, "raw_source_text"),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/saletrail");
  redirect(`/saletrail/sale/${slug}`);
}

export async function updateManagedSale(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const token = required(formData, "manage_token");
  const tokenHash = hashSecret(token);
  const status = required(formData, "status") as SaleStatus;
  const schedule = buildSchedule(formData);

  let { data: sale, error: findError } = await supabase
    .from("sales")
    .select("slug, photo_urls")
    .eq("manage_token_hash", tokenHash)
    .single();

  if (findError?.message.includes("photo_urls")) {
    const fallback = await supabase
      .from("sales")
      .select("slug")
      .eq("manage_token_hash", tokenHash)
      .single();
    sale = fallback.data ? { ...fallback.data, photo_urls: [] } : null;
    findError = fallback.error;
  }

  if (findError || !sale) throw new Error("Manage link was not found.");
  const photoUrls = await uploadPhotos(supabase, sale.slug, formData, sale.photo_urls || []);

  const updatePayload: Record<string, unknown> = {
    title: required(formData, "title"),
    description: value(formData, "description"),
    address_line: required(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: required(formData, "zip"),
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

  if (error) throw new Error(error.message);
  revalidatePath(`/saletrail/sale/${sale.slug}`);
  redirect(`/saletrail/sale/${sale.slug}`);
}

export async function submitClaimRequest(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const slug = required(formData, "slug");
  const listingId = slug;

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id")
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();

  if (saleError || !sale) throw new Error("Sale was not found.");

  const { error } = await supabase.from("claim_requests").insert({
    sale_id: sale.id,
    name: required(formData, "name"),
    contact: required(formData, "claimant_email"),
    claimant_email: required(formData, "claimant_email"),
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
  revalidatePath(`/saletrail/sale/${slug}`);
  redirect(`/saletrail/claim/${slug}?submitted=1`);
}

export async function submitListingRequest(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const slug = required(formData, "slug");
  const requestType = required(formData, "request_type") as ListingRequestType;

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .select("id")
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
  redirect(`/saletrail/sale/${slug}?request=received`);
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
      manage_token_hash: hashSecret(manageToken),
      claimed_at: new Date().toISOString(),
      claimed_by_name: request.name,
      claimed_by_contact: request.contact,
    })
    .eq("id", request.sale_id);

  await supabase.from("claim_requests").update({ status: "approved" }).eq("id", requestId);
  revalidatePath("/saletrail/admin");
  redirect(`/saletrail/admin?approved=${requestId}&manage=${manageToken}`);
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
