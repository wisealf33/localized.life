import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { localServices, serviceBySlug } from "@/lib/localServices";
import { pageMetadata } from "@/lib/seo";
import { SiteHeader } from "@/components/SiteHeader";

type Props = {
  params: Promise<{ service: string }>;
};

export function generateStaticParams() {
  return localServices.map((service) => ({ service: service.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { service: slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) return {};
  return pageMetadata({
    title: `${service.title} | Local Services`,
    description: service.summary,
    path: `/local-services/${service.slug}`,
  });
}

export default async function LocalServiceDetailPage({ params }: Props) {
  const { service: slug } = await params;
  const service = serviceBySlug(slug);
  if (!service) notFound();

  return (
    <main className="page local-page local-page-services local-service-detail-page">
      <SiteHeader active="services" product="Project hub" />
      <section className="hero compact-hero local-hero local-hero-services">
        <h1>{service.title}</h1>
        <p className="lede">{service.summary}</p>
        <div className="toolbar">
          <Link className="button primary" href={`/local-services/request?service=${service.slug}`}>
            Request this service
          </Link>
          <Link className="button" href="/local-services#submit">
            Offer this service
          </Link>
        </div>
      </section>

      <section className="grid two local-info-grid">
        <article className="card">
          <h2>Common requests</h2>
          <div className="mini-list local-category-list">
            {service.examples.map((example) => (
              <span key={example}>{example}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>What to include</h2>
          <p className="muted">
            A clear request helps us understand the job and arrange the right local next step.
          </p>
          <div className="mini-list local-category-list">
            {service.requestPrompts.map((prompt) => (
              <span key={prompt}>{prompt}</span>
            ))}
          </div>
        </article>
      </section>

      <section className="panel services-flow-panel">
        <div>
          <h2>Tell us what needs doing.</h2>
          <p className="muted">
            We review each request privately and decide who is appropriate to contact. The public page does not ask you
            to choose from a list of people.
          </p>
        </div>
        <div className="card-actions">
          <Link className="button primary" href={`/local-services/request?service=${service.slug}`}>
            Request this service
          </Link>
          <Link className="button" href="/local-services">
            All services
          </Link>
        </div>
      </section>
    </main>
  );
}
