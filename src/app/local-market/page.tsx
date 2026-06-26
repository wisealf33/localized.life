import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Market | Localized.life",
  description:
    "Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, practical local goods, and neighborhood makers.",
  path: "/local-market",
});

const categories = [
  "Fresh & Grown",
  "Raised & Gathered",
  "Baked & Prepared",
  "Made & Crafted",
  "Farmstands & Home Shops",
  "Backyard Producers",
  "Small Farms",
];

const examples = ["Eggs", "Honey", "Produce", "Plants", "Flowers", "Baked goods", "Soap", "Candles", "Crafts"];

export default async function LocalMarketPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="page">
      <SiteHeader active="market" product="Project hub" />
      <section className="hero">
        <p className="eyebrow">Local goods</p>
        <h1>Local Market</h1>
        <p className="lede">
          A directory for useful local goods and abundance: things people grow, raise, bake, make, gather, repair, or
          offer nearby.
        </p>
      </section>

      <LocalSubmissionForm
        area="market"
        eyebrow="Submit a local good"
        title="Add yourself to Local Market"
        description="Use this if you offer local goods, farmstand items, backyard abundance, handmade items, cottage food, plants, or practical farm and garden items. Please do not submit random resale items or small marketplace listings."
        categoryLabel="What do you sell?"
        categoryPlaceholder="Eggs, honey, produce, candles, baked goods..."
        titleLabel="Listing or profile name"
        titlePlaceholder="Smith Family Eggs, Maple Street Farmstand..."
        descriptionLabel="Tell shoppers what you offer"
        descriptionPlaceholder="What do you sell, where are you located, when are you available, and how should people contact you?"
        returnPath="/local-market"
        submitted={Boolean(params.submitted)}
        emailStatus={params.email}
        manageToken={params.manage}
        errorMessage={params.error}
        ctaLabel="Post a local good"
      />

      <section className="grid two">
        <article className="card">
          <h2>What belongs here</h2>
          <p className="muted">
            Local Market is for local abundance and practical goods: eggs, honey, produce, plants, baked goods,
            cottage food, handmade items, farmstand goods, garden starts, flowers, firewood, compost, farm and garden
            tools, and larger local-use items that make sense to find nearby.
          </p>
          <div className="tag-row">
            {examples.map((example) => (
              <span key={example}>{example}</span>
            ))}
          </div>
        </article>

        <article className="card">
          <h2>Local Market categories</h2>
          <p className="muted">
            These are the main kinds of local goods we want here. Local Market is not a general resale feed, so random
            small household items should stay in SaleTrail or another resale space unless they connect to growing,
            making, repairing, farmstands, or practical local use.
          </p>
          <div className="mini-list">
            {categories.map((category) => (
              <span key={category}>{category}</span>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
