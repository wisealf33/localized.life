import type { Metadata } from "next";
import { LocalSubmissionForm } from "@/components/LocalSubmissionForm";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

type Props = {
  searchParams: Promise<{ submitted?: string; email?: string; manage?: string; error?: string }>;
};

export const metadata: Metadata = pageMetadata({
  title: "Local Market: Eggs, Produce, Farmstands & Handmade Goods",
  description:
    "Find local eggs, honey, produce, handmade goods, cottage foods, farmstands, backyard growers, practical local goods, and neighborhood makers.",
  path: "/local-market",
});

const categories = [
  {
    title: "Fresh & Grown",
    description: "Produce, garden starts, flowers, herbs, plants, and seasonal abundance from nearby yards or farms.",
    examples: ["Produce", "Plants", "Flowers"],
  },
  {
    title: "Raised & Gathered",
    description: "Eggs, honey, meat shares, mushrooms, firewood, compost, and other useful local resources.",
    examples: ["Eggs", "Honey", "Firewood"],
  },
  {
    title: "Baked & Prepared",
    description: "Cottage food, baked goods, jams, sauces, preserves, and small-batch kitchen goods.",
    examples: ["Bread", "Jams", "Treats"],
  },
  {
    title: "Made & Crafted",
    description: "Handmade goods, soap, candles, practical craft, home goods, and useful local maker work.",
    examples: ["Soap", "Candles", "Crafts"],
  },
];

const examples = ["Eggs", "Honey", "Produce", "Plants", "Flowers", "Baked goods", "Soap", "Candles", "Crafts"];
const marketSignals = ["Farmstand finds", "Backyard abundance", "Cottage food", "Local makers"];

export default async function LocalMarketPage({ searchParams }: Props) {
  const params = await searchParams;

  return (
    <main className="page local-page local-page-market">
      <SiteHeader active="market" product="Project hub" />
      <section className="hero local-hero local-hero-market">
        <p className="eyebrow">Local goods</p>
        <h1>Local Market</h1>
        <p className="lede">
          A directory for useful local goods and abundance: things people grow, raise, bake, make, gather, repair, or
          offer nearby.
        </p>
      </section>

      <section className="local-signal-strip" aria-label="Local Market highlights">
        {marketSignals.map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
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

      <section className="grid two local-info-grid">
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
          <div className="mini-list local-category-list">
            {categories.map((category) => (
              <span key={category.title}>{category.title}</span>
            ))}
          </div>
        </article>
      </section>

      <section className="local-card-grid local-browse-grid" aria-labelledby="marketCategories">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Market map</p>
            <h2 id="marketCategories">Browse by the kind of local good.</h2>
          </div>
        </div>
        {categories.map((category) => (
          <article className="card local-field-card local-browse-card" key={category.title}>
            <div>
              <h3>{category.title}</h3>
              <p className="muted">{category.description}</p>
            </div>
            <div className="tag-row">
              {category.examples.map((example) => (
                <span key={example}>{example}</span>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
