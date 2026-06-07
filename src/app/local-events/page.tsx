import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Local Events | Localized.life",
  description:
    "Find farmers markets, craft fairs, pop-ups, workshops, festivals, plant swaps, and other local happenings.",
  path: "/local-events",
});

const eventTypes = [
  "Farmers markets",
  "Craft fairs",
  "Vendor pop-ups",
  "Workshops",
  "Festivals",
  "Plant swaps",
  "Community days",
  "Church bazaars",
  "Seasonal markets",
];

export default function LocalEventsPage() {
  return (
    <main className="page">
      <SiteHeader active="local-events" product="Project hub" />
      <section className="hero">
        <p className="eyebrow">Things happening</p>
        <h1>Local Events</h1>
        <p className="lede">
          Find farmers markets, craft fairs, vendor pop-ups, workshops, festivals, plant swaps, and community
          gatherings.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Scheduled happenings nearby.</h2>
          <p className="muted">
            Local Events is for things people attend at a time and place. Vendor markets and craft fairs belong here,
            while the individual vendors can also have Local Market profiles.
          </p>
          <div className="tag-row">
            {eventTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>SaleTrail events are live first.</h2>
          <p className="muted">
            Community-wide sales and sale-related events currently live inside SaleTrail because they connect directly
            to routes and individual sale stops.
          </p>
          <Link className="button primary" href="/saletrail/events">
            View SaleTrail events
          </Link>
        </article>
      </section>
    </main>
  );
}
