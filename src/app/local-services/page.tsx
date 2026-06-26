import Link from "next/link";
import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Services | Localized.life",
  description:
    "Find nearby people offering cleaning, yard help, repairs, hauling, garden help, and other useful local services.",
  path: "/local-services",
});

const serviceTypes = [
  "Cleaning",
  "Handyman",
  "Dog walking",
  "Babysitting",
  "Pet care",
  "Yard help",
  "Garden help",
  "Hauling",
  "Repairs",
  "Tutoring",
  "Farm help",
  "Organizing",
];

export default async function LocalServicesPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="page">
      <SiteHeader active="services" product="Project hub" />
      <section className="hero">
        <p className="eyebrow">Practical help</p>
        <h1>Local Services</h1>
        <p className="lede">
          Find nearby people offering cleaning, yard help, repairs, hauling, garden help, and other useful local
          services.
        </p>
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

      <section className="grid two">
        <article className="card">
          <h2>Help and local work, not goods.</h2>
          <p className="muted">
            Local Services is separate from Local Market. This page is for practical local help: repairs, hauling,
            cleaning, yard work, garden help, tutoring, pet care, and similar services.
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
