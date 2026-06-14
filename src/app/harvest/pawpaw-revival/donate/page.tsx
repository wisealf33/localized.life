import Link from "next/link";
import type { Metadata } from "next";
import { PawpawCryptoWallets } from "@/components/PawpawCryptoWallets";
import { SiteHeader } from "@/components/SiteHeader";
import { pawpawBridgeBucksUrl } from "@/data/pawpaw-revival";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Donate to Paw Paw Revival",
  description:
    "Choose a payment method to support Paw Paw Revival, the Localized.life Harvest fundraiser for pawpaw seeds and trees.",
  path: "/harvest/pawpaw-revival/donate",
  image: "/harvest/pawpaw-hero.jpg",
});

export default function PawpawDonationPage() {
  return (
    <main className="harvest-page pawpaw-page">
      <div className="harvest-header-wrap">
        <SiteHeader active="harvest" product="Harvest" />
      </div>

      <section className="pawpaw-payment-hero">
        <p className="harvest-eyebrow">Paw Paw Revival payment</p>
        <h1>Donate to plant pawpaws.</h1>
        <p>
          Choose the payment method that works best for you. $5 sponsors a pawpaw seed start and $25 sponsors a small
          pawpaw tree, but any amount helps move the revival forward.
        </p>
        <Link className="button harvest-secondary" href="/harvest/pawpaw-revival">
          Back to fundraiser
        </Link>
      </section>

      <section className="pawpaw-payment-options">
        <article className="pawpaw-payment-card">
          <span className="harvest-type">Card or standard checkout</span>
          <h2>Pay through BridgeBucks</h2>
          <p>Use the current BridgeBucks fundraiser checkout for non-crypto contributions.</p>
          <a className="button harvest-primary" href={pawpawBridgeBucksUrl} rel="noopener noreferrer" target="_blank">
            Continue to BridgeBucks
          </a>
        </article>

        <article className="pawpaw-payment-card">
          <span className="harvest-type">Crypto checkout</span>
          <h2>Use a Paw Paw Revival wallet</h2>
          <p>
            Pick the matching chain below and copy the project receive address generated through AI Wallet Manager.
          </p>
          <a className="button harvest-primary" href="#crypto-wallets">
            View crypto wallets
          </a>
        </article>
      </section>

      <section className="pawpaw-crypto" id="crypto-wallets">
        <div className="harvest-section-intro">
          <p className="harvest-eyebrow">Crypto wallet options</p>
          <h2>Send only on the matching chain.</h2>
          <p>
            These are public receiving addresses for the Pawpaw Revival project. Private keys stay in the local AI
            Wallet Manager.
          </p>
        </div>
        <PawpawCryptoWallets />
      </section>
    </main>
  );
}
