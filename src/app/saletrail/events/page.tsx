import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { eventPath, eventPreviewImagePath, eventTypeLabel, formatEventHours } from "@/lib/events";
import { formatSaleHours, salePath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent, Sale } from "@/lib/types";

const eventColumns =
  "id, slug, title, event_type, description, address_line, city, state, zip, county, latitude, longitude, starts_at, ends_at, event_schedule, source_url, source_platform, source_notes, status, visibility_status, created_at, updated_at";
const eventSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";
const eventLikeCategories = [
  "City-wide sale",
  "Community sale",
  "Flea market",
  "Swap meet",
  "Farmers market",
  "Local market",
  "Vintage market",
];

export const metadata: Metadata = pageMetadata({
  title: "Local events | SaleTrail",
  description: "Find local community events, city-wide sales, flea markets, swap meets, farmers markets, and local markets on SaleTrail.",
  path: "/saletrail/events",
  image: "/og/city-wide-sale.jpg",
});

async function getEvents() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await getSupabaseAdmin()
    .from("local_events")
    .select(eventColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);
  if (error) return [];
  return (data || []) as LocalEvent[];
}

async function getEventLikeSales() {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabaseAdmin();
  const matches = await Promise.all(
    eventLikeCategories.map((category) =>
      supabase
        .from("sales")
        .select(eventSaleColumns)
        .eq("visibility_status", "public")
        .eq("status", "active")
        .gte("ends_at", new Date().toISOString())
        .contains("categories", [category])
        .order("starts_at", { ascending: true })
        .limit(50),
    ),
  );

  const byId = new Map<string, Sale>();
  for (const result of matches) {
    if (result.error) continue;
    for (const sale of (result.data || []) as Sale[]) byId.set(sale.id, sale);
  }

  return Array.from(byId.values())
    .filter((sale) => !sale.categories?.includes("Estate sale"))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

function saleEventLabel(sale: Pick<Sale, "categories">) {
  return eventLikeCategories.find((category) => sale.categories?.includes(category)) || "Local event";
}

export default async function EventsPage() {
  const events = await getEvents();
  const eventSales = events.length === 0 ? await getEventLikeSales() : [];

  return (
    <main className="page">
      <SiteHeader active="events" />
      <section className="hero events-hero">
        <p className="eyebrow">Events</p>
        <h1>Local Events.</h1>
        <p className="lede">
          A simple calendar for useful community events, starting with city-wide garage sales and expanding into flea
          markets, swap meets, farmers markets, local markets, and other nearby events worth finding.
        </p>
      </section>

      <section className="list">
        {events.length === 0 && eventSales.length === 0 ? (
          <div className="empty">
            <h2>No Upcoming Events Yet</h2>
            <p>City-wide sales, markets, and other local events will appear here as they are added.</p>
          </div>
        ) : (
          <>
            {events.map((event) => {
              const image = eventPreviewImagePath(event);
              return (
                <article className="card event-card" key={event.id}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="sale-card-image" src={image} alt={`${event.title} preview`} />
                  ) : null}
                  <div>
                    <p className="eyebrow">{eventTypeLabel(event.event_type)}</p>
                    <h2>
                      <Link href={eventPath(event)}>{event.title}</Link>
                    </h2>
                    <p className="muted">
                      {event.city}, {event.state}
                      {event.county ? ` · ${event.county}` : ""}
                    </p>
                  </div>
                  <p className="whitespace">{formatEventHours(event)}</p>
                  {event.description ? <p>{event.description}</p> : null}
                  <Link className="button primary" href={eventPath(event)}>
                    View event
                  </Link>
                </article>
              );
            })}
            {eventSales.map((sale) => {
              const image = eventPreviewImagePath(sale);
              return (
                <article className="card event-card" key={sale.id}>
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="sale-card-image" src={image} alt={`${sale.title} preview`} />
                  ) : null}
                  <div>
                    <p className="eyebrow">{saleEventLabel(sale)}</p>
                    <h2>
                      <Link href={salePath(sale)}>{sale.title}</Link>
                    </h2>
                    <p className="muted">
                      {sale.city}, {sale.state}
                    </p>
                  </div>
                  <p className="whitespace">{formatSaleHours(sale)}</p>
                  {sale.description ? <p>{sale.description}</p> : null}
                  <Link className="button primary" href={salePath(sale)}>
                    View event
                  </Link>
                </article>
              );
            })}
          </>
        )}
      </section>
    </main>
  );
}
