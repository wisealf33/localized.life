import Link from "next/link";

type ActiveNav = "home" | "harvest" | "find" | "events" | "map" | "list" | "route";

type SiteHeaderProps = {
  active?: ActiveNav;
  product?: "SaleTrail" | "Harvest" | "Project hub";
};

function navClass(active: ActiveNav | undefined, item: ActiveNav) {
  return active === item ? "site-nav-link active" : "site-nav-link";
}

export function SiteHeader({ active, product = "SaleTrail" }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link className="site-brand" href="/">
        <span className="site-wordmark">Localized.life</span>
        <span className="site-product">{product}</span>
      </Link>
      <nav className="site-nav" aria-label="Localized.life navigation">
        <Link className={navClass(active, "harvest")} href="/harvest">
          Harvest
        </Link>
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
