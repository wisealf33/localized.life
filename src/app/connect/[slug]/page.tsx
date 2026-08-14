import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ConnectorSessionLink } from "@/components/ConnectorSessionLink";
import { SiteHeader } from "@/components/SiteHeader";
import { startConnectorRelationship } from "@/lib/connectorActions";
import { getConnectorProfileBySlug } from "@/lib/connectorData";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ connected?: string; invite?: string; error?: string }>;
};

export const metadata: Metadata = {
  title: "Connect with Garrett",
  description: "A personal way to reconnect with your Localized.life Connector when you need something.",
  robots: { index: false, follow: false },
};

export default async function PublicConnectorPage({ params, searchParams }: Props) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const connector = await getConnectorProfileBySlug(slug);
  if (!connector) notFound();

  return (
    <main className="page connector-page connector-public-page">
      <SiteHeader product="Connector" />
      <section className="connector-public-hero">
        <div>
          <p className="eyebrow">Your local Connector</p>
          <h1>{connector.display_name}</h1>
          <p className="connector-headline">{connector.headline}</p>
          <p className="lede">{connector.intro}</p>
        </div>
        <div className="connector-promise-card">
          <p>Save this page.</p>
          <strong>If you need something, come back here and tell me what is going on.</strong>
        </div>
      </section>

      <ConnectorSessionLink />

      {query.connected ? (
        <section className="notice good stack connector-connected-notice">
          <h2>You&apos;re connected with {connector.display_name}</h2>
          {query.invite === "sent" ? (
            <p>Check your email for your private Localized.life access link.</p>
          ) : (
            <p>Your relationship was saved. {connector.display_name} can send your account-access link directly.</p>
          )}
          <a className="button primary compact-button" href="/account">
            Open your account
          </a>
        </section>
      ) : (
        <section className="panel connector-start-panel" id="connect">
          <div className="connector-start-copy">
            <p className="eyebrow">Start the relationship</p>
            <h2>Stay connected with {connector.display_name}</h2>
            <p className="muted">
              This is not a generic service lead form. It creates your personal Localized.life connection so you can
              return whenever you need help, information, or the right introduction.
            </p>
          </div>
          {query.error ? (
            <p className="notice bad" role="alert">
              We could not finish the connection yet. Check the required fields and try again.
            </p>
          ) : null}
          <form action={startConnectorRelationship} className="form connector-start-form">
            <input type="hidden" name="connector_slug" value={connector.slug} />
            <label className="connector-honeypot" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <div className="grid two">
              <label>
                Your name
                <input name="display_name" required autoComplete="name" placeholder="First name or the name you use" />
              </label>
              <label>
                Email
                <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
              </label>
            </div>
            <div className="grid two">
              <label>
                Phone, optional
                <input name="phone" type="tel" autoComplete="tel" placeholder="Best number for a call or text" />
              </label>
              <label>
                Town, optional
                <input name="town" autoComplete="address-level2" placeholder="Peotone" />
              </label>
            </div>
            <input type="hidden" name="state" value="IL" />
            <label>
              How do we know each other? <span className="muted">Optional</span>
              <input name="how_met" placeholder="Met during storm cleanup, Facebook, local work..." />
            </label>
            <label>
              Household name <span className="muted">Optional</span>
              <input name="household_name" placeholder="The Smith household, our family, 123 Main..." />
            </label>
            <button className="button primary" type="submit">
              Connect with {connector.display_name}
            </button>
            <p className="muted connector-form-footnote">
              Your contact details stay private and are used for this Connector relationship and account access.
            </p>
          </form>
        </section>
      )}

      <section className="grid three connector-how-grid" aria-label="How the Connector relationship works">
        <article className="card">
          <span className="connector-step">1</span>
          <h2>Tell me the need</h2>
          <p className="muted">It can be practical work, information, transportation, a referral, or something unexpected.</p>
        </article>
        <article className="card">
          <span className="connector-step">2</span>
          <h2>We figure it out</h2>
          <p className="muted">I may help directly, clarify the next step, schedule something, or find the right person.</p>
        </article>
        <article className="card">
          <span className="connector-step">3</span>
          <h2>The relationship continues</h2>
          <p className="muted">Your dashboard keeps current needs and a simple history so you always have a way back.</p>
        </article>
      </section>
    </main>
  );
}
