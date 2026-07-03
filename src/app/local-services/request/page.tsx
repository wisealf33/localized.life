import Link from "next/link";
import type { Metadata } from "next";
import { submitServiceRequest } from "@/lib/actions";
import { localServices, serviceBySlug } from "@/lib/localServices";
import { pageMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/SiteHeader";

type Props = {
  searchParams: Promise<{
    service?: string;
    requested?: string;
    email?: string;
    manage?: string;
    error?: string;
  }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Request a Local Service",
  description: "Request cleaning, yard help, repairs, hauling, pet care, assembly, mounting, and other practical local services.",
  path: "/local-services/request",
});

export default async function LocalServiceRequestPage({ searchParams }: Props) {
  const params = await searchParams;
  const selectedService = params.service ? serviceBySlug(params.service) : undefined;
  const managePath = params.manage ? `/manage/${params.manage}` : "";

  return (
    <main className="page local-page local-page-services">
      <SiteHeader active="services" product="Project hub" />
      <section className="hero compact-hero local-hero local-hero-services">
        <p className="eyebrow">Request practical help</p>
        <h1>Request a local service</h1>
        <p className="lede">
          Tell Localized.life what kind of help you need. The request goes into review first, then it can be matched
          into the local services flow as the network grows.
        </p>
      </section>

      <section className="panel local-submit-panel" id="request">
        <div className="submit-copy">
          <p className="eyebrow">Service request</p>
          <h2>{selectedService ? selectedService.title : "What do you need help with?"}</h2>
          <p className="muted">
            Keep this practical: what needs done, where you are, when you need it, and the best way to follow up.
          </p>
          <div className="mini-list local-category-list">
            {(selectedService?.requestPrompts || [
              "What outcome you need",
              "When you need the help",
              "Where the work is located",
            ]).map((prompt) => (
              <span key={prompt}>{prompt}</span>
            ))}
          </div>
        </div>

        {params.requested ? (
          <div className="notice good stack">
            <h3>Request submitted for review</h3>
            <p>Thanks. The request is saved in the admin queue before anything is published or matched.</p>
            {params.email === "sent" ? (
              <p>We emailed your private manage link. Save that email so you can update or remove the request later.</p>
            ) : managePath ? (
              <p>
                Email is not configured yet, so save this private manage link for now:{" "}
                <Link className="text-link" href={managePath}>
                  open manage link
                </Link>
              </p>
            ) : null}
            <Link className="button compact-button" href="/local-services">
              Back to Local Services
            </Link>
          </div>
        ) : (
          <form action={submitServiceRequest} className="form submission-form">
            {params.error ? (
              <div className="notice bad stack" role="alert">
                <h3>Request was not saved</h3>
                <p>{params.error}</p>
              </div>
            ) : null}
            <label>
              Service needed
              <select name="service_title" defaultValue={selectedService?.title || ""} required>
                <option value="">Choose a service</option>
                {localServices.map((service) => (
                  <option key={service.slug} value={service.title}>
                    {service.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid two">
              <label>
                Your name
                <input name="name" placeholder="Name or household contact" />
              </label>
              <label>
                Email for private manage link
                <input name="submitter_email" type="email" required placeholder="you@example.com" />
              </label>
            </div>
            <div className="grid two">
              <label>
                City
                <input name="city" placeholder="Example: Peotone, Joliet, Manteno" />
              </label>
              <label>
                State
                <input name="state" placeholder="IL" maxLength={2} />
              </label>
            </div>
            <div className="grid two">
              <label>
                Phone number
                <input name="phone" placeholder="Optional phone or text number" />
              </label>
              <label>
                Preferred contact
                <input name="preferred_contact" placeholder="Text first, email, call after 5 PM..." />
              </label>
            </div>
            <div className="grid two">
              <label>
                When do you need it?
                <input name="timeline" placeholder="ASAP, this weekend, next week, flexible..." />
              </label>
              <label>
                Budget range, optional
                <input name="budget" placeholder="$50-$100, quote needed, trade/barter..." />
              </label>
            </div>
            <label>
              What needs done?
              <textarea
                name="description"
                rows={7}
                required
                placeholder="Describe the job, where it is, any constraints, tools/materials, access notes, pets, stairs, photos you can provide later, or anything else that helps someone understand the request."
              />
            </label>
            <button className="button primary" type="submit">
              Submit service request
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
