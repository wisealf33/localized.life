import Link from "next/link";
import type { Metadata } from "next";
import { HarvestRegistry } from "@/components/HarvestRegistry";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Harvest Registry",
  description:
    "Browse registered fruit trees, nut trees, berry bushes, and perennial food plants by general area without exposing private addresses.",
  path: "/harvest/registry",
  image: "/harvest/harvest-hero.jpg",
});

export default function HarvestRegistryPage() {
  return (
    <main className="harvest-page">
      <div className="harvest-header-wrap">
        <SiteHeader active="harvest" product="Harvest" />
      </div>

      <section className="harvest-directory-hero">
        <p className="harvest-eyebrow">Harvest registry</p>
        <h1>Registered trees, bushes, and perennial food plants.</h1>
        <p>
          The public directory shows plant type and general area only. Private owner details, lead details, and exact
          addresses stay out of the public list.
        </p>
        <Link className="button harvest-secondary" href="/harvest#registry">
          Back to Harvest
        </Link>
      </section>

      <HarvestRegistry mode="directory" />
    </main>
  );
}
