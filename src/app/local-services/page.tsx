import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Local Services | Localized.life",
  description:
    "Find nearby people offering cleaning, yard help, repairs, hauling, garden help, and other useful local services.",
  path: "/local-services",
});

const serviceTypes = ["Cleaning", "Handyman", "Yard help", "Garden help", "Hauling", "Repairs", "Pet care", "Tutoring", "Farm help"];

export default function LocalServicesPage() {
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

      <section className="grid two">
        <article className="card">
          <h2>Help and local work, not goods.</h2>
          <p className="muted">
            Local Services is separate from Local Market. It starts as a simple directory for practical local help and
            can later connect into Pactum when deeper service tools are ready.
          </p>
          <div className="tag-row">
            {serviceTypes.map((type) => (
              <span key={type}>{type}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Pactum later, simple directory now.</h2>
          <p className="muted">
            This does not promise contracts, payments, ratings, tokens, or dispute systems yet. It leaves the structure
            open for those tools when they are intentionally built.
          </p>
          <Link className="button primary" href="/saletrail">
            Use SaleTrail now
          </Link>
        </article>
      </section>
    </main>
  );
}
