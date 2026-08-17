import type { Metadata } from "next";
import { LocalServicesLanding, ServicesPrivacyNote } from "@/components/LocalServicesLanding";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { localServices } from "@/lib/localServices";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Services: Cleaning, Yard Help, Repairs & Practical Help",
  description:
    "Ask for house cleaning, yard cleanup, small repairs, furniture assembly, pet care, tech help, and other practical local help around Peotone, Illinois.",
  path: "/local-services",
});

export default async function LocalServicesPage({ searchParams }: Props) {
  const params = await searchParams;
  const serviceTypes = localServices.map((service) => service.title);

  return (
    <main className="local-services-consumer-page">
      <SiteHeader active="services" product="Project hub" />
      <LocalServicesLanding />

      <section className="services-process" aria-labelledby="servicesProcessTitle">
        <div>
          <h2 id="servicesProcessTitle">You ask. We arrange the right local help.</h2>
          <p>
            Localized.life handles the connection. You do not have to sort through a public list of people or decide
            who to contact on your own.
          </p>
        </div>
        <ol>
          <li>
            <span>1</span>
            <div>
              <strong>Tell us what you need</strong>
              <p>Share the job, location, timing, and anything that helps us understand it.</p>
            </div>
          </li>
          <li>
            <span>2</span>
            <div>
              <strong>We arrange the right fit</strong>
              <p>We review the request and decide who is appropriate to contact.</p>
            </div>
          </li>
          <li>
            <span>3</span>
            <div>
              <strong>You choose whether to connect</strong>
              <p>We share the next step only after the details make sense for everyone.</p>
            </div>
          </li>
        </ol>
      </section>

      <aside className="services-scope-note" aria-label="Current service limits">
        <strong>Small, practical jobs are the focus.</strong>
        <p>
          We are not taking hauling, moving, delivery, junk removal, or work that requires trucks, trailers, tractors,
          or other heavy equipment. Ordinary home and yard tools are fine.
        </p>
      </aside>

      <LocalSubmissionForm
        area="service"
        eyebrow="Offer local help"
        title="Share a service you can provide"
        description="Tell us what you can do around Peotone and nearby communities. We review every submission and will contact you before it appears publicly."
        categoryLabel="Type of help"
        categoryPlaceholder="Choose the closest type of help"
        categoryOptions={serviceTypes}
        categoryHelper="Choose the closest match, then use the description to explain the work you take."
        titleLabel="How would you describe your service?"
        titlePlaceholder="House cleaning, dog walking, weekend yard cleanup..."
        descriptionLabel="Tell us about the help you offer"
        descriptionPlaceholder="Describe the jobs you take, the towns you serve, when you are usually available, and anything people should know before connecting."
        contactLabel="Public contact method (optional)"
        contactPlaceholder="Phone, email, website, or social link"
        contactHelper="We will confirm what may be shared before a listing appears publicly."
        manageEmailHelper="This email stays private and is used to send your update or removal link."
        returnPath="/local-services"
        submitted={Boolean(params.submitted)}
        emailStatus={params.email}
        manageToken={params.manage}
        errorMessage={params.error}
        ctaLabel="Offer a local service"
        summaryNote="Tell us what you offer. We review every submission before it appears publicly."
      />
      <ServicesPrivacyNote />
    </main>
  );
}
