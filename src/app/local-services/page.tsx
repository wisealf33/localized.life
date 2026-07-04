import Link from "next/link";
import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { cleanDirectorySearch, matchesDirectorySearch } from "@/lib/localDirectory";
import { localServices } from "@/lib/localServices";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ q?: string; submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Services: Cleaning, Yard Help, Assembly, Mounting & Practical Help",
  description:
    "Find nearby people offering cleaning, yard help, furniture assembly, TV mounting, repairs, hauling, garden help, pet care, and other useful local services.",
  path: "/local-services",
});

const serviceTypes = [
  "Cleaning",
  "Handyman",
  "Furniture assembly",
  "TV mounting",
  "Wall mounting",
  "Shelves or picture hanging",
  "Dog walking",
  "Babysitting",
  "Pet care",
  "Yard help",
  "Garden help",
  "Hauling",
  "Repairs",
  "Home setup",
  "Farm help",
  "Organizing",
];
const serviceSignals = ["Home help", "Yard work", "Pet care", "Repairs", "Setup help"];

export default async function LocalServicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const searchTerm = cleanDirectorySearch(params.q);
  const visibleServices = localServices.filter((service) =>
    matchesDirectorySearch(searchTerm, [service.title, service.category, service.summary, ...service.examples]),
  );
  const hasFilters = Boolean(searchTerm);

  return (
    <main className="page local-page local-page-services">
      <SiteHeader active="services" product="Project hub" />
      <section className="hero local-hero local-hero-services">
        <p className="eyebrow">Practical help</p>
        <h1>Local Services</h1>
        <p className="lede">
          Request practical local help or offer useful services nearby. Start with the type of help you need, then send
          a simple request for review.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/local-services/request">
            Request a service
          </Link>
          <Link className="button" href="#submit">
            Offer a service
          </Link>
        </div>
      </section>

      <section className="local-signal-strip" aria-label="Local Services highlights">
        {serviceSignals.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </section>

      <section className="panel event-filter-panel local-directory-filter">
        <div>
          <h2>Find Services</h2>
          <p className="muted">
            Search by service type, task, or simple job. Services are practical local help, not lessons or tutoring.
          </p>
        </div>
        <form action="/local-services" className="event-directory-search local-directory-search" method="get">
          <label>
            Search services
            <input
              defaultValue={searchTerm}
              name="q"
              placeholder="Try cleaning, TV mounting, yard help, pet care..."
              type="search"
            />
          </label>
          <div className="event-search-actions local-search-actions">
            <button className="button primary" type="submit">
              Search
            </button>
            {hasFilters ? (
              <Link className="button" href="/local-services">
                Clear
              </Link>
            ) : null}
          </div>
        </form>
        <p className="event-result-count local-result-count" aria-live="polite">
          Showing {visibleServices.length} {visibleServices.length === 1 ? "service" : "services"}
          {searchTerm ? ` for "${searchTerm}"` : ""}.
        </p>
      </section>

      <section className="directory-section" aria-labelledby="serviceCategories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Service types</p>
            <h2 id="serviceCategories">Pick the kind of help you need.</h2>
          </div>
          <div className="service-request-callout">
            <div>
              <p className="eyebrow">Need something else?</p>
              <p>Send a request with the job, location, timing, and any photos or notes that would help review it.</p>
            </div>
            <Link className="button primary compact-button" href="/local-services/request">
              Request other help
            </Link>
          </div>
        </div>
        <div className="service-card-grid local-browse-grid local-service-browse-grid">
          {visibleServices.length === 0 ? (
            <div className="empty local-directory-empty">
              <h3>No Matching Services Yet</h3>
              <p>Try another search, clear the filter, or request the service you need.</p>
              <div className="toolbar">
                <Link className="button" href="/local-services">
                  View all services
                </Link>
                <Link className="button primary" href="/local-services/request">
                  Request a service
                </Link>
              </div>
            </div>
          ) : (
            visibleServices.map((service) => (
              <article className="card service-type-card local-browse-card" key={service.slug}>
                <div>
                  <h3>
                    <Link href={`/local-services/${service.slug}`}>{service.title}</Link>
                  </h3>
                  <p className="muted">{service.summary}</p>
                </div>
                <div className="tag-row">
                  {service.examples.slice(0, 3).map((example) => (
                    <span key={example}>{example}</span>
                  ))}
                </div>
                <div className="card-actions">
                  <Link className="button primary compact-button" href={`/local-services/request?service=${service.slug}`}>
                    Request this
                  </Link>
                  <Link className="button compact-button" href={`/local-services/${service.slug}`}>
                    Details
                  </Link>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <LocalSubmissionForm
        area="service"
        eyebrow="Submit practical help"
        title="Add yourself to Local Services"
        description="Use this public directory form if you offer practical local help. This is not a member account yet. Submit the basic listing, then we email you a private link to edit or remove it later."
        categoryLabel="Service type"
        categoryPlaceholder="Choose a service type"
        categoryOptions={serviceTypes}
        categoryHelper="Pick the closest fit for now. If your service is not listed, describe it in the details box."
        titleLabel="Service listing title"
        titlePlaceholder="House cleaning, dog walking, weekend yard help, local hauling..."
        descriptionLabel="Tell people what help you offer"
        descriptionPlaceholder="Describe the service, where you work, when you are usually available, the kinds of jobs you take, and anything people should know before contacting you."
        contactLabel="Public contact method (optional)"
        contactPlaceholder="Phone, email, website, or social link people may use"
        contactHelper="These public contact details may be shown on an approved listing. The manage-link email below stays private."
        manageEmailHelper="This email stays private and is used only to send your edit/remove link."
        returnPath="/local-services"
        submitted={Boolean(params.submitted)}
        emailStatus={params.email}
        manageToken={params.manage}
        errorMessage={params.error}
        ctaLabel="Post a local service"
      />

      <section className="panel services-flow-panel" aria-label="How Local Services works">
        <div>
          <h2>How this works right now</h2>
          <p className="muted">
            This starts as a reviewed local request board, not instant booking. That keeps the launch simple while we
            learn which services people actually need nearby.
          </p>
        </div>
        <div className="services-flow">
          <span>Choose help</span>
          <span>Send request</span>
          <span>Review queue</span>
          <span>Connect locally</span>
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>Help and local work, not goods.</h2>
          <p className="muted">
            Local Services is separate from Local Market. This page is for practical local help: repairs, hauling,
            cleaning, yard work, garden help, pet care, assembly, mounting, and similar services.
          </p>
          <div className="tag-row">
            {serviceTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Directory now, member tools later.</h2>
          <p className="muted">
            Local Services starts as a simple public directory. Private membership, PMA tools, stronger profiles, and
            deeper service features can come later when that system is ready.
          </p>
          <Link className="button primary" href="#submit">
            Post a local service
          </Link>
        </article>
      </section>
    </main>
  );
}
