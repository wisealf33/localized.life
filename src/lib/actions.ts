"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin";
import { categoryOptions } from "./format";
import { getSupabaseAdmin } from "./supabase";
import { claimCode, hashSecret, randomToken, slugifyTitle } from "./tokens";
import type { ListingRequestType, SaleStatus } from "./types";

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

function localDateTime(formData: FormData, key: string) {
  const next = required(formData, key);
  const date = new Date(next);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${key}`);
  return date.toISOString();
}

function normalizeCategories(formData: FormData) {
  return values(formData, "categories").filter((category) => categoryOptions.includes(category));
}

export async function createSellerSale(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const slug = slugifyTitle(title);
  const manageToken = randomToken();

  const { error } = await supabase.from("sales").insert({
    slug,
    title,
    description: value(formData, "description"),
    address_line: required(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: required(formData, "zip"),
    starts_at: localDateTime(formData, "starts_at"),
    ends_at: localDateTime(formData, "ends_at"),
    sale_schedule: required(formData, "sale_schedule"),
    categories: normalizeCategories(formData),
    status: "active",
    source_type: "seller_created",
    claim_status: "claimed",
    visibility_status: "public",
    manage_token_hash: hashSecret(manageToken),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/saletrail");
  redirect(`/saletrail/sale/${slug}/share?manage=${manageToken}`);
}

export async function createCommunitySale(formData: FormData) {
  await requireAdmin();

  const supabase = getSupabaseAdmin();
  const title = required(formData, "title");
  const slug = slugifyTitle(title);

  const { error } = await supabase.from("sales").insert({
    slug,
    title,
    description: value(formData, "description"),
    address_line: required(formData, "address_line"),
    city: required(formData, "city"),
    state: required(formData, "state").toUpperCase(),
    zip: required(formData, "zip"),
    starts_at: localDateTime(formData, "starts_at"),
    ends_at: localDateTime(formData, "ends_at"),
    sale_schedule: required(formData, "sale_schedule"),
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

  const { data: sale, error: findError } = await supabase
    .from("sales")
    .select("slug")
    .eq("manage_token_hash", tokenHash)
    .single();

  if (findError || !sale) throw new Error("Manage link was not found.");

  const { error } = await supabase
    .from("sales")
    .update({
      title: required(formData, "title"),
      description: value(formData, "description"),
      address_line: required(formData, "address_line"),
      city: required(formData, "city"),
      state: required(formData, "state").toUpperCase(),
      zip: required(formData, "zip"),
      starts_at: localDateTime(formData, "starts_at"),
      ends_at: localDateTime(formData, "ends_at"),
      sale_schedule: required(formData, "sale_schedule"),
      categories: normalizeCategories(formData),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("manage_token_hash", tokenHash);

  if (error) throw new Error(error.message);
  revalidatePath(`/saletrail/sale/${sale.slug}`);
  redirect(`/saletrail/sale/${sale.slug}`);
}

export async function submitClaimRequest(formData: FormData) {
  const supabase = getSupabaseAdmin();
  const slug = required(formData, "slug");
  const code = claimCode();

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
    contact: required(formData, "contact"),
    relationship: required(formData, "relationship"),
    message: value(formData, "message"),
    claim_code: code,
    status: "pending",
  });

  if (error) throw new Error(error.message);

  await supabase.from("sales").update({ claim_status: "claim_pending" }).eq("id", sale.id);
  revalidatePath(`/saletrail/sale/${slug}`);
  redirect(`/saletrail/claim/${slug}?code=${code}`);
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
