import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Link className="site-footer-wordmark" href="/">
            Localized.life
          </Link>
          <p>Useful local life, pulled out of the noise.</p>
        </div>
        <nav className="site-footer-nav" aria-label="Footer navigation">
          <Link href="/local-services">Local Services</Link>
          <Link href="/local-market">Local Market</Link>
          <Link href="/local-events">Local Events</Link>
          <Link href="/local-mentors">Local Mentors</Link>
          <Link href="/harvest">Harvest</Link>
          <Link href="/saletrail">SaleTrail</Link>
          <Link href="/saletrail/feedback">Feature requests</Link>
        </nav>
      </div>
    </footer>
  );
}
