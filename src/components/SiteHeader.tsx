import Link from "next/link";

type ActiveNav = "home" | "find" | "events" | "map" | "list" | "route";

type SiteHeaderProps = {
  active?: ActiveNav;
};

function navClass(active: ActiveNav | undefined, item: ActiveNav) {
  return active === item ? "site-nav-link active" : "site-nav-link";
}

export function SiteHeader({ active }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/">
        <span className="site-wordmark">Localized.life</span>
        <span className="site-product">SaleTrail</span>
      </Link>
      <nav className="site-nav" aria-label="SaleTrail navigation">
        <Link className={navClass(active, "find")} href="/saletrail">
          Find sales
        </Link>
        <Link className={navClass(active, "events")} href="/saletrail/events">
          Events
        </Link>
        <Link className={navClass(active, "map")} href="/saletrail/map">
          Map
        </Link>
        <Link
          className={active === "list" ? "button primary compact-button active" : "button primary compact-button"}
          href="/saletrail/new"
        >
          List a sale
        </Link>
        <Link
          className={active === "route" ? "button compact-button active" : "button compact-button"}
          href="/saletrail/route"
        >
          My route
        </Link>
      </nav>
    </header>
  );
}
