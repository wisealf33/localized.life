import { fullAddress } from "./format";
import type { Sale } from "./types";

type AddressInput = Pick<Sale, "address_line" | "city" | "state" | "zip">;

type GeocodeResult = {
  latitude: number;
  longitude: number;
  precision: "address" | "area";
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

const nominatimUrl = "https://nominatim.openstreetmap.org/search";

async function lookup(query: string): Promise<Omit<GeocodeResult, "precision"> | null> {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us",
  });

  try {
    const response = await fetch(`${nominatimUrl}?${params.toString()}`, {
      headers: {
        "User-Agent": `SaleTrail by Localized.life (${process.env.SALETRAIL_CONTACT_EMAIL || "claims@localized.life"})`,
        Referer: process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life",
      },
    });

    if (!response.ok) return null;

    const results = (await response.json()) as NominatimResult[];
    const first = results[0];
    if (!first?.lat || !first.lon) return null;

    const latitude = Number(first.lat);
    const longitude = Number(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude };
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: AddressInput): Promise<GeocodeResult | null> {
  const exact = await lookup(fullAddress(address));
  if (exact) return { ...exact, precision: "address" };

  const area = await lookup(`${address.city}, ${address.state} ${address.zip}`);
  if (area) return { ...area, precision: "area" };

  const city = await lookup(`${address.city}, ${address.state}`);
  if (city) return { ...city, precision: "area" };

  return null;
}
