import Link from "next/link";
import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { eventPath, eventPreviewImagePath, eventTypeLabel, eventTypeOptions } from "@/lib/events";
import { optimizedImageUrl } from "@/lib/images";
import { pageMetadata } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent, LocalEventType } from "@/lib/types";

const eventColumns =
  "id, slug, title, event_type, description, address_line, city, state, zip, county, latitude, longitude, starts_at, ends_at, event_schedule, source_url, source_platform, source_notes, status, visibility_status, created_at, updated_at";

type Props = {
  searchParams: Promise<{
    type?: string;
    submitted?: string;
    email?: string;
    manage?: string;
    error?: string;
  }>;
};

const eventFilterOptions = eventTypeOptions.filter((option) => option.value !== "city_wide_garage_sale");

export const metadata: Metadata = pageMetadata({
  title: "Local Events | Localized.life",
  description: "Find farmers markets, craft fairs, pop-ups, workshops, festivals, plant swaps, and other local happenings.",
  path: "/local-events",
  image: "/og/default-saletrail.jpg",
});

function eventTypeParam(value: string | undefined): LocalEventType | undefined {
  return eventFilterOptions.some((option) => option.value === value) ? (value as LocalEventType) : undefined;
}

function eventsUrl(type?: LocalEventType) {
  return type ? `/local-events?type=${type}` : "/local-events";
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

function formatEventCardDate(event: Pick<LocalEvent, "starts_at" | "ends_at">) {
  const startsAt = new Date(event.starts_at);
  const endsAt = new Date(event.ends_at);
  const dateFormatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  if (startsAt.toDateString() === endsAt.toDateString()) {
    return `${dateFormatter.format(startsAt)} · ${timeFormatter.format(startsAt)}-${timeFormatter.format(endsAt)}`;
  }

  return `${dateFormatter.format(startsAt)}-${dateFormatter.format(endsAt)}`;
}

function previewText(value: string | null | undefined, maxLength = 180) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}...` : text;
}

export default async function LocalEventsPage({ searchParams }: Props) {
  const params = await searchParams;
  const eventType = eventTypeParam(params.type);
  const events = await getEvents(eventType);

  return (
    <main className="page">
      <SiteHeader active="local-events" product="Project hub" />
      <section className="hero events-hero">
        <p className="eyebrow">Things happening</p>
        <h1>Local Events</h1>
        <p className="lede">
          Find farmers markets, craft fairs, vendor pop-ups, workshops, festivals, plant swaps, and community gatherings.
          Sale-focused community-wides, estate sales, and garage sales stay in SaleTrail so shoppers can route them.
        </p>
      </section>

      <LocalSubmissionForm
        area="event"
        eyebrow="Submit an event"
        title="Add a Local Event"
        description="Use this for farmers markets, craft fairs, pop-ups, workshops, festivals, plant swaps, community days, classes, or other local happenings. Garage sales and estate sales should still go through SaleTrail."
        categoryLabel="Event type"
        categoryPlaceholder="Farmers market, craft fair, workshop, festival..."
        titleLabel="Event name"
        titlePlaceholder="Saturday farmers market, holiday craft fair..."
        descriptionLabel="Tell people about the event"
        descriptionPlaceholder="Include the date, time, location, organizer, what people can expect, and any useful link."
        returnPath="/local-events"
        submitted={Boolean(params.submitted)}
        emailStatus={params.email}
        manageToken={params.manage}
        errorMessage={params.error}
        ctaLabel="Submit a local event"
      />

      <section className="panel event-filter-panel">
        <div>
          <h2>Find Events By Type</h2>
          <p className="muted">
            Local Events is for scheduled happenings people attend. Vendor markets, craft fairs, workshops, festivals,
            and plant swaps belong here.
          </p>
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
            <p>Try another event type, or open SaleTrail to see garage sales, community-wides, and estate sales.</p>
            <div className="toolbar">
              <Link className="button" href="/local-events">
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
            const descriptionPreview = previewText(event.description);
            return (
              <article className="card event-card" key={event.id}>
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    className="sale-card-image"
                    src={optimizedImageUrl(image, { width: 900, crop: "limit" })}
                    alt={`${event.title} preview`}
                  />
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
                <div className="event-card-preview">
                  <p className="event-card-date">{formatEventCardDate(event)}</p>
                  {descriptionPreview ? <p className="event-card-description">{descriptionPreview}</p> : null}
                </div>
                <div className="event-card-footer">
                  <Link className="text-link" href={eventPath(event)}>
                    See more
                  </Link>
                  <Link className="button primary" href={eventPath(event)}>
                    View full event
                  </Link>
                </div>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}
