import Link from "next/link";

type ActiveNav =
  | "home"
  | "market"
  | "local-events"
  | "mentors"
  | "saletrail"
  | "harvest"
  | "services"
  | "membership"
  | "find"
  | "map"
  | "list"
  | "route";

type SiteHeaderProps = {
  active?: ActiveNav;
  product?: "SaleTrail" | "Harvest" | "Project hub" | "Connector";
};

function navClass(active: ActiveNav | undefined, item: ActiveNav, baseClass = "site-nav-link") {
  return active === item ? `${baseClass} active` : baseClass;
}

export function SiteHeader({ active, product = "SaleTrail" }: SiteHeaderProps) {
  const showSaleTrailNav = product === "SaleTrail";
  const saleTrailActive = showSaleTrailNav || active === "saletrail";

  return (
    <header className="site-header">
      <div className="site-header-main">
        <Link className="site-brand" href="/">
          <span className="site-wordmark">Localized.life</span>
        </Link>
        <nav className="site-nav site-global-nav" aria-label="Localized.life navigation">
          <Link className={navClass(active, "services")} href="/local-services">
            Local Services
          </Link>
          <Link className={navClass(active, "market")} href="/local-market">
            Local Market
          </Link>
          <Link className={navClass(active, "local-events")} href="/local-events">
            Local Events
          </Link>
          <Link className={navClass(active, "mentors")} href="/local-mentors">
            Local Mentors
          </Link>
          <Link className={navClass(active, "harvest")} href="/harvest">
            Harvest
          </Link>
          <Link className={saleTrailActive ? "site-nav-link active" : "site-nav-link"} href="/saletrail">
            SaleTrail
          </Link>
        </nav>
      </div>
      {showSaleTrailNav ? (
        <div className="site-subnav-row">
          <Link className="site-product" href="/saletrail">
            SaleTrail
          </Link>
          <nav className="site-nav site-product-nav" aria-label="SaleTrail navigation">
            <Link className={navClass(active, "find", "site-subnav-link")} href="/saletrail">
              Find sales
            </Link>
            <Link className={navClass(active, "map", "site-subnav-link")} href="/saletrail/map">
              Map
            </Link>
            <Link
              className={active === "list" ? "button primary compact-button active" : "button primary compact-button"}
              href="/saletrail/new"
            >
              List a sale
            </Link>
            <Link className={active === "route" ? "button compact-button active" : "button compact-button"} href="/saletrail/route">
              My route
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
