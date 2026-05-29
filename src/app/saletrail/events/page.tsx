import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { isSaleEventHub } from "@/lib/eventHubs";
import { eventPath, eventPreviewImagePath, eventTypeLabel, eventTypeOptions, formatEventHours } from "@/lib/events";
import { formatSaleHours, salePath } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent, LocalEventType, Sale } from "@/lib/types";

const eventColumns =
  "id, slug, title, event_type, description, address_line, city, state, zip, county, latitude, longitude, starts_at, ends_at, event_schedule, source_url, source_platform, source_notes, status, visibility_status, created_at, updated_at";
const eventSaleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at";
const eventLikeCategories = [
  "City-wide sale",
  "Route sale",
  "Community sale",
  "Flea market",
  "Swap meet",
  "Farmers market",
  "Local market",
  "Vintage market",
];
const eventCategoryByType: Partial<Record<LocalEventType, string>> = {
  city_wide_garage_sale: "City-wide sale",
  community_sale: "Community sale",
  flea_market: "Flea market",
  swap_meet: "Swap meet",
  farmers_market: "Farmers market",
  local_market: "Local market",
};

type Props = {
  searchParams: Promise<{
    type?: string;
  }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local events | SaleTrail",
  description: "Find local community events, city-wide sales, flea markets, swap meets, farmers markets, and local markets on SaleTrail.",
  path: "/saletrail/events",
  image: "/og/city-wide-sale.jpg",
});

function eventTypeParam(value: string | undefined): LocalEventType | undefined {
  return eventTypeOptions.some((option) => option.value === value) ? (value as LocalEventType) : undefined;
}

function eventsUrl(type?: LocalEventType) {
  return type ? `/saletrail/events?type=${type}` : "/saletrail/events";
}

async function getEvents(type?: LocalEventType) {
  if (!isSupabaseConfigured) return [];
  let query = getSupabaseAdmin()
    .from("local_events")
    .select(eventColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);

  if (type) query = query.eq("event_type", type);

  const { data, error } = await query;
  if (error) return [];
  return ((data || []) as LocalEvent[]).sort(compareByStartDate);
}

async function getEventLikeSales(type?: LocalEventType) {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabaseAdmin();
  const categories = type ? [eventCategoryByType[type]].filter(Boolean) : eventLikeCategories;
  const matches = await Promise.all(
    categories.map((category) =>
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
    .filter((sale) => isSaleEventHub(sale) && !sale.categories?.includes("Estate sale"))
    .sort(compareByStartDate);
}

function saleEventLabel(sale: Pick<Sale, "categories">) {
  return eventLikeCategories.find((category) => sale.categories?.includes(category)) || "Local event";
}

function compareByStartDate(a: Pick<Sale | LocalEvent, "starts_at" | "ends_at">, b: Pick<Sale | LocalEvent, "starts_at" | "ends_at">) {
  const startCompare = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  if (startCompare !== 0) return startCompare;
  return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const eventType = eventTypeParam(params.type);
  const events = await getEvents(eventType);
  const eventSales = await getEventLikeSales(eventType);

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

      <section className="panel event-filter-panel">
        <div>
          <h2>Find Events By Type</h2>
          <p className="muted">Filter community events here. Estate sales are kept in the sales directory so they can be routed like regular sale stops.</p>
        </div>
        <div className="quick-filters event-filter-row" aria-label="Event type filters">
          <Link className={!eventType ? "filter-chip active" : "filter-chip"} href={eventsUrl()}>
            All Events
          </Link>
          {eventTypeOptions.map((option) => (
            <Link
              className={eventType === option.value ? "filter-chip active" : "filter-chip"}
              href={eventsUrl(option.value)}
              key={option.value}
            >
              {option.label}
            </Link>
          ))}
          <Link className="filter-chip estate-filter-chip" href="/saletrail?category=Estate%20sale">
            Estate Sales
          </Link>
        </div>
      </section>

      <section className="list">
        {events.length === 0 && eventSales.length === 0 ? (
          <div className="empty">
            <h2>No Matching Events Yet</h2>
            <p>Try another event type, or open Estate Sales to see estate sale listings in the sales directory.</p>
            <div className="toolbar">
              <Link className="button" href="/saletrail/events">
                View all events
              </Link>
              <Link className="button primary" href="/saletrail?category=Estate%20sale">
                View estate sales
              </Link>
            </div>
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
