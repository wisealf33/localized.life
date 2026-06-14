import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { PawpawCryptoWallets } from "@/components/PawpawCryptoWallets";
import { SiteHeader } from "@/components/SiteHeader";
import { pawpawBridgeBucksUrl, pawpawUpdates } from "@/data/pawpaw-revival";
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

const videoPlaceholders = [
  "Why pawpaws matter",
  "How sponsored trees become future harvest sites",
  "Planting updates from the field",
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
            <a className="button harvest-primary" href="#fund">
              Fund pawpaw planting
            </a>
            <a className="button harvest-secondary" href="#crypto-fundraiser">
              Crypto fundraiser
            </a>
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
          <a className="button harvest-primary" href={pawpawBridgeBucksUrl} rel="noopener noreferrer" target="_blank">
            Sponsor through BridgeBucks
          </a>
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

      <section className="pawpaw-updates">
        <div className="harvest-section-intro">
          <p className="harvest-eyebrow">Updates</p>
          <h2>Campaign notes, field updates, and planting progress.</h2>
        </div>
        <div className="pawpaw-update-grid">
          {pawpawUpdates.map((update) => (
            <article className="harvest-plant-card" key={update.title}>
              <span className="harvest-type">{update.date}</span>
              <h3>{update.title}</h3>
              <p>{update.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="pawpaw-videos">
        <div>
          <p className="harvest-eyebrow">Videos</p>
          <h2>Room for campaign videos as the revival grows.</h2>
        </div>
        <div className="pawpaw-video-grid">
          {videoPlaceholders.map((title) => (
            <article className="pawpaw-video-card" key={title}>
              <span>{title}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="pawpaw-crypto" id="crypto-fundraiser">
        <div className="harvest-section-intro">
          <p className="harvest-eyebrow">Crypto fundraiser</p>
          <h2>Use the Pawpaw Revival receive wallets from AI Wallet Manager.</h2>
          <p>
            These are public receiving addresses generated for the Pawpaw Revival project. Send only on the matching
            chain shown on each card.
          </p>
        </div>
        <PawpawCryptoWallets />
      </section>
    </main>
  );
}
