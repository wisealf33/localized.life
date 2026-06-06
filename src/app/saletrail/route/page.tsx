import type { Metadata } from "next";
import type { MappedSale } from "@/components/SaleMap";
import { RoutePlanner } from "@/components/RoutePlanner";
import { SiteHeader } from "@/components/SiteHeader";
import { fullAddress, saleDisplayTitle, salePath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

const routeMapSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

export const metadata: Metadata = pageMetadata({
  title: "Plan a garage sale route | SaleTrail",
  description:
    "Save garage sale listings in your browser, reorder your stops, and open your selected route in Google Maps.",
  path: "/saletrail/route",
  image: "/og/default-saletrail.jpg",
});

async function getRouteMapSales() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select(routeMapSaleColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("starts_at", { ascending: true })
    .limit(250);

  if (error) throw new Error(error.message);
  return (data || []) as Sale[];
}

function toMappedSale(sale: Sale): MappedSale {
  return {
    slug: sale.slug,
    title: saleDisplayTitle(sale),
    address: fullAddress(sale),
    city: sale.city,
    state: sale.state,
    startsAt: sale.starts_at,
    href: salePath(sale),
    latitude: sale.latitude,
    longitude: sale.longitude,
    locationPrecision: sale.location_precision,
  };
}

export default async function RoutePage() {
  const allSales = (await getRouteMapSales()).map(toMappedSale);

  return (
    <main className="page narrow">
      <SiteHeader active="route" />
      <p className="eyebrow">SaleTrail by Localized.life</p>
      <h1>Your garage sale route</h1>
      <p className="lede">Saved sales stay in this browser. Open your selected stops in Google Maps when ready.</p>
      <RoutePlanner allSales={allSales} />
    </main>
  );
}
