import { existsSync } from "fs";
import path from "path";
import type { Sale } from "./types";
import { saleUrl } from "./format";
import { optimizedImageUrl } from "./images";
import { saleFallbackImagePath } from "./share";

type OgSale = Pick<Sale, "slug" | "title" | "city" | "state" | "photo_urls" | "categories">;

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
  if (uploadedPhoto) return optimizedImageUrl(uploadedPhoto, { width: 1200, height: 630, crop: "fill" });

  const fallback = saleFallbackImagePath(sale);
  if (fallback && publicFileExists(fallback)) return absolutePublicUrl(fallback);

  return null;
}

export function saleCanonicalUrl(sale: Pick<Sale, "slug" | "city" | "state">) {
  return saleUrl(sale);
}
