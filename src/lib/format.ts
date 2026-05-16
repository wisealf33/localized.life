import type { ClaimStatus, Sale, SaleSourceType } from "./types";

export const categoryOptions = [
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

export function saleUrl(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl.replace(/\/$/, "")}/saletrail/sale/${slug}`;
}

export function listingId(slug: string) {
  return slug;
}

export function publicClaimMessage(slug: string) {
  return `I’m claiming this garage sale listing on Localized.life so shoppers can view details, updates, and save it to their SaleTrail route:\n${saleUrl(slug)}\nSaleTrail Listing ID: ${listingId(slug)}`;
}

export function claimUrl(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
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

  return {
    facebook: `Garage sale: ${sale.title}\n\n${when}\n${address}${categories}\n\n${sale.description || ""}\n\nDetails and route save link: ${url}`,
    nextdoor: `Hi neighbors, sharing this garage sale listing for ${sale.city}.\n\n${sale.title}\n${when}\n${address}${categories}\n\nDetails: ${url}`,
    craigslist: `${sale.title}\n\nDate/time: ${when}\nLocation: ${address}${categories}\n\n${sale.description || ""}\n\nMore details: ${url}`,
    outreach: `Hi! I saw your garage sale information and added a clean listing for it on SaleTrail by Localized.life so shoppers can find the details, save it, and add it to a route.\n\nHere is the listing:\n${url}\n\nIf this is your sale, you can claim it and update or correct anything here:\n${claimUrl(sale.slug)}\n\nIf you would rather not have it listed, no problem. You can request removal from the listing page.`,
    groupComment: `I added this to SaleTrail by Localized.life so people can save it and add it to a garage sale route:\n\n${url}\n\nOrganizer can claim, correct, or request removal from the listing page.`,
  };
}
