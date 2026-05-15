import Link from "next/link";

export default function Home() {
  return (
    <main className="page front-page">
      <section className="hero">
        <p className="eyebrow">Localized.life</p>
        <h1>Simple local tools, starting with garage sales.</h1>
        <p className="lede">
          Localized.life is a home for small, useful neighborhood tools. The first product is SaleTrail, a garage sale
          directory and route builder.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/saletrail">
            Open SaleTrail
          </Link>
        </div>
      </section>

      <section className="front-band">
        <p className="eyebrow">Now live</p>
        <h2>SaleTrail</h2>
        <p>
          Find local garage sales, view community-added listings, save stops, and open a simple route in Google Maps.
        </p>
        <Link className="text-link" href="/saletrail">
          Go to garage sales
        </Link>
      </section>
    </main>
  );
}
