import { existsSync } from "fs";
import path from "path";
import { countyForSale, regionDestinationForSale } from "./regions";
import { urlSegment } from "./format";
import type { Sale } from "./types";

type ShareImageSale = Pick<Sale, "city" | "state" | "photo_urls" | "categories">;

const generalFallbackImages = [
  {
    label: "General estate sale image",
    filename: "estate-sale.jpg",
    publicPath: "/og/estate-sale.jpg",
    description: "Used when an estate sale does not have a seller photo, town image, or county image.",
  },
  {
    label: "General city-wide sale image",
    filename: "city-wide-sale.jpg",
    publicPath: "/og/city-wide-sale.jpg",
    description: "Used for city-wide and village-wide sale events when no more specific image exists.",
  },
  {
    label: "General Illinois image",
    filename: "illinois.jpg",
    publicPath: "/og/illinois.jpg",
    description: "Statewide fallback as SaleTrail spreads beyond the first open counties.",
  },
  {
    label: "General Indiana image",
    filename: "indiana.jpg",
    publicPath: "/og/indiana.jpg",
    description: "Statewide fallback for Indiana listings.",
  },
  {
    label: "General Wisconsin image",
    filename: "wisconsin.jpg",
    publicPath: "/og/wisconsin.jpg",
    description: "Statewide fallback for Wisconsin listings.",
  },
];

function publicFileExists(publicPath: string) {
  return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}

function stateImagePath(state: string) {
  const normalized = state.trim().toLowerCase();
  const stateNames: Record<string, string> = {
    il: "illinois",
    illinois: "illinois",
    in: "indiana",
    indiana: "indiana",
    wi: "wisconsin",
    wisconsin: "wisconsin",
  };
  const stateName = stateNames[normalized];
  return stateName ? `/og/${stateName}.jpg` : null;
}

function saleTypeFallbackPath(sale: ShareImageSale) {
  const categories = sale.categories || [];
  if (categories.includes("Route sale")) return "/og/city-wide-sale.jpg";
  if (categories.includes("City-wide sale")) return "/og/city-wide-sale.jpg";
  if (categories.includes("Estate sale")) return "/og/estate-sale.jpg";
  return null;
}

export function saleFallbackImagePath(sale: ShareImageSale) {
  const destination = regionDestinationForSale(sale);
  const cityPath = `/og/${urlSegment(sale.city)}.jpg`;
  if (destination.isDedicated && publicFileExists(cityPath)) return cityPath;

  const countyPath = `/og/${urlSegment(destination.county)}.jpg`;
  if (publicFileExists(countyPath)) return countyPath;

  const typePath = saleTypeFallbackPath(sale);
  if (typePath && publicFileExists(typePath)) return typePath;

  const statePath = stateImagePath(sale.state);
  if (statePath && publicFileExists(statePath)) return statePath;

  const defaultPath = "/og/default-saletrail.jpg";
  if (publicFileExists(defaultPath)) return defaultPath;

  return null;
}

export function saleFlyerImage(sale: ShareImageSale) {
  const uploadedPhoto = sale.photo_urls?.find(Boolean);
  if (uploadedPhoto) return { src: uploadedPhoto, kind: "photo" as const };

  const fallback = saleFallbackImagePath(sale);
  if (fallback) return { src: fallback, kind: "fallback" as const };

  return null;
}

export const salePreviewImage = saleFlyerImage;

export function missingGeneralFallbackImageNeeds() {
  return generalFallbackImages.filter((image) => !publicFileExists(image.publicPath));
}

export function salePreviewImageNeed(sale: ShareImageSale) {
  if (sale.photo_urls?.find(Boolean)) return null;

  const destination = regionDestinationForSale(sale);
  const county = countyForSale(sale);
  const cityPath = `/og/${urlSegment(sale.city)}.jpg`;

  if (destination.isDedicated && !publicFileExists(cityPath)) {
    return {
      scope: "town" as const,
      label: `${sale.city}, ${sale.state}`,
      filename: `${urlSegment(sale.city)}.jpg`,
      publicPath: cityPath,
    };
  }

  if (!county) {
    return {
      scope: "mapping" as const,
      label: `${sale.city}, ${sale.state}`,
      filename: "",
      publicPath: `mapping:${urlSegment(sale.state)}:${urlSegment(sale.city)}`,
    };
  }

  const countyPath = `/og/${urlSegment(destination.county)}.jpg`;
  if (!publicFileExists(countyPath)) {
    return {
      scope: "county" as const,
      label: `${destination.county}, ${destination.state}`,
      filename: `${urlSegment(destination.county)}.jpg`,
      publicPath: countyPath,
    };
  }

  return null;
}
