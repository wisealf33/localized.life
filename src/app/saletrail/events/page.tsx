import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { eventPath, eventPreviewImagePath, eventTypeLabel, eventTypeOptions, formatEventHours } from "@/lib/events";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent, LocalEventType } from "@/lib/types";

const eventColumns =
  "id, slug, title, event_type, description, address_line, city, state, zip, county, latitude, longitude, starts_at, ends_at, event_schedule, source_url, source_platform, source_notes, status, visibility_status, created_at, updated_at";

type Props = {
  searchParams: Promise<{
    type?: string;
  }>;
};

const eventFilterOptions = eventTypeOptions.filter((option) => option.value !== "city_wide_garage_sale");

export const metadata: Metadata = pageMetadata({
  title: "Local events | SaleTrail",
  description: "Find local community events, city-wide sales, flea markets, swap meets, farmers markets, and local markets on SaleTrail.",
  path: "/saletrail/events",
  image: "/og/city-wide-sale.jpg",
});

function eventTypeParam(value: string | undefined): LocalEventType | undefined {
  return eventFilterOptions.some((option) => option.value === value) ? (value as LocalEventType) : undefined;
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
    .neq("event_type", "city_wide_garage_sale")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);

  if (type) query = query.eq("event_type", type);

  const { data, error } = await query;
  if (error) return [];
  return ((data || []) as LocalEvent[]).sort(compareByStartDate);
}

function compareByStartDate(a: Pick<LocalEvent, "starts_at" | "ends_at">, b: Pick<LocalEvent, "starts_at" | "ends_at">) {
  const startCompare = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
  if (startCompare !== 0) return startCompare;
  return new Date(a.ends_at).getTime() - new Date(b.ends_at).getTime();
}

export default async function EventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const eventType = eventTypeParam(params.type);
  const events = await getEvents(eventType);

  return (
    <main className="page">
      <SiteHeader active="events" />
      <section className="hero events-hero">
        <p className="eyebrow">Events</p>
        <h1>Local Events.</h1>
        <p className="lede">
          A simple calendar for useful community events like flea markets, swap meets, farmers markets, local markets,
          and other nearby happenings worth finding. Sale-focused community-wides live in Find Sales.
        </p>
      </section>

      <section className="panel event-filter-panel">
        <div>
          <h2>Find Events By Type</h2>
          <p className="muted">Filter non-directory local events here. Garage sales, community-wides, and estate sales are kept in Find Sales so shoppers can route them.</p>
        </div>
        <div className="quick-filters event-filter-row" aria-label="Event type filters">
          <Link className={!eventType ? "filter-chip active" : "filter-chip"} href={eventsUrl()}>
            All Events
          </Link>
          {eventFilterOptions.map((option) => (
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
          <Link className="filter-chip estate-filter-chip" href="/saletrail?category=City-wide%20sale">
            Community-Wides
          </Link>
        </div>
      </section>

      <section className="list">
        {events.length === 0 ? (
          <div className="empty">
            <h2>No Matching Events Yet</h2>
            <p>Try another event type, or open Find Sales to see garage sales, community-wides, and estate sales.</p>
            <div className="toolbar">
              <Link className="button" href="/saletrail/events">
                View all events
              </Link>
              <Link className="button primary" href="/saletrail?category=Estate%20sale">
                View estate sales
              </Link>
              <Link className="button" href="/saletrail?category=City-wide%20sale">
                View community-wides
              </Link>
            </div>
          </div>
        ) : (
          events.map((event) => {
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
          })
        )}
      </section>
    </main>
  );
}
