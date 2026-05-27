import Link from "next/link";
import type { Metadata } from "next";
import { ConfigNotice } from "@/components/ConfigNotice";
import { SaveSaleButton } from "@/components/SaveSaleButton";
import { SiteHeader } from "@/components/SiteHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { UseLocationButton } from "@/components/UseLocationButton";
import { categoryOptions, fullAddress, mapSearchUrl, salePath, splitSaleSchedule } from "@/lib/format";
import { geocodeSearch } from "@/lib/geocode";
import { pageMetadata } from "@/lib/seo";
import { salePreviewImage } from "@/lib/share";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const publicSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";

type Props = {
  searchParams: Promise<{
    q?: string;
    date?: string;
    range?: string;
    category?: string;
    page?: string;
    perPage?: string;
    radius?: string;
    lat?: string;
    lng?: string;
    near?: string;
  }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Find garage sales near you | SaleTrail",
  description:
    "Search upcoming garage sales, yard sales, estate sales, and community-added listings. Save sales to a route and open the route in Google Maps.",
  path: "/saletrail",
  image: "/og/default-saletrail.jpg",
});

const pageSizes = [10, 20, 50];
const radiusOptions = [10, 20, 30, 50];
const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "next3", label: "Next 3 days" },
  { value: "week", label: "Next week" },
  { value: "weekend", label: "Weekend" },
];
const eventOnlyCategories = ["Route sale", "Flea market", "Swap meet", "Farmers market", "Local market", "Vintage market"];

function numberParam(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function pageSizeParam(value: string | undefined) {
  const parsed = numberParam(value, 10);
  return pageSizes.includes(parsed) ? parsed : 10;
}

function radiusParam(value: string | undefined) {
  const parsed = numberParam(value, 10);
  return radiusOptions.includes(parsed) ? parsed : 10;
}

function zipParam(value: string | undefined) {
  const trimmed = String(value || "").trim();
  return /^\d{5}$/.test(trimmed) ? trimmed : "";
}

function coordinateParam(value: string | undefined, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function directoryUrl(params: {
  q?: string;
  date?: string;
  range?: string;
  category?: string;
  radius?: number;
  lat?: string;
  lng?: string;
  near?: string;
  page?: number;
  perPage?: number;
}) {
  const next = new URLSearchParams();
  if (params.q) next.set("q", params.q);
  if (params.date) next.set("date", params.date);
  if (params.range) next.set("range", params.range);
  if (params.category) next.set("category", params.category);
  if (params.radius && params.radius !== 10) next.set("radius", String(params.radius));
  if (params.lat && params.lng) {
    next.set("lat", params.lat);
    next.set("lng", params.lng);
  }
  if (params.near) next.set("near", params.near);
  if (params.perPage && params.perPage !== 10) next.set("perPage", String(params.perPage));
  if (params.page && params.page > 1) next.set("page", String(params.page));
  const query = next.toString();
  return query ? `/saletrail?${query}` : "/saletrail";
}

function paginationItems(currentPage: number, totalPages: number) {
  const visible = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter((page) => page >= 1 && page <= totalPages));
  const pages = Array.from(visible).sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];

  pages.forEach((page, index) => {
    const previous = pages[index - 1];
    if (previous && page - previous > 1) items.push("ellipsis");
    items.push(page);
  });

  return items;
}

function milesBetween(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const earthRadiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  return earthRadiusMiles * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function compareSalesByDate(a: Sale, b: Sale) {
  const startCompare = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  if (startCompare !== 0) return startCompare;

  const endCompare = new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
  if (endCompare !== 0) return endCompare;

  return visibilityRank(a) - visibilityRank(b);
}

function categoryParam(value: string | undefined) {
  return value && categoryOptions.includes(value) ? value : "";
}

function rangeParam(value: string | undefined) {
  return rangeOptions.some((option) => option.value === value) ? value : "";
}

function chicagoDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function chicagoDayOfWeek() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
  }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

function rangeDates(range: string) {
  if (range === "today") return { from: chicagoDate(), to: chicagoDate() };
  if (range === "next3") return { from: chicagoDate(), to: chicagoDate(3) };
  if (range === "week") return { from: chicagoDate(), to: chicagoDate(7) };
  if (range === "weekend") {
    const day = chicagoDayOfWeek();
    const daysToSaturday = day >= 0 ? (6 - day + 7) % 7 : 0;
    return { from: chicagoDate(daysToSaturday), to: chicagoDate(daysToSaturday + 1) };
  }
  return null;
}

async function getSales(
  q?: string,
  date?: string,
  range?: string,
  category?: string,
  page = 1,
  perPage = 10,
  radius = 10,
  userLocation?: { latitude: number; longitude: number } | null,
) {
  if (!isSupabaseConfigured) return { sales: [], total: 0 };

  const supabase = getSupabaseAdmin();
  const zip = zipParam(q);
  const isRadiusSearch = Boolean(zip || userLocation);
  const from = isRadiusSearch ? 0 : (page - 1) * perPage;
  const to = isRadiusSearch ? 999 : from + perPage - 1;
  let query = supabase
    .from("sales")
    .select(publicSaleColumns, { count: "exact" })
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .order("ends_at", { ascending: true })
    .order("source_type", { ascending: false })
    .order("claim_status", { ascending: true })
    .range(from, to);

  for (const eventCategory of eventOnlyCategories) {
    query = query.not("categories", "cs", `{"${eventCategory}"}`);
  }

  if (q && !isRadiusSearch) {
    query = query.or(`city.ilike.%${q}%,state.ilike.%${q}%,zip.ilike.%${q}%,title.ilike.%${q}%`);
  }

  const selectedRange = range ? rangeDates(range) : null;
  if (date) {
    query = query.lte("starts_at", `${date}T23:59:59`).gte("ends_at", `${date}T00:00:00`);
  } else if (selectedRange) {
    query = query.lte("starts_at", `${selectedRange.to}T23:59:59`).gte("ends_at", `${selectedRange.from}T00:00:00`);
  }

  if (category) {
    query = query.contains("categories", [category]);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  if (isRadiusSearch) {
    const center = userLocation || (zip ? await geocodeSearch(`${zip}, USA`) : null);
    const allSales = ((data as Sale[]) || [])
      .map((sale) => {
        const hasCoordinates =
          typeof sale.latitude === "number" &&
          typeof sale.longitude === "number" &&
          Number.isFinite(sale.latitude) &&
          Number.isFinite(sale.longitude);
        const distance =
          hasCoordinates && center
            ? milesBetween(center, {
              latitude: sale.latitude || 0,
              longitude: sale.longitude || 0,
            })
            : sale.zip === zip
              ? 0
              : null;
        return { sale, distance };
      })
      .filter(({ distance }) => distance !== null && (!center || distance <= radius))
      .sort((a, b) => {
        const dateCompare = compareSalesByDate(a.sale, b.sale);
        if (dateCompare !== 0) return dateCompare;
        return (a.distance || 0) - (b.distance || 0);
      })
      .map(({ sale }) => sale);
    return {
      sales: allSales.slice((page - 1) * perPage, page * perPage),
      total: allSales.length,
    };
  }

  return {
    sales: ((data as Sale[]) || []).sort(compareSalesByDate),
    total: count || 0,
  };
}

function visibilityRank(sale: Pick<Sale, "source_type" | "claim_status">) {
  if (sale.source_type === "seller_created") return 0;
  if (sale.claim_status === "claimed") return 1;
  if (sale.claim_status === "claim_pending") return 2;
  return 3;
}

function canClaim(sale: Pick<Sale, "source_type" | "claim_status">) {
  return sale.source_type === "community_added" && sale.claim_status !== "claimed";
}

export default async function SaleTrailHome({ searchParams }: Props) {
  const params = await searchParams;
  const perPage = pageSizeParam(params.perPage);
  const radius = radiusParam(params.radius);
  const currentPage = numberParam(params.page, 1);
  const category = categoryParam(params.category);
  const range = rangeParam(params.range);
  const zip = zipParam(params.q);
  const latitude = coordinateParam(params.lat, -90, 90);
  const longitude = coordinateParam(params.lng, -180, 180);
  const isLocationSearch = params.near === "1" && latitude !== null && longitude !== null;
  const userLocation = isLocationSearch ? { latitude, longitude } : null;
  const hasUserLocation = Boolean(userLocation);
  const { sales, total } = await getSales(
    params.q,
    params.date,
    range,
    category,
    currentPage,
    perPage,
    radius,
    userLocation,
  );
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(currentPage, totalPages);
  const resultStart = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const resultEnd = Math.min(safePage * perPage, total);
  const pages = paginationItems(safePage, totalPages);
  return (
    <main className="page">
      <SiteHeader active="find" />
      <ConfigNotice />
      <section className="hero">
        <p className="eyebrow">SaleTrail by Localized.life</p>
        <h1>Find garage sales and build a simple route.</h1>
        <p>
          A clean directory for local garage sales, including seller-created listings and clearly labeled
          community-added listings.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/saletrail/map">
            View map
          </Link>
          <Link className="button" href="/saletrail/route">
            My route
          </Link>
        </div>
      </section>

      <section className="panel">
        <form className="search">
          <label>
            City, state, ZIP, or keyword
            <input name="q" defaultValue={params.q || ""} placeholder="Your city, ZIP code, or location" />
          </label>
          <label>
            Distance
            <select name="radius" defaultValue={radius}>
              {radiusOptions.map((option) => (
                <option value={option} key={option}>
                  {option} miles
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input name="date" type="date" defaultValue={params.date || ""} />
          </label>
          <label>
            Sale type
            <select name="category" defaultValue={category}>
              <option value="">Any type</option>
              {categoryOptions.map((option) => (
                <option value={option} key={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <input name="perPage" type="hidden" value={perPage} />
          <button className="button primary" type="submit">
            Search
          </button>
          <div className="quick-filters search-filter-row" aria-label="Location and quick date filters">
            <UseLocationButton initialLat={params.lat || ""} initialLng={params.lng || ""} initialNear={params.near || ""} />
            {rangeOptions.map((option) => (
              <Link
                className={range === option.value ? "filter-chip active" : "filter-chip"}
                href={directoryUrl({
                  q: params.q,
                  range: option.value,
                  category,
                  radius,
                  lat: params.lat,
                  lng: params.lng,
                  near: params.near,
                  perPage,
                })}
                key={option.value}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </form>
      </section>

      <section className="directory-controls">
        <p className="muted">
          {total === 0
            ? "No listings to show."
            : `Showing ${resultStart}-${resultEnd} of ${total} listing${total === 1 ? "" : "s"}${
                hasUserLocation
                  ? ` within ${radius} miles of your location`
                  : zip
                    ? ` within ${radius} miles of ${zip}`
                    : ""
              }.`}
        </p>
        <form className="per-page-form">
          {params.q ? <input name="q" type="hidden" value={params.q} /> : null}
          {params.date ? <input name="date" type="hidden" value={params.date} /> : null}
          {range ? <input name="range" type="hidden" value={range} /> : null}
          {category ? <input name="category" type="hidden" value={category} /> : null}
          {zip || hasUserLocation ? <input name="radius" type="hidden" value={radius} /> : null}
          {params.near ? <input name="near" type="hidden" value={params.near} /> : null}
          {params.lat && params.lng ? (
            <>
              <input name="lat" type="hidden" value={params.lat} />
              <input name="lng" type="hidden" value={params.lng} />
            </>
          ) : null}
          <label>
            Listings per page
            <select name="perPage" defaultValue={perPage}>
              {pageSizes.map((size) => (
                <option value={size} key={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="submit">
            Apply
          </button>
        </form>
      </section>

      <section className="list">
        {sales.length === 0 ? (
          <div className="empty">
            <h2>No active listings found</h2>
            <p>Try another city or add the first sale for your area.</p>
          </div>
        ) : (
          sales.map((sale) => {
            const image = salePreviewImage(sale);
            const schedule = splitSaleSchedule(sale);

            return (
              <article className="card sale-card" key={sale.id}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="sale-card-image" src={image.src} alt={`${sale.title} preview`} />
                ) : null}
                <div className="card-top">
                  <StatusBadge sale={sale} />
                  <span className="muted">
                    {sale.city}, {sale.state}
                  </span>
                </div>
                <h2>
                  <Link href={salePath(sale)}>{sale.title}</Link>
                </h2>
                <p>
                  <a className="text-link sale-card-address" href={mapSearchUrl(sale)} target="_blank" rel="noopener noreferrer">
                    {fullAddress(sale)}
                  </a>
                </p>
                <div className="sale-card-schedule">
                  {schedule.dates.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  {schedule.note ? <small>{schedule.note}</small> : null}
                </div>
                <div className="sale-card-footer">
                  {sale.categories?.length ? <p className="tags">{sale.categories.join(" · ")}</p> : null}
                  <div className="card-actions">
                    <Link className="button primary" href={salePath(sale)}>
                      View listing
                    </Link>
                    <SaveSaleButton
                      sale={{
                        slug: sale.slug,
                        title: sale.title,
                        address: fullAddress(sale),
                        city: sale.city,
                        state: sale.state,
                        startsAt: sale.starts_at,
                        href: salePath(sale),
                        latitude: sale.latitude,
                        longitude: sale.longitude,
                        locationPrecision: sale.location_precision,
                      }}
                      variant="secondary"
                    />
                    {canClaim(sale) ? (
                      <Link className="quiet-link" href={`/saletrail/claim/${sale.slug}`}>
                        Claim listing
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>

      {totalPages > 1 ? (
        <nav className="pagination" aria-label="Listings pages">
          {safePage > 1 ? (
            <Link
              className="button"
              href={directoryUrl({
                q: params.q,
                date: params.date,
                range,
                category,
                radius,
                lat: params.lat,
                lng: params.lng,
                near: params.near,
                perPage,
                page: safePage - 1,
              })}
            >
              Previous
            </Link>
          ) : (
            <span className="button disabled">Previous</span>
          )}
          <div className="pagination-pages" aria-label={`Page ${safePage} of ${totalPages}`}>
            {pages.map((pageNumber, index) =>
              pageNumber === "ellipsis" ? (
                <span className="page-ellipsis" aria-hidden="true" key={`ellipsis-${index}`}>
                  ...
                </span>
              ) : pageNumber === safePage ? (
                <span className="page-link active" aria-current="page" key={pageNumber}>
                  {pageNumber}
                </span>
              ) : (
                <Link
                  className="page-link"
                  href={directoryUrl({
                    q: params.q,
                    date: params.date,
                    range,
                    category,
                    radius,
                    lat: params.lat,
                    lng: params.lng,
                    near: params.near,
                    perPage,
                    page: pageNumber,
                  })}
                  key={pageNumber}
                >
                  {pageNumber}
                </Link>
              ),
            )}
          </div>
          {safePage < totalPages ? (
            <Link
              className="button"
              href={directoryUrl({
                q: params.q,
                date: params.date,
                range,
                category,
                radius,
                lat: params.lat,
                lng: params.lng,
                near: params.near,
                perPage,
                page: safePage + 1,
              })}
            >
              Next
            </Link>
          ) : (
            <span className="button disabled">Next</span>
          )}
        </nav>
      ) : null}

      <section className="feedback-panel">
        <div>
          <p className="eyebrow">New and growing</p>
          <h2>Help shape SaleTrail</h2>
          <p>
            This is a new fast-growing website, and features are being added daily. Request a feature or report a bug so
            we know what to improve next.
          </p>
        </div>
        <Link className="button primary" href="/saletrail/feedback">
          Request a feature or report a bug
        </Link>
      </section>
    </main>
  );
}
