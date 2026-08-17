import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Local Connections",
  description: "Ask Localized.life for practical local help, information, or an introduction.",
};

export default function ConnectorFrontDoorPage() {
  return (
    <main className="page connector-page">
      <SiteHeader product="Connector" />
      <section className="hero connector-dashboard-hero">
        <p className="eyebrow">A local introduction when you need one</p>
        <h1>Tell us what kind of connection would help.</h1>
        <p className="lede">
          Localized.life can help arrange practical local help, information, or the right introduction without asking
          you to choose from a public list of people.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/local-services">
            Ask for local help
          </Link>
          <Link className="button" href="/account">
            Open my account
          </Link>
        </div>
      </section>

      <section className="panel stack connector-dashboard-section" aria-labelledby="connection-process">
        <div className="section-heading">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 id="connection-process">We make the introduction privately.</h2>
            <p className="muted">
              Share what you need, and Localized.life decides who may be appropriate to contact. If someone sent you
              their direct Connector link, you can still use that link to reach their specific page.
            </p>
          </div>
        </div>
        <ol className="connector-intro-steps">
          <li>Describe the kind of help, information, or introduction you need.</li>
          <li>We review the request and decide who may be the right fit.</li>
          <li>You choose whether to continue once the next step is clear.</li>
        </ol>
      </section>
    </main>
  );
}
