import Link from "next/link";

export default function Home() {
  return (
    <main className="front-shell">
      <nav className="front-nav" aria-label="Localized.life">
        <Link className="front-wordmark" href="/">
          Localized.life
        </Link>
        <div className="front-nav-links">
          <Link href="/saletrail">SaleTrail</Link>
          <Link className="button primary compact-button" href="/saletrail/new">
            List a sale
          </Link>
        </div>
      </nav>

      <section className="front-hero">
        <div className="front-copy">
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
        <h2>What is Localized.life?</h2>
        <p>
          Localized.life is a growing home for practical local tools — starting with garage sales, then expanding toward
          gardens, tools, food, services, events, and local exchange.
        </p>
      </section>

      <section className="front-tool-section">
        <div>
          <p className="front-badge">First tool</p>
          <h2>SaleTrail</h2>
        </div>
        <div className="tool-card-grid">
          <article className="tool-card">
            <h3>For sellers</h3>
            <p>Create one listing, get a flyer, QR code, and share-ready text.</p>
          </article>
          <article className="tool-card">
            <h3>For shoppers</h3>
            <p>Find nearby garage sales, save favorites, and build a simple route.</p>
          </article>
          <article className="tool-card">
            <h3>For communities</h3>
            <p>Turn scattered posts into organized local listings people can actually use.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
