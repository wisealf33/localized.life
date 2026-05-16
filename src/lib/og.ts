import { existsSync } from "fs";
import path from "path";
import type { Sale } from "./types";
import { regionDestinationForSale } from "./regions";
import { saleUrl, urlSegment } from "./format";

type OgSale = Pick<Sale, "slug" | "title" | "city" | "state" | "photo_urls">;

const defaultOgPath = "/og/default-saletrail.jpg";

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life").replace(/\/$/, "");
}

function publicFileExists(publicPath: string) {
  return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}

function absolutePublicUrl(publicPath: string) {
  return `${siteUrl()}${publicPath}`;
}

function firstUploadedPhoto(sale: OgSale) {
  const photo = sale.photo_urls?.find(Boolean);
  return photo || null;
}

export function saleOgImageUrl(sale: OgSale) {
  const uploadedPhoto = firstUploadedPhoto(sale);
  if (uploadedPhoto) return uploadedPhoto;

  const cityPath = `/og/${urlSegment(sale.city)}.jpg`;
  if (publicFileExists(cityPath)) return absolutePublicUrl(cityPath);

  const destination = regionDestinationForSale(sale);
  const countyPath = `/og/${urlSegment(destination.county)}.jpg`;
  if (publicFileExists(countyPath)) return absolutePublicUrl(countyPath);

  return absolutePublicUrl(defaultOgPath);
}

export function saleCanonicalUrl(sale: Pick<Sale, "slug" | "city" | "state">) {
  return saleUrl(sale);
}
