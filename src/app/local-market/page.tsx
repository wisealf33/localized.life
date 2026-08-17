import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Storefront } from "@phosphor-icons/react/ssr";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { backlogLeads } from "@/data/backlog-leads";
import { localMarketProfiles, marketProfilePath } from "@/data/local-market-profiles";
import { cleanDirectorySearch, matchesDirectorySearch } from "@/lib/localDirectory";
import { pageMetadata } from "@/lib/seo";
import type { BacklogLead } from "@/lib/types";

type Props = {
  searchParams: Promise<{ q?: string; submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Market: Eggs, Produce, Farmstands & Handmade Goods",
  description:
    "Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, practical local goods, and neighborhood makers.",
  path: "/local-market",
});

const categories = [
  {
    title: "Fresh & Grown",
    description: "Produce, garden starts, flowers, herbs, plants, and seasonal abundance from nearby yards or farms.",
    examples: ["Produce", "Plants", "Flowers"],
  },
  {
    title: "Raised & Gathered",
    description: "Eggs, honey, meat shares, mushrooms, firewood, compost, and other useful local resources.",
    examples: ["Eggs", "Honey", "Firewood"],
  },
  {
    title: "Baked & Prepared",
    description: "Cottage food, baked goods, jams, sauces, preserves, and small-batch kitchen goods.",
    examples: ["Bread", "Jams", "Treats"],
  },
  {
    title: "Made & Crafted",
    description: "Handmade goods, soap, candles, practical craft, home goods, and useful local maker work.",
    examples: ["Soap", "Candles", "Crafts"],
  },
];

const marketLeadTypes = new Set<BacklogLead["lead_type"]>(["local_goods", "food", "gardens"]);
const profileSourceLeadIds = new Set(localMarketProfiles.map((profile) => profile.sourceLeadId));
const hiddenMarketLeadIds = new Set([
  "peotone-chicken-duck-eggs-2026-06-28",
]);

const marketListings = backlogLeads.filter(
  (lead) => marketLeadTypes.has(lead.lead_type) && !profileSourceLeadIds.has(lead.id) && !hiddenMarketLeadIds.has(lead.id),
);

function listingReportUrl(lead: BacklogLead) {
  const params = new URLSearchParams({
    request_type: "bug",
    page_url: `/local-market#${lead.id}`,
    message: `Report incorrect Local Market listing information for: ${lead.title}`,
  });
  return `/saletrail/feedback?${params.toString()}`;
}

function listingSummary(lead: BacklogLead) {
  const summaries: Record<string, string> = {
    "momence-farm-fresh-eggs-2026-06-28":
      "Farm fresh eggs available in Momence, with by-the-dozen pricing noted in the public post.",
    "joliet-sourdough-bread-barn-2026-06-28":
      "Sourdough bread available for Joliet pickup, with pickup timing noted in the public post.",
  };
  return summaries[lead.id] || lead.summary;
}

function profileReportUrl(profileName: string, slug: string) {
  const params = new URLSearchParams({
    request_type: "bug",
    page_url: `/local-market/${slug}`,
    message: `Report incorrect Local Market profile information for: ${profileName}`,
  });
  return `/saletrail/feedback?${params.toString()}`;
}

export default async function LocalMarketPage({ searchParams }: Props) {
  const params = await searchParams;
  const searchTerm = cleanDirectorySearch(params.q);
  const visibleProfiles = localMarketProfiles.filter((profile) =>
    matchesDirectorySearch(searchTerm, [
      profile.profileName,
      profile.area,
      profile.summary,
      profile.claimStatus,
      ...profile.products.flatMap((product) => [product.name, product.category, product.price, product.details]),
    ]),
  );
  const visibleMarketListings = marketListings.filter((listing) =>
    matchesDirectorySearch(searchTerm, [listing.title, listing.area, listing.summary, listing.notes, listing.lead_type]),
  );
  const visibleCategories = categories.filter((category) =>
    matchesDirectorySearch(searchTerm, [category.title, category.description, ...category.examples]),
  );
  const visibleListingCount = visibleProfiles.length + visibleMarketListings.length;
  const hasFilters = Boolean(searchTerm);

  return (
    <main className="page local-page local-page-market public-directory-page">
      <SiteHeader active="market" product="Project hub" />
      <section className="hero local-hero local-hero-market public-directory-hero">
        <Storefront aria-hidden="true" className="directory-hero-icon" size={72} weight="duotone" />
        <p className="eyebrow">Local goods</p>
        <h1>Local Market</h1>
        <p className="lede">
          Find eggs, produce, baked goods, plants, handmade items, and other useful things made or grown nearby.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="#market-search">
            Find local goods
          </Link>
          <Link className="button" href="#submit">
            Offer local goods
          </Link>
        </div>
      </section>

      <section className="panel event-filter-panel local-directory-filter public-search-panel" id="market-search">
        <div>
          <h2>Find Local Goods</h2>
          <p className="muted">
            Search by item, town, county, or seller name.
          </p>
        </div>
        <form action="/local-market" className="event-directory-search local-directory-search" method="get">
          <label>
            Search local goods
            <input
              defaultValue={searchTerm}
              name="q"
              placeholder="Try eggs, honey, sourdough, plants, Peotone..."
              type="search"
            />
          </label>
          <div className="event-search-actions local-search-actions">
            <button className="button primary" type="submit">
              Search
            </button>
            {hasFilters ? (
              <Link className="button" href="/local-market">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
        <p className="event-result-count local-result-count" aria-live="polite">
          Showing {visibleListingCount} {visibleListingCount === 1 ? "listing" : "listings"}
          {searchTerm ? ` for "${searchTerm}"` : ""}.
        </p>
      </section>

      <section className="directory-browse-list" aria-labelledby="marketCategories">
        <div>
          <p className="eyebrow">Browse local goods</p>
          <h2 id="marketCategories">What are you looking for?</h2>
        </div>
        <div className="directory-link-list">
          {visibleCategories.map((category) => (
            <Link href={`/local-market?q=${encodeURIComponent(category.title)}`} key={category.title}>
              <strong>{category.title}</strong>
              <span>{category.description}</span>
              <ArrowRight aria-hidden="true" size={20} weight="bold" />
            </Link>
          ))}
        </div>
      </section>

      <section className="panel stack public-results-panel" id="market-results" aria-labelledby="localMarketListings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Local Market listings</p>
            <h2 id="localMarketListings">Local goods near you.</h2>
          </div>
        </div>
        {visibleProfiles.length ? (
          <div className="grid two local-listing-grid local-profile-grid">
            {visibleProfiles.map((profile) => (
              <article className="card local-listing-card local-profile-card" key={profile.slug}>
                <div>
                  <p className="eyebrow">
                    {profile.claimStatus === "claimed" ? "Claimed profile" : "Unclaimed profile"}
                  </p>
                  <h3>{profile.profileName}</h3>
                  <p className="muted">{profile.area}</p>
                  <p>{profile.summary}</p>
                  <div className="tag-row">
                    {profile.products.map((product) => (
                      <span key={product.name}>{product.category}</span>
                    ))}
                  </div>
                </div>
                <div className="card-actions">
                  <Link className="button primary" href={marketProfilePath(profile)}>
                    View profile
                  </Link>
                  <Link className="button" href={profileReportUrl(profile.profileName, profile.slug)}>
                    Report incorrect info
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {visibleListingCount === 0 ? (
          <div className="empty local-directory-empty">
            <h3>No Matching Local Goods Yet</h3>
            <p>Try another search, clear the filter, or submit a local good for review.</p>
            <div className="toolbar">
              <Link className="button" href="/local-market">
                View all local goods
              </Link>
              <Link className="button primary" href="#submit">
                Post a local good
              </Link>
            </div>
          </div>
        ) : null}
        <div className="grid two local-listing-grid">
          {visibleMarketListings.map((listing) => (
            <article className="card local-listing-card" id={listing.id} key={listing.id}>
              <div>
                <p className="eyebrow">{listing.lead_type.replaceAll("_", " ")}</p>
                <h3>{listing.title}</h3>
                <p className="muted">{listing.area}</p>
                <p>{listingSummary(listing)}</p>
              </div>
              <div className="card-actions">
                {listing.source_url ? (
                  <a className="button primary" href={listing.source_url} target="_blank" rel="noopener noreferrer">
                    Contact / source
                  </a>
                ) : null}
                <Link className="button" href={listingReportUrl(listing)}>
                  Report incorrect info
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <LocalSubmissionForm
        area="market"
        eyebrow="Submit a local good"
        title="Add yourself to Local Market"
        description="Share goods you grow, raise, bake, make, or regularly offer nearby. We will contact you before the listing appears publicly."
        categoryLabel="What do you sell?"
        categoryPlaceholder="Eggs, honey, produce, candles, baked goods..."
        titleLabel="Listing or profile name"
        titlePlaceholder="Smith Family Eggs, Maple Street Farmstand..."
        descriptionLabel="Tell shoppers what you offer"
        descriptionPlaceholder="What do you sell, where are you located, when are you available, and how should people contact you?"
        returnPath="/local-market"
        submitted={Boolean(params.submitted)}
        emailStatus={params.email}
        manageToken={params.manage}
        errorMessage={params.error}
        ctaLabel="Post a local good"
      />
    </main>
  );
}
