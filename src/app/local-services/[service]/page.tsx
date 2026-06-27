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
    <main className="page local-page local-page-services">
      <SiteHeader active="services" product="Project hub" />
      <section className="hero compact-hero local-hero local-hero-services">
        <p className="eyebrow">{service.category}</p>
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
            A clear request helps local providers decide whether they can help before anyone wastes time messaging back
            and forth.
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
          <h2>Start as a reviewed request.</h2>
          <p className="muted">
            Localized.life is not promising instant booking yet. The request is saved for review first, then this lane
            can grow into matching, scheduling, payments, and provider profiles when the local network is ready.
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
