import { fullAddress } from "./format";
import type { Sale } from "./types";

type AddressInput = Pick<Sale, "address_line" | "city" | "state" | "zip">;

type GeocodeResult = {
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

const nominatimUrl = "https://nominatim.openstreetmap.org/search";

export async function geocodeAddress(address: AddressInput): Promise<GeocodeResult | null> {
  const query = fullAddress(address);
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

