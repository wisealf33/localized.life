import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Localized.life | Local tools for real-world community",
  description:
    "Localized.life is building practical local tools, including SaleTrail for garage sales and Harvest for mapping local food abundance.",
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
            Localized.life turns the scattered stuff of a place into tools people can act on: weekend sales worth
            routing, harvestable trees worth mapping, and local knowledge that should not disappear in a feed.
          </p>
          <div className="toolbar">
            <Link className="button primary" href="/saletrail">
              Open SaleTrail
            </Link>
            <Link className="button" href="/harvest">
              Open Harvest
            </Link>
          </div>
          <div className="front-signal-row" aria-label="Localized.life project signals">
            <span>Garage sales</span>
            <span>Fruit trees</span>
            <span>Routes</span>
            <span>Local abundance</span>
          </div>
        </div>

      </section>

      <section className="front-product-band" aria-label="Localized.life tools">
        <article className="front-product-card">
          <p className="front-badge">Garage sales</p>
          <h2>SaleTrail</h2>
          <p>A cleaner way to list sales, find nearby stops, and turn a messy Saturday plan into a route.</p>
          <Link className="button primary" href="/saletrail">
            Find garage sales
          </Link>
        </article>

        <article className="front-product-card harvest-teaser-card">
          <p className="front-badge">Food abundance</p>
          <h2>Harvest</h2>
          <p>A registry for fruit trees, nut trees, berry bushes, and the future crews that can help share them.</p>
          <Link className="button" href="/harvest">
            Explore Harvest
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
            to act on.
          </p>
          <aside className="front-field-note" aria-label="Localized.life motto">
            <strong>Start small. Make it findable. Help it move.</strong>
            <span>That is the shape of both SaleTrail and Harvest.</span>
          </aside>
        </div>
      </section>

      <section className="front-tool-section">
        <div>
          <p className="front-badge">Project areas</p>
          <h2>SaleTrail and Harvest</h2>
        </div>
        <div className="tool-card-grid">
          <article className="tool-card">
            <h3>SaleTrail sellers</h3>
            <p>Create one listing, get a flyer, QR code, and share-ready text for garage sale promotion.</p>
          </article>
          <article className="tool-card">
            <h3>SaleTrail shoppers</h3>
            <p>Find nearby garage sales, save favorites, and build a simple route.</p>
          </article>
          <article className="tool-card">
            <h3>Harvest communities</h3>
            <p>Map harvestable plants, build volunteer capacity, and prepare for local food sharing.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
