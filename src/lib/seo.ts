import type { Metadata } from "next";
import { existsSync } from "fs";
import path from "path";
import type { Sale } from "./types";
import { formatSaleHours, fullAddress, salePath } from "./format";
import { saleOgImageUrl } from "./og";

export const siteName = "Localized.life";
export const productName = "SaleTrail";
export const defaultTitle = "Localized.life | SaleTrail garage sale directory";
export const defaultDescription =
  "Find local garage sales, create clean listings, share flyers with QR codes, and save sales to a simple route with SaleTrail by Localized.life.";

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life").replace(/\/$/, "");
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

function publicFileExists(publicPath: string) {
  if (publicPath.startsWith("http://") || publicPath.startsWith("https://")) return true;
  return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}

export function cleanDescription(text: string, maxLength = 155) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "")}…`;
}

export function pageMetadata({
  title,
  description,
  path,
  image,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
}): Metadata {
  const url = absoluteUrl(path);
  const safeImage = image && publicFileExists(image) ? image : null;
  const images = safeImage
    ? [
        {
          url: absoluteUrl(safeImage),
          width: 1200,
          height: 630,
          alt: title,
        },
      ]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url,
      siteName,
      images,
      type: "website",
    },
    twitter: {
      card: safeImage ? "summary_large_image" : "summary",
      title,
      description,
      images: safeImage ? [absoluteUrl(safeImage)] : undefined,
    },
  };
}

function isHiddenAddress(address: string) {
  const normalized = address.toLowerCase();
  return normalized.includes("hidden") || normalized.includes("available") || normalized.includes("unknown");
}

export function saleMetadata(sale: Sale): Metadata {
  const titleLocation = sale.title.toLowerCase().includes(sale.city.toLowerCase())
    ? `${sale.title}, ${sale.state}`
    : `${sale.title} in ${sale.city}, ${sale.state}`;
  const title = `${titleLocation} | SaleTrail`;
  const description = cleanDescription(
    `${titleLocation}. ${formatSaleHours(sale).replace(/\n/g, " ")} ${fullAddress(sale)}. ${
      sale.categories?.length ? `Items: ${sale.categories.join(", ")}.` : ""
    }`,
    170,
  );

  return pageMetadata({
    title,
    description,
    path: salePath(sale),
    image: saleOgImageUrl(sale),
  });
}

export function saleStructuredData(sale: Sale) {
  const streetAddress = isHiddenAddress(sale.address_line) ? undefined : sale.address_line;

  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: sale.title,
    description: cleanDescription(sale.description || `${sale.title} in ${sale.city}, ${sale.state}.`, 300),
    startDate: sale.starts_at,
    endDate: sale.ends_at,
    eventStatus: sale.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(salePath(sale)),
    image: saleOgImageUrl(sale) || undefined,
    location: {
      "@type": "Place",
      name: `${sale.city}, ${sale.state}`,
      address: {
        "@type": "PostalAddress",
        streetAddress,
        addressLocality: sale.city,
        addressRegion: sale.state,
        postalCode: sale.zip,
        addressCountry: "US",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "SaleTrail by Localized.life",
      url: absoluteUrl("/saletrail"),
    },
  };
}
