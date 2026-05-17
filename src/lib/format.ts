import type { ClaimStatus, Sale, SaleSourceType } from "./types";
import { dedicatedAreaShareNote } from "./regions";

export const categoryOptions = [
  "Garage sale",
  "Estate sale",
  "Rummage sale",
  "Community sale",
  "Vintage market",
  "Furniture",
  "Tools",
  "Kids",
  "Clothing",
  "Books",
  "Home goods",
  "Electronics",
  "Collectibles",
  "Multi-family",
  "Moving sale",
];

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDateRange(sale: Pick<Sale, "starts_at" | "ends_at">) {
  return `${formatDateTime(sale.starts_at)} to ${formatDateTime(sale.ends_at)}`;
}

export function formatSaleHours(sale: Pick<Sale, "starts_at" | "ends_at" | "sale_schedule">) {
  return sale.sale_schedule?.trim() || formatDateRange(sale);
}

export function fullAddress(sale: Pick<Sale, "address_line" | "city" | "state" | "zip">) {
  return `${sale.address_line}, ${sale.city}, ${sale.state} ${sale.zip}`;
}

export function mapSearchUrl(sale: Pick<Sale, "address_line" | "city" | "state" | "zip">) {
  const params = new URLSearchParams({
    api: "1",
    query: fullAddress(sale),
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function urlSegment(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function listingCode(slug: string) {
  return slug.split("-").filter(Boolean).at(-1) || slug;
}

export function salePath(sale: Pick<Sale, "slug" | "city" | "state">) {
  return `/saletrail/sales/${urlSegment(sale.state)}/${urlSegment(sale.city)}/${listingCode(sale.slug)}`;
}

export function saleSharePath(sale: Pick<Sale, "slug" | "city" | "state">) {
  return `${salePath(sale)}/share`;
}

export function saleUrl(sale: Pick<Sale, "slug" | "city" | "state"> | string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life";
  if (typeof sale === "string") return `${baseUrl.replace(/\/$/, "")}/saletrail/sale/${sale}`;
  return `${baseUrl.replace(/\/$/, "")}${salePath(sale)}`;
}

export function listingId(slug: string) {
  return listingCode(slug);
}

export function publicClaimMessage(slug: string) {
  return `I’m claiming this garage sale listing on Localized.life so shoppers can view details, updates, and save it to their SaleTrail route:\n${saleUrl(slug)}\nSaleTrail Listing ID: ${listingId(slug)}`;
}

export function publicClaimMessageForSale(sale: Pick<Sale, "slug" | "city" | "state">) {
  return `I’m claiming this garage sale listing on Localized.life so shoppers can view details, updates, and save it to their SaleTrail route:\n${saleUrl(sale)}\nSaleTrail Listing ID: ${listingId(sale.slug)}`;
}

export function claimUrl(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life";
  return `${baseUrl.replace(/\/$/, "")}/saletrail/claim/${slug}`;
}

export function sourceLabel(sourceType: SaleSourceType, claimStatus: ClaimStatus) {
  if (claimStatus === "claimed") return "Claimed by organizer";
  if (sourceType === "seller_created") return "Listed by organizer";
  if (claimStatus === "claim_pending") return "Community-added · claim pending";
  return "Community-added · unclaimed";
}

export function sourceTone(sourceType: SaleSourceType, claimStatus: ClaimStatus) {
  if (claimStatus === "claimed" || sourceType === "seller_created") return "good";
  if (claimStatus === "claim_pending") return "watch";
  return "plain";
}

export function socialCopy(sale: Sale, url: string) {
  const when = formatSaleHours(sale);
  const address = fullAddress(sale);
  const categories = sale.categories?.length ? `\nItems: ${sale.categories.join(", ")}` : "";
  const publicPost = `Garage sale: ${sale.title}\n\n${when}\n${address}${categories}\n\n${sale.description || ""}\n\nDetails, map, and route save link: ${url}${dedicatedAreaShareNote(sale)}`;

  return {
    publicPost,
    outreach: `Hi! I saw your garage sale information and added a clean listing for it on SaleTrail by Localized.life so shoppers can find the details, save it, and add it to a route.\n\nHere is the listing:\n${url}\n\nIf this is your sale, you can claim it and update or correct anything here:\n${claimUrl(sale.slug)}\n\nIf you would rather not have it listed, no problem. You can request removal from the listing page.`,
    groupComment: `I added this to SaleTrail by Localized.life so people can save it and add it to a garage sale route:\n\n${url}\n\nOrganizer can claim, correct, or request removal from the listing page.`,
  };
}
