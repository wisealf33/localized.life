import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { EventRouteSelector } from "@/components/EventRouteSelector";
import { SaleMap } from "@/components/SaleMap";
import { SiteHeader } from "@/components/SiteHeader";
import { addHouseholdToCommunityWide } from "@/lib/actions";
import { eventPath, eventTypeLabel, formatEventHours } from "@/lib/events";
import { fullAddress, saleDisplayTitle, salePath, splitSaleSchedule } from "@/lib/format";
import { absoluteUrl, cleanDescription, pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent, Sale } from "@/lib/types";

const eventColumns =
  "id, slug, title, event_type, description, address_line, city, state, zip, county, latitude, longitude, starts_at, ends_at, event_schedule, source_url, source_platform, source_notes, status, visibility_status, created_at, updated_at";
const saleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, photo_urls, categories, status, source_type, claim_status, visibility_status, claimed_at, created_at, updated_at, event_id";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getEvent(slug: string) {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("local_events")
    .select(eventColumns)
    .eq("slug", slug)
    .eq("visibility_status", "public")
    .single();
  if (error || !data) return null;
  return data as LocalEvent;
}

async function getEventSales(eventId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select(saleColumns)
    .eq("event_id", eventId)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data || []) as Sale[];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) return pageMetadata({ title: "Local Event", description: "Localized.life local event.", path: "/local-events" });
  return pageMetadata({
    title: `${event.title} | Local Events`,
    description: cleanDescription(`${event.title} in ${event.city}, ${event.state}. ${formatEventHours(event).replace(/\n/g, " ")}`),
    path: eventPath(event),
    image: event.event_type === "city_wide_garage_sale" ? "/og/city-wide-sale.jpg" : "/og/default-saletrail.jpg",
  });
}

export default async function EventDetailPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEvent(slug);
  if (!event) notFound();
  const sales = await getEventSales(event.id);
  const mappedSales = sales.map((sale) => ({
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
  }));
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: cleanDescription(event.description || `${event.title} in ${event.city}, ${event.state}.`, 300),
    startDate: event.starts_at,
    endDate: event.ends_at,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(eventPath(event)),
    location: {
      "@type": "Place",
      name: `${event.city}, ${event.state}`,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.address_line || undefined,
        addressLocality: event.city,
        addressRegion: event.state,
        postalCode: event.zip || undefined,
        addressCountry: "US",
      },
    },
  };

  return (
    <main className="page">
      <SiteHeader active="local-events" product="Project hub" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <section className="hero event-hero">
        <p className="eyebrow">{eventTypeLabel(event.event_type)}</p>
        <h1>{event.title}</h1>
        <p className="whitespace">{formatEventHours(event)}</p>
        <p>
          {event.city}, {event.state}
          {event.county ? ` · ${event.county}` : ""}
        </p>
        {event.description ? <p>{event.description}</p> : null}
        <div className="toolbar">
          <Link className="button" href="/local-events">
            Back to events
          </Link>
          {event.source_url ? (
            <a className="button" href={event.source_url} target="_blank" rel="noopener noreferrer">
              Source page
            </a>
          ) : null}
        </div>
      </section>

      {sales.length ? (
        <section className="panel stack">
          <div>
            <p className="eyebrow">SaleTrail stops</p>
            <h2>Sales connected to this event</h2>
            <p className="muted">
              These are the sale stops currently connected to this event. Shoppers can choose which ones they want in
              their own route.
            </p>
          </div>
          <SaleMap sales={mappedSales} />
          {event.event_type === "city_wide_garage_sale" ? (
            <EventRouteSelector sales={mappedSales} />
          ) : (
            <div className="list compact-list">
              {sales.map((sale) => {
                const schedule = splitSaleSchedule(sale);
                const displayTitle = saleDisplayTitle(sale);
                return (
                  <article className="card sale-card mini-sale-card" key={sale.id}>
                    <h3>
                      <Link href={salePath(sale)}>{displayTitle}</Link>
                    </h3>
                    <p>
                      <Link className="text-link sale-card-address" href={salePath(sale)}>
                        {fullAddress(sale)}
                      </Link>
                    </p>
                    <div className="sale-card-schedule">
                      {schedule.dates.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                      {schedule.note ? <small>{schedule.note}</small> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="empty">
          <h2>No connected sale stops yet</h2>
          <p>Admin can attach household listings to this event from the admin page.</p>
        </section>
      )}

      {event.event_type === "city_wide_garage_sale" ? (
        <section className="panel event-add-stop-panel">
          <details className="event-add-stop-details">
            <summary>
              <span>
                <span className="eyebrow">Add a household</span>
                <strong>Add your address to this community-wide sale</strong>
              </span>
              <span className="summary-button">Open form</span>
            </summary>
            <div className="event-add-stop-intro">
              <p className="muted">
                If your home is participating but is not listed here yet, add it to the SaleTrail list so shoppers can
                save it to their route.
              </p>
            </div>
            <form action={addHouseholdToCommunityWide} className="event-add-stop-form">
              <input name="event_id" type="hidden" value={event.id} />
              <label>
                Street address
                <input name="address_line" placeholder={`123 Main St, ${event.city}`} required />
              </label>
              <label>
                ZIP code
                <input name="zip" defaultValue={event.zip || ""} placeholder="ZIP code" required />
              </label>
              <label className="wide-field">
                What are you selling?
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Kids clothes, tools, furniture, home goods, books..."
                />
              </label>
              <label className="wide-field">
                Hours note, if different
                <input name="schedule_note" placeholder="Example: Saturday only, 9 AM-2 PM" />
              </label>
              <button className="button primary" type="submit">
                Add my household
              </button>
            </form>
          </details>
        </section>
      ) : null}
    </main>
  );
}
