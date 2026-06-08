import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Localized.life | Useful local life outside noisy feeds",
  description:
    "Localized.life is a practical local operating system for finding useful real-world community: local goods, events, sales, abundance, services, and local knowledge.",
  path: "/",
  image: "/og/default-saletrail.jpg",
});

export default function Home() {
  return (
    <main className="front-shell">
      <SiteHeader active="home" product="Project hub" />

      <section className="front-hero">
        <Image
          src="/home/community-hero.png"
          alt="Neighbors gathering on a sunny neighborhood street with sale tables and fresh produce"
          fill
          priority
          sizes="100vw"
        />
        <div className="front-copy">
          <p className="front-badge">A neighborhood operating system</p>
          <h1>Useful local life, pulled out of the noise.</h1>
          <p className="lede">
            Localized.life is a practical local operating system for finding useful real-world community: local goods,
            events, sales, abundance, services, and local knowledge.
          </p>
          <div className="toolbar">
            <Link className="button primary" href="/saletrail">
              Find sales
            </Link>
            <Link className="button" href="/local-market">
              Explore Local Market
            </Link>
          </div>
          <div className="front-signal-row" aria-label="Localized.life project signals">
            <span>Local goods</span>
            <span>Events</span>
            <span>Sale routes</span>
            <span>Abundance</span>
            <span>Services</span>
          </div>
        </div>

      </section>

      <section className="front-product-band front-door-band" aria-label="Localized.life public doors">
        <div className="front-door-intro">
          <p className="front-badge">Start here</p>
          <h2>Five clear doors into local life.</h2>
          <p>
            Each area has its own purpose, but the pieces can connect later through reusable local profiles, listings,
            events, and places.
          </p>
        </div>

        <article className="front-product-card front-feature-card">
          <p className="front-badge">Local sales</p>
          <h2>SaleTrail</h2>
          <p>Find garage sales, estate sales, rummage sales, moving sales, and build a useful weekend route.</p>
          <div className="tag-row">
            <span>Garage sales</span>
            <span>Estate sales</span>
            <span>Rummage sales</span>
            <span>Routes</span>
          </div>
          <Link className="button primary" href="/saletrail">
            Open SaleTrail
          </Link>
        </article>

        <article className="front-product-card front-feature-card harvest-teaser-card">
          <p className="front-badge">Local abundance</p>
          <h2>Harvest</h2>
          <p>Map fruit trees, gardens, seed sharing, gleaning opportunities, and local food abundance.</p>
          <div className="tag-row">
            <span>Fruit trees</span>
            <span>Gardens</span>
            <span>Seeds</span>
            <span>Gleaning</span>
            <span>Pawpaws</span>
          </div>
          <Link className="button" href="/harvest">
            Explore Harvest
          </Link>
        </article>

        <article className="front-product-card">
          <p className="front-badge">Local goods</p>
          <h2>Local Market</h2>
          <p>Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, and neighborhood makers.</p>
          <div className="tag-row">
            <span>Eggs</span>
            <span>Honey</span>
            <span>Produce</span>
            <span>Handmade</span>
            <span>Farmstands</span>
            <span>Cottage Food</span>
          </div>
          <Link className="button" href="/local-market">
            View Local Market
          </Link>
        </article>

        <article className="front-product-card">
          <p className="front-badge">Things happening</p>
          <h2>Local Events</h2>
          <p>Find farmers markets, craft fairs, vendor pop-ups, workshops, festivals, plant swaps, and community gatherings.</p>
          <div className="tag-row">
            <span>Farmers markets</span>
            <span>Craft fairs</span>
            <span>Pop-ups</span>
            <span>Workshops</span>
            <span>Plant swaps</span>
          </div>
          <Link className="button" href="/local-events">
            View Local Events
          </Link>
        </article>

        <article className="front-product-card">
          <p className="front-badge">Practical help</p>
          <h2>Local Services</h2>
          <p>Find nearby people offering cleaning, yard help, repairs, hauling, garden help, and other useful local services.</p>
          <div className="tag-row">
            <span>Cleaning</span>
            <span>Handyman</span>
            <span>Yard help</span>
            <span>Hauling</span>
            <span>Garden help</span>
          </div>
          <Link className="button" href="/local-services">
            View Local Services
          </Link>
        </article>
      </section>

      <section className="front-about" aria-labelledby="localizedFieldDesk">
        <div>
          <p className="front-badge">Field notes</p>
          <h2 id="localizedFieldDesk">Built for the ordinary magic of nearby.</h2>
        </div>
        <div className="front-note-grid">
          <p>
            Localized.life is a growing home for practical local tools: small systems that help neighbors find useful
            things nearby, organize what is already happening, and turn scattered local knowledge into something easier
            to act on without relying on noisy feeds.
          </p>
          <aside className="front-field-note" aria-label="Localized.life motto">
            <strong>Simple public doors. Flexible connected profiles.</strong>
            <span>People, farms, makers, organizers, services, and places should be able to appear where they fit.</span>
          </aside>
        </div>
      </section>

      <section className="front-tool-section">
        <div>
          <p className="front-badge">How it connects</p>
          <h2>Not one rigid folder tree.</h2>
        </div>
        <div className="tool-card-grid">
          <article className="tool-card">
            <h3>Local Profiles</h3>
            <p>A maker, farm, church, service provider, organizer, or farmstand can become one reusable local profile.</p>
          </article>
          <article className="tool-card">
            <h3>Connected listings</h3>
            <p>A profile can connect to goods, events, sales, harvest items, or services when those pathways make sense.</p>
          </article>
          <article className="tool-card">
            <h3>Build in steps</h3>
            <p>SaleTrail works now. Local Market, Local Services, and broader Events can grow without forcing Harvest to carry everything.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
