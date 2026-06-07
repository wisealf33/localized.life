import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Local Market | Localized.life",
  description:
    "Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, and neighborhood makers.",
  path: "/local-market",
});

const categories = [
  "Fresh & Grown",
  "Raised & Gathered",
  "Baked & Prepared",
  "Made & Crafted",
  "Farmstands & Home Shops",
  "Backyard Producers",
  "Small Farms",
];

const examples = ["Eggs", "Honey", "Produce", "Plants", "Flowers", "Baked goods", "Soap", "Candles", "Crafts"];

export default function LocalMarketPage() {
  return (
    <main className="page">
      <SiteHeader active="market" product="Project hub" />
      <section className="hero">
        <p className="eyebrow">Local goods</p>
        <h1>Local Market</h1>
        <p className="lede">
          Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, and
          neighborhood makers.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Things people sell locally.</h2>
          <p className="muted">
            Local Market is the home for producers, growers, bakers, makers, small farms, backyard sellers, home
            shops, and locally made or locally produced goods. It is separate from Harvest and separate from Local
            Services.
          </p>
          <div className="tag-row">
            {examples.map((example) => (
              <span key={example}>{example}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Future paths</h2>
          <div className="mini-list">
            {categories.map((category) => (
              <span key={category}>{category}</span>
            ))}
          </div>
        </article>
      </section>

      <section className="front-tool-section">
        <div>
          <p className="front-badge">Connected profiles</p>
          <h2>Built to connect with events later.</h2>
        </div>
        <div className="tool-card-grid">
          <article className="tool-card">
            <h3>Vendor profiles</h3>
            <p>A candle maker can list candles here and also appear at a craft fair in Local Events.</p>
          </article>
          <article className="tool-card">
            <h3>Farmstands</h3>
            <p>A backyard egg seller can show pickup details here and later connect to Harvest if they share abundance.</p>
          </article>
          <article className="tool-card">
            <h3>Build order</h3>
            <p>This page sets the public door first. The full marketplace workflow can be built after SaleTrail stays stable.</p>
          </article>
        </div>
        <Link className="button primary" href="/saletrail">
          Use SaleTrail now
        </Link>
      </section>
    </main>
  );
}
