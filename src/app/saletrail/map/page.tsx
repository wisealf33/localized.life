import Link from "next/link";
import type { Metadata } from "next";
import { SaleMap, type MappedSale } from "@/components/SaleMap";
import { SiteHeader } from "@/components/SiteHeader";
import { rangeDates, rangeOptions, rangeParam } from "@/lib/dateFilters";
import { formatSaleHours, fullAddress, saleDisplayTitle, salePath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Garage sale map | SaleTrail",
  description:
    "View upcoming garage sales and estate sales on a simple map, then open listings to save stops to your SaleTrail route.",
  path: "/saletrail/map",
  image: "/og/default-saletrail.jpg",
});

const mapSaleColumns =
  "id, slug, title, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, status, source_type, claim_status, visibility_status, created_at, updated_at";
const mapSaleColumnsWithoutPrecision =
  "id, slug, title, address_line, city, state, zip, latitude, longitude, starts_at, ends_at, sale_schedule, status, source_type, claim_status, visibility_status, created_at, updated_at";
const mapSaleColumnsWithoutCoordinates =
  "id, slug, title, address_line, city, state, zip, starts_at, ends_at, sale_schedule, status, source_type, claim_status, visibility_status, created_at, updated_at";

type Props = {
  searchParams: Promise<{
    date?: string;
    range?: string;
  }>;
};

function mapUrl(params: { date?: string; range?: string }) {
  const next = new URLSearchParams();
  if (params.date) next.set("date", params.date);
  if (params.range) next.set("range", params.range);
  const query = next.toString();
  return query ? `/saletrail/map?${query}` : "/saletrail/map";
}

function applyDateFilter<T extends { lte: (column: string, value: string) => T; gte: (column: string, value: string) => T }>(
  query: T,
  date?: string,
  range?: string,
) {
  const selectedRange = range ? rangeDates(range) : null;
  if (date) return query.lte("starts_at", `${date}T23:59:59`).gte("ends_at", `${date}T00:00:00`);
  if (selectedRange) return query.lte("starts_at", `${selectedRange.to}T23:59:59`).gte("ends_at", `${selectedRange.from}T00:00:00`);
  return query;
}

async function getMapSales(date?: string, range?: string) {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await applyDateFilter(
    supabase
    .from("sales")
    .select(mapSaleColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
      .limit(200),
    date,
    range,
  );

  if (error?.message.includes("location_precision")) {
    const fallback = await applyDateFilter(
      supabase
      .from("sales")
      .select(mapSaleColumnsWithoutPrecision)
      .eq("visibility_status", "public")
      .eq("status", "active")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
        .limit(200),
      date,
      range,
    );
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data || []) as Sale[]).map((sale) => ({ ...sale, location_precision: null }));
  }

  if (error?.message.includes("latitude") || error?.message.includes("longitude")) {
    const fallback = await applyDateFilter(
      supabase
      .from("sales")
      .select(mapSaleColumnsWithoutCoordinates)
      .eq("visibility_status", "public")
      .eq("status", "active")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
        .limit(200),
      date,
      range,
    );
    if (fallback.error) throw new Error(fallback.error.message);
    return ((fallback.data || []) as Sale[]).map((sale) => ({
      ...sale,
      latitude: null,
      longitude: null,
      location_precision: null,
    }));
  }

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

export default async function SaleTrailMapPage({ searchParams }: Props) {
  const params = await searchParams;
  const range = rangeParam(params.range);
  const sales = await getMapSales(params.date, range);
  const mappedSales = sales.map(toMappedSale);
  const mappedCount = mappedSales.filter((sale) => sale.latitude !== null && sale.longitude !== null).length;
  const approximateCount = mappedSales.filter((sale) => sale.locationPrecision === "area").length;

  return (
    <main className="page">
      <SiteHeader active="map" />
      <section className="hero compact-hero">
        <p className="eyebrow">SaleTrail map</p>
        <h1>Find garage sales on a map.</h1>
        <p>
          Browse mapped SaleTrail listings, then open a listing to save it to your route. This uses OpenStreetMap tiles,
          not a paid Google Maps embed.
        </p>
        <div className="toolbar">
          <Link className="button" href="/saletrail">
            View list
          </Link>
          <Link className="button primary" href="/saletrail/route">
            My route
          </Link>
        </div>
        <div className="quick-filters map-filter-row" aria-label="Map date filters">
          {rangeOptions.map((option) => (
            <Link
              className={range === option.value ? "filter-chip active" : "filter-chip"}
              href={mapUrl({ range: option.value })}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
          <Link className={!range && !params.date ? "filter-chip active" : "filter-chip"} href="/saletrail/map">
            All dates
          </Link>
        </div>
      </section>

      <section className="panel stack">
        <div className="card-top">
          <h2>{mappedCount} mapped sales</h2>
          <p className="muted">
            {sales.length - mappedCount} listings still need coordinates. {approximateCount} pins are approximate area
            pins.
          </p>
        </div>
        <SaleMap sales={mappedSales} />
      </section>

      {sales.length ? (
        <section className="list">
          {sales.slice(0, 20).map((sale) => (
            <article className="card compact" key={sale.id}>
              <div>
                <h2>
                  <Link href={salePath(sale)}>{saleDisplayTitle(sale)}</Link>
                </h2>
                <p className="muted">
                  {sale.city}, {sale.state} · <span className="whitespace">{formatSaleHours(sale)}</span>
                </p>
              </div>
              <span className={sale.latitude !== null && sale.longitude !== null ? "badge good" : "badge plain"}>
                {sale.latitude !== null && sale.longitude !== null
                  ? sale.location_precision === "area"
                    ? "Approximate area"
                    : "Mapped"
                  : "Needs coordinates"}
              </span>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
