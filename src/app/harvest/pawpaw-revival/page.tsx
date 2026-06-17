import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Paw Paw Revival",
  description:
    "Paw Paw Revival is the first Localized.life Harvest fundraiser, helping plant pawpaw seeds and small trees across America.",
  path: "/harvest/pawpaw-revival",
  image: "/harvest/pawpaw-hero.jpg",
});

const givingLevels = [
  { name: "Seed Start", amount: "$5", detail: "plants one pawpaw seed" },
  { name: "Young Tree", amount: "$25", detail: "plants one small pawpaw tree" },
  { name: "Pawpaw Pair", amount: "$50", detail: "plants two small pawpaw trees" },
  { name: "Small Patch", amount: "$100", detail: "plants four small pawpaw trees" },
  { name: "Grove Builder", amount: "$250", detail: "plants ten small pawpaw trees" },
  { name: "Revival Acre", amount: "$1,000", detail: "plants forty small pawpaw trees" },
];

export default function PawpawRevivalPage() {
  return (
    <main className="harvest-page pawpaw-page">
      <div className="harvest-header-wrap">
        <SiteHeader active="harvest" product="Harvest" />
      </div>

      <section className="pawpaw-hero">
        <Image
          src="/harvest/pawpaw-hero.jpg"
          alt="Pawpaw leaves and fruit growing on a tree"
          fill
          priority
          sizes="100vw"
        />
        <div className="pawpaw-hero-copy">
          <p className="harvest-eyebrow">First Harvest fundraiser</p>
          <h1>Paw Paw Revival</h1>
          <p>
            Help revive the pawpaw across America by sponsoring seeds, small trees, and future registered harvest trees
            inside the Localized.life Harvest network.
          </p>
          <div className="toolbar">
            <Link className="button harvest-primary" href="/harvest/pawpaw-revival/donate">
              Donate to plant pawpaws
            </Link>
            <Link className="button harvest-secondary" href="/harvest">
              Back to Harvest
            </Link>
          </div>
        </div>
      </section>

      <section className="pawpaw-intro">
        <div>
          <p className="harvest-eyebrow">The mission</p>
          <h2>One million pawpaw trees, rooted through local action.</h2>
        </div>
        <p>
          Pawpaws are native fruit trees with deep roots in American landscapes. This campaign starts simple: sponsor
          seeds and small trees now, then connect planted trees into the Harvest registry as the network grows.
        </p>
      </section>

      <section className="pawpaw-levels" id="fund">
        <div className="harvest-list-header">
          <div>
            <p className="harvest-eyebrow">Sponsor examples</p>
            <h2>Pick any amount. These levels show the impact.</h2>
          </div>
          <Link className="button harvest-primary" href="/harvest/pawpaw-revival/donate">
            Donate to plant pawpaws
          </Link>
        </div>
        <div className="pawpaw-level-list" aria-label="Paw Paw Revival sponsor examples">
          {givingLevels.map((level) => (
            <div className="pawpaw-level-row" key={level.name}>
              <span>{level.name}</span>
              <strong>{level.amount}</strong>
              <p>{level.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pawpaw-donate-strip">
        <div>
          <p className="harvest-eyebrow">Ready to help?</p>
          <h2>Plant a seed, a tree, a pair, or a small pawpaw patch.</h2>
        </div>
        <Link className="button harvest-primary" href="/harvest/pawpaw-revival/donate">
          Donate to the fundraiser
        </Link>
      </section>
    </main>
  );
}
