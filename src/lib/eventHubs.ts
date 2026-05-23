import type { Sale } from "./types";

type SaleHubInput = Pick<Sale, "title" | "address_line" | "categories">;

const hubAddressPatterns = [
  /city-wide sale/i,
  /village-wide sale/i,
  /town-wide sale/i,
  /community-wide sale/i,
  /participating homes/i,
  /neighborhood/i,
  /route-wide sale/i,
  /statewide sale/i,
];

const hubTitlePatterns = [
  /city-wide/i,
  /village-wide/i,
  /town-wide/i,
  /community wide/i,
  /community-wide/i,
  /garage sale days/i,
  /yard sale festival/i,
  /route 40 yard sale festival/i,
  /national road.*festival/i,
];

export function isSaleEventHub(sale: SaleHubInput) {
  const categories = sale.categories || [];
  const canBeHub = categories.includes("City-wide sale") || categories.includes("Route sale") || categories.includes("Community sale");
  if (!canBeHub) return false;

  return (
    hubAddressPatterns.some((pattern) => pattern.test(sale.address_line || "")) ||
    hubTitlePatterns.some((pattern) => pattern.test(sale.title || ""))
  );
}
