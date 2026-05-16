import Link from "next/link";

export default function Home() {
  return (
    <main className="front-shell">
      <section className="front-hero">
        <div className="front-copy">
          <p className="eyebrow">Localized.life</p>
          <h1>Simple local tools, starting with garage sales.</h1>
          <p className="lede">
            SaleTrail turns scattered garage sale posts into clean listings shoppers can find, save, and route.
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
          <p>Find local garage sales, view community-added listings, save stops, and open a simple Google Maps route.</p>
          <div className="mini-list">
            <span>Community-added listings</span>
            <span>Claim and update flow</span>
            <span>Save-to-route tools</span>
          </div>
          <Link className="button primary" href="/saletrail">
            Go to garage sales
          </Link>
        </div>
      </section>
    </main>
  );
}
