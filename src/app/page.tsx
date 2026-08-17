import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Localized.life | Useful Local Life Outside Noisy Feeds",
  description:
    "Find local services, goods, events, mentors, growing projects, and garage sales without sorting through noisy social feeds.",
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
          <p className="front-badge">Everything local, in one place</p>
          <h1>Useful local life, pulled out of the noise.</h1>
          <p className="lede">
            Find local services, goods, events, mentors, growing projects, and garage sales without sorting through
            noisy social feeds.
          </p>
          <div className="toolbar">
            <Link className="button primary" href="/local-services">
              Ask for local help
            </Link>
            <Link className="button" href="#explore">
              Explore everything nearby
            </Link>
          </div>
        </div>

      </section>

      <section className="front-product-band front-door-band" id="explore" aria-label="Explore Localized.life">
        <div className="front-door-intro">
          <p className="front-badge">Start here</p>
          <h2>Start with what you need nearby.</h2>
          <p>
            Choose practical help first, then browse local goods, events, mentors, growing projects, or weekend sales.
          </p>
        </div>

        <article className="front-product-card front-feature-card front-door-services">
          <p className="front-badge">Start here</p>
          <h3>Local Services</h3>
          <p>Ask for cleaning, yard help, small repairs, pet care, tech help, and other useful local services.</p>
          <Link className="button primary" href="/local-services">
            Ask for local help
          </Link>
        </article>

        <article className="front-product-card front-feature-card front-door-market">
          <p className="front-badge">Local goods</p>
          <h3>Local Market</h3>
          <p>Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, and neighborhood makers.</p>
          <Link className="button primary" href="/local-market">
            View Local Market
          </Link>
        </article>

        <article className="front-product-card front-door-card front-door-events">
          <p className="front-badge">Things happening</p>
          <h3>Local Events</h3>
          <p>Find farmers markets, craft fairs, vendor pop-ups, workshops, festivals, plant swaps, and community gatherings.</p>
          <Link className="button" href="/local-events">
            View Local Events
          </Link>
        </article>

        <article className="front-product-card front-door-card front-door-mentors">
          <p className="front-badge">Learn nearby</p>
          <h3>Local Mentors</h3>
          <p>Find music lessons, garden coaching, farming skills, creative practice, tutoring, and hands-on learning nearby.</p>
          <Link className="button" href="/local-mentors">
            View Local Mentors
          </Link>
        </article>

        <article className="front-product-card front-door-card harvest-teaser-card">
          <p className="front-badge">Local abundance</p>
          <h3>Harvest</h3>
          <p>Map fruit trees, gardens, seed sharing, gleaning opportunities, and local food abundance.</p>
          <Link className="button" href="/harvest">
            Explore Harvest
          </Link>
        </article>

        <article className="front-product-card front-door-card">
          <p className="front-badge">Weekend sales</p>
          <h3>SaleTrail</h3>
          <p>Find garage sales, estate sales, rummage sales, and build a useful weekend route.</p>
          <Link className="button" href="/saletrail">
            Find local sales
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
            <strong>Start with what is nearby.</strong>
            <span>Find practical help, local goods, events, mentors, abundance, and sales without digging through noisy feeds.</span>
          </aside>
        </div>
      </section>

      <section className="front-membership-callout" aria-labelledby="membershipCallout">
        <div>
          <p className="front-badge">Your Localized.life account</p>
          <h2 id="membershipCallout">Keep your local activity in one place.</h2>
          <p>
            Claim your listings, protect private details, save useful finds, and update the information people see.
          </p>
        </div>
        <Link className="button primary" href="/membership">
          See account benefits
        </Link>
      </section>
    </main>
  );
}
