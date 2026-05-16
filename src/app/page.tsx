import Link from "next/link";

export default function Home() {
  return (
    <main className="front-shell">
      <section className="front-hero">
        <div className="front-copy">
          <p className="front-wordmark">Localized.Life</p>
          <p className="front-badge">First local tool now live</p>
          <h1>Local tools for real-world community.</h1>
          <p className="lede">
            We&apos;re starting with SaleTrail — a garage sale directory that helps sellers create clean listings, share
            them anywhere, and helps shoppers save sales to a simple route.
          </p>
          <div className="toolbar">
            <Link className="button primary" href="/saletrail">
              Find garage sales
            </Link>
            <Link className="button" href="/saletrail/new">
              List a garage sale
            </Link>
          </div>
        </div>

        <div className="front-product-card">
          <p className="front-badge">Now live</p>
          <h2>SaleTrail</h2>
          <p>
            Create a garage sale listing, generate a flyer with a QR code, share it to Facebook, Nextdoor, or
            Craigslist, and help shoppers add your sale to their route.
          </p>
          <div className="mini-list">
            <span>Find nearby garage sales</span>
            <span>Create a free listing</span>
            <span>Share with a flyer and QR code</span>
            <span>Save sales to a route</span>
          </div>
          <Link className="button primary" href="/saletrail">
            Open SaleTrail
          </Link>
        </div>
      </section>

      <section className="front-about">
        <h2>What is Localized.Life?</h2>
        <p>
          Localized.Life is a growing home for practical local tools — starting with garage sales, then expanding toward
          gardens, tools, food, services, events, and local exchange.
        </p>
      </section>
    </main>
  );
}
