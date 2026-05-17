import { existsSync } from "fs";
import path from "path";
import { regionDestinationForSale } from "./regions";
import { urlSegment } from "./format";
import type { Sale } from "./types";

type ShareImageSale = Pick<Sale, "city" | "state" | "photo_urls">;

function publicFileExists(publicPath: string) {
  return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}

export function saleFallbackImagePath(sale: ShareImageSale) {
  const destination = regionDestinationForSale(sale);
  const cityPath = `/og/${urlSegment(sale.city)}.jpg`;
  if (destination.isDedicated && publicFileExists(cityPath)) return cityPath;

  const countyPath = `/og/${urlSegment(destination.county)}.jpg`;
  if (publicFileExists(countyPath)) return countyPath;

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

export function salePreviewImageNeed(sale: ShareImageSale) {
  if (sale.photo_urls?.find(Boolean)) return null;

  const destination = regionDestinationForSale(sale);
  const cityPath = `/og/${urlSegment(sale.city)}.jpg`;

  if (destination.isDedicated && !publicFileExists(cityPath)) {
    return {
      scope: "town" as const,
      label: `${sale.city}, ${sale.state}`,
      filename: `${urlSegment(sale.city)}.jpg`,
      publicPath: cityPath,
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
