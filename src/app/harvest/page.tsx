import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { HarvestRegistry } from "@/components/HarvestRegistry";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Harvest",
  description:
    "Localized.life Harvest is a registry for fruit trees, nut trees, berry bushes, and perennial food plants so communities can organize harvest permissions, volunteers, and sharing.",
  path: "/harvest",
  image: "/harvest/harvest-hero.jpg",
});

export default function HarvestPage() {
  return (
    <main className="harvest-page">
      <div className="harvest-header-wrap">
        <SiteHeader active="harvest" product="Harvest" />
      </div>

      <section className="harvest-hero">
        <Image
          src="/harvest/harvest-hero.jpg"
          alt="Apples growing on a fruit tree in an orchard"
          fill
          priority
          sizes="100vw"
        />
        <div className="harvest-hero-copy">
          <p className="harvest-eyebrow">Fruit trees, gardens, and local abundance.</p>
          <h1>Localized.life Harvest</h1>
          <p>
            A place to record fruit trees, nut trees, berry bushes, gardens, seed sharing, and other local food
            abundance so communities can find and share what is growing nearby.
          </p>
          <div className="toolbar">
            <Link className="button harvest-primary" href="#registry">
              Register a plant
            </Link>
            <Link className="button harvest-secondary" href="#pawpaw">
              Paw Paw Revival
            </Link>
            <Link className="button harvest-secondary" href="#involved">
              Get involved
            </Link>
          </div>
        </div>
      </section>

      <HarvestRegistry />

      <section className="harvest-overview">
        <div>
          <p className="harvest-eyebrow">The project</p>
          <h2>A local food system that starts with a map.</h2>
          <p>
            Harvest starts by mapping what is already growing nearby, then helps people organize around harvestable
            plants, planting projects, and local food abundance.
          </p>
        </div>
        <div className="harvest-steps">
          <article>
            <span>01</span>
            <h3>Register plants</h3>
            <p>Record harvestable plants before the fruit, nuts, and berries are ready.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Build capacity</h3>
            <p>Invite plant spotters, harvesters, transport help, area coordinators, and hosts.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Fund planting</h3>
            <p>Start with Paw Paw Revival and support new local planting projects as they open.</p>
          </article>
        </div>
      </section>

      <section className="harvest-campaign" id="pawpaw">
        <div className="harvest-campaign-copy">
          <p className="harvest-eyebrow">First fundraiser</p>
          <h2>Paw Paw Revival</h2>
          <p>
            The first sponsored-tree campaign inside Harvest starts with pawpaws: native fruit trees with deep local
            roots in neighborhood food forests, creek corridors, farms, and community spaces.
          </p>
          <div className="harvest-campaign-metrics" aria-label="Campaign targets">
            <div>
              <strong>$5</strong>
              <span>sponsors seed starts</span>
            </div>
            <div>
              <strong>$25</strong>
              <span>sponsors small trees</span>
            </div>
            <div>
              <strong>1M</strong>
              <span>long-term tree goal</span>
            </div>
          </div>
          <Link className="button harvest-primary" href="/harvest/pawpaw-revival">
            Open Paw Paw Revival
          </Link>
        </div>
        <figure className="harvest-campaign-image">
          <Image
            src="/harvest/pawpaw-hero.jpg"
            alt="Pawpaw leaves and fruit growing on a tree"
            width={900}
            height={506}
            sizes="(max-width: 820px) 100vw, 430px"
          />
          <figcaption>Pawpaws are the launch tree for the Harvest sponsorship model.</figcaption>
        </figure>
      </section>

      <section className="harvest-involved" id="involved">
        <div className="harvest-section-intro">
          <p className="harvest-eyebrow">Get involved</p>
          <h2>People make the harvest network real.</h2>
          <p>
            Harvest needs people who can host growing sites, spot local food abundance, help during harvest windows, and
            move food back into the community. The registry is the starting point; the local crew turns it into a food
            network.
          </p>
        </div>
        <div className="harvest-involvement-options">
          <article>
            <span>Host</span>
            <h3>Post a harvest site</h3>
            <p>Share fruit trees, nut trees, berry rows, gardens, or perennial food plants that may be available to the network.</p>
          </article>
          <article>
            <span>Spot</span>
            <h3>Find harvestable plants</h3>
            <p>Notice fruit trees, nut trees, berry rows, gardens, and perennial food plants growing in your area.</p>
          </article>
          <article>
            <span>Harvest</span>
            <h3>Join field days</h3>
            <p>Pick, sort, pack, preserve, and distribute food during harvest windows.</p>
          </article>
          <article>
            <span>Abundance</span>
            <h3>Share food locally</h3>
            <p>Help extra fruit, nuts, produce, and preserved food reach nearby families, kitchens, pantries, and community tables.</p>
          </article>
        </div>
      </section>
    </main>
  );
}
