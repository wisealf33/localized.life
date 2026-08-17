import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Localized.life Membership: Save, Claim & Manage Local Listings",
  description:
    "Use a Localized.life account to save local finds, claim listings, manage public information, and protect private details.",
  path: "/membership",
  image: "/og/default-saletrail.jpg",
});

const memberTypes = [
  {
    title: "Neighbors",
    description: "Save local finds, follow towns or counties, report wrong information, and build routes.",
    tags: ["Save", "Follow", "Report"],
  },
  {
    title: "People who list",
    description: "Claim a sale, market profile, mentor profile, service, event, or harvest listing and keep it current.",
    tags: ["Claim", "Edit", "Protect details"],
  },
  {
    title: "Local organizers",
    description: "Keep event, sale, market, or community information accurate and easy for neighbors to use.",
    tags: ["Organize", "Update", "Help locally"],
  },
  {
    title: "Community partners",
    description: "Support useful local pages and projects with clear, community-minded participation.",
    tags: ["Support", "Partner", "Participate"],
  },
];

const buildSteps = [
  "Create one Localized.life account.",
  "Claim a listing or add something new.",
  "Choose which details may be shown publicly.",
  "Return anytime to correct or update the information.",
];

export default function MembershipPage() {
  return (
    <main className="page membership-page">
      <SiteHeader active="membership" product="Project hub" />

      <section className="hero membership-hero">
        <p className="eyebrow">One account for local life</p>
        <h1>Keep your local activity in one place.</h1>
        <p className="lede">
          Save useful finds, claim your listings, update public information, and keep private details under your
          control.
        </p>
        <div className="hero-actions">
          <Link className="button primary" href="/account">
            Open my account
          </Link>
          <Link className="button" href="/local-market#submit">
            Add or claim a listing
          </Link>
        </div>
      </section>

      <section className="membership-principles" aria-labelledby="membershipPrinciples">
        <div>
          <p className="eyebrow">You stay in control</p>
          <h2 id="membershipPrinciples">Share what helps without giving up your privacy.</h2>
        </div>
        <div className="grid two">
          <article className="card membership-rule-card">
            <h3>Choose what people can see.</h3>
            <p className="muted">
              You decide whether details such as an address, pickup instructions, phone number, or full name belong on
              a public listing.
            </p>
          </article>
          <article className="card membership-rule-card">
            <h3>Keep your information current.</h3>
            <p className="muted">
              Return to correct hours, dates, availability, contact information, or anything else that has changed.
            </p>
          </article>
        </div>
      </section>

      <section className="grid two membership-member-grid" aria-labelledby="memberTypes">
        <div className="section-heading membership-section-heading">
          <div>
            <p className="eyebrow">Ways to use an account</p>
            <h2 id="memberTypes">Use only the tools that help you.</h2>
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
          <p className="eyebrow">How it works</p>
          <h2 id="membershipRoadmap">Start with an account, then claim what belongs to you.</h2>
          <p className="muted">
            Your account gives you a private place to manage what you save, submit, or share publicly.
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
