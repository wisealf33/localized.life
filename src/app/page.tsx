import Link from "next/link";

export default function Home() {
  return (
    <main className="front-shell">
      <section className="front-hero">
        <div className="front-copy">
          <div className="brand-mark">
            <span className="brand-symbol">L</span>
            <span>
              <strong>Localized.life</strong>
              <small>Useful tools for real neighborhoods</small>
            </span>
          </div>
          <p className="eyebrow">First local tool now live</p>
          <h1>Make local information easier to find, share, and use.</h1>
          <p className="lede">
            Localized.life is a home for practical neighborhood tools. The first one, SaleTrail, helps garage sale
            posts become clean listings shoppers can actually organize into a route.
          </p>
          <div className="toolbar">
            <Link className="button primary" href="/saletrail">
              Open SaleTrail
            </Link>
            <Link className="button" href="/saletrail/new">
              Create a listing
            </Link>
          </div>
        </div>

        <div className="front-product-card">
          <p className="eyebrow">Now live</p>
          <h2>SaleTrail</h2>
          <p>A clean garage sale directory for shoppers, sellers, and community-added local tips.</p>
          <div className="mini-list">
            <span>
              <strong>Find nearby sales</strong>
              <small>Search local listings without digging through scattered posts.</small>
            </span>
            <span>
              <strong>Claim your sale</strong>
              <small>Organizers can take over community-added listings and keep details accurate.</small>
            </span>
            <span>
              <strong>Build a simple route</strong>
              <small>Save stops and open the route in Google Maps.</small>
            </span>
          </div>
          <Link className="button primary" href="/saletrail">
            Go to garage sales
          </Link>
        </div>
      </section>
    </main>
  );
}
