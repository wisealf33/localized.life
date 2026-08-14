import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { getActiveConnectorProfiles } from "@/lib/connectorData";

export const metadata: Metadata = {
  title: "Local Connectors",
  description: "Find a Localized.life Connector and keep a trusted local relationship for practical needs and introductions.",
};

export const revalidate = 300;

export default async function ConnectorFrontDoorPage() {
  const connectors = await getActiveConnectorProfiles();

  return (
    <main className="page connector-page">
      <SiteHeader product="Connector" />
      <section className="hero connector-dashboard-hero">
        <p className="eyebrow">Useful local relationships</p>
        <h1>Find your Connector</h1>
        <p className="lede">
          A Connector is a real local person you can return to when you need practical help, information, or the right
          introduction.
        </p>
        <div className="toolbar">
          <Link className="button primary" href="/account">
            Open my account
          </Link>
        </div>
      </section>

      <section className="connector-dashboard-section" aria-labelledby="available-connectors">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Available now</p>
            <h2 id="available-connectors">Local Connectors</h2>
            <p className="muted">Choose the person you know or want to begin a local relationship with.</p>
          </div>
        </div>
        {connectors.length ? (
          <div className="connector-people-grid">
            {connectors.map((connector) => (
              <article className="card connector-person-card" key={connector.person_id}>
                <div>
                  <p className="eyebrow">Local Connector</p>
                  <h3>{connector.display_name}</h3>
                  <p className="connector-headline">{connector.headline}</p>
                  <p className="muted">{connector.intro}</p>
                </div>
                <Link className="button primary" href={`/connect/${connector.slug}`}>
                  Connect with {connector.display_name}
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty connector-empty">
            <h2>Connector pages are being prepared</h2>
            <p>Check back soon for the first local Connector.</p>
          </div>
        )}
      </section>
    </main>
  );
}
