import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Localized.life Membership: Claim Profiles, Verify Local Listings & Manage Regions",
  description:
    "Localized.life membership is the trust layer for claimed profiles, protected private details, regional managers, local sellers, mentors, organizers, and community members.",
  path: "/membership",
  image: "/og/default-saletrail.jpg",
});

const memberTypes = [
  {
    title: "Community members",
    description: "Save local finds, follow towns or counties, report wrong information, and build routes.",
    tags: ["Save", "Follow", "Report"],
  },
  {
    title: "Listing owners",
    description: "Claim a sale, market profile, mentor profile, service, event, or harvest listing and keep it current.",
    tags: ["Claim", "Edit", "Protect details"],
  },
  {
    title: "Regional managers",
    description: "Verify listings for a county or region, help owners claim profiles, and keep local pages trustworthy.",
    tags: ["Verify", "Review", "Maintain"],
  },
  {
    title: "Sponsors and partners",
    description: "Support a town, county, category, route, or event page with clear local sponsorship.",
    tags: ["Sponsor", "Partner", "Promote"],
  },
];

const buildSteps = [
  "Turn researched finds into private leads first.",
  "Let owners claim profiles before sensitive details go public.",
  "Give regional managers a review queue by county.",
  "Add paid profile, organizer, sponsor, and manager-supported tools.",
];

export default function MembershipPage() {
  return (
    <main className="page membership-page">
      <SiteHeader active="membership" product="Project hub" />

      <section className="hero membership-hero">
        <p className="eyebrow">Membership first</p>
        <h1>Localized.life needs members because trust has to be managed.</h1>
        <p className="lede">
          Public pages can help people find local life, but member accounts are what let owners claim profiles,
          regional managers verify listings, and private details stay protected.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/local-market#submit">
            Submit or claim a profile
          </Link>
          <Link className="button" href="/saletrail/feedback">
            Ask about membership
          </Link>
        </div>
      </section>

      <section className="membership-principles" aria-labelledby="membershipPrinciples">
        <div>
          <p className="eyebrow">What changes</p>
          <h2 id="membershipPrinciples">The directory becomes a trust network.</h2>
        </div>
        <div className="grid two">
          <article className="card membership-rule-card">
            <h3>Public summaries, private control.</h3>
            <p className="muted">
              Exact addresses, pickup rules, phone numbers, and full personal names should be controlled by the owner,
              not copied into a public listing by default.
            </p>
          </article>
          <article className="card membership-rule-card">
            <h3>Regional review before scale.</h3>
            <p className="muted">
              Localized can grow county by county with trusted managers who verify that listings actually belong in
              their area.
            </p>
          </article>
        </div>
      </section>

      <section className="grid two membership-member-grid" aria-labelledby="memberTypes">
        <div className="section-heading membership-section-heading">
          <div>
            <p className="eyebrow">Member types</p>
            <h2 id="memberTypes">Different members, different jobs.</h2>
          </div>
        </div>
        {memberTypes.map((type) => (
          <article className="card membership-type-card" key={type.title}>
            <h3>{type.title}</h3>
            <p className="muted">{type.description}</p>
            <div className="tag-row">
              {type.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="panel membership-roadmap" aria-labelledby="membershipRoadmap">
        <div>
          <p className="eyebrow">Build path</p>
          <h2 id="membershipRoadmap">Start with claims and verification, then add payments.</h2>
          <p className="muted">
            The first membership layer should make the site safer and easier to manage. Paid plans can sit on top of
            that once the account roles are working.
          </p>
        </div>
        <ol>
          {buildSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
