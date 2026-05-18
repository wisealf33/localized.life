import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { eventPath, eventTypeLabel, formatEventHours } from "@/lib/events";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent } from "@/lib/types";

const eventColumns =
  "id, slug, title, event_type, description, address_line, city, state, zip, county, latitude, longitude, starts_at, ends_at, event_schedule, source_url, source_platform, source_notes, status, visibility_status, created_at, updated_at";

export const metadata: Metadata = pageMetadata({
  title: "Local garage sale events | SaleTrail",
  description: "Find city-wide garage sales, community sales, flea markets, swap meets, farmers markets, and local markets on SaleTrail.",
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

export default async function EventsPage() {
  const events = await getEvents();

  return (
    <main className="page">
      <SiteHeader active="events" />
      <section className="hero">
        <p className="eyebrow">SaleTrail events</p>
        <h1>City-wide sales and local market events.</h1>
        <p>
          A simple calendar for city-wide garage sales, community sales, flea markets, swap meets, farmers markets, and
          local markets.
        </p>
      </section>

      <section className="list">
        {events.length === 0 ? (
          <div className="empty">
            <h2>No upcoming events yet</h2>
            <p>Events will appear here as they are added by SaleTrail admin.</p>
          </div>
        ) : (
          events.map((event) => (
            <article className="card event-card" key={event.id}>
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
          ))
        )}
      </section>
    </main>
  );
}
