import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { adminLogin, adminLogout, isAdminAuthenticated } from "@/lib/admin";
import { addConnectorPerson } from "@/lib/connectorActions";
import { getConnectorAdminOverview } from "@/lib/connectorData";

type Props = {
  searchParams: Promise<{
    auth?: string;
    added?: string;
    invite?: string;
    error?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Connector admin",
  robots: { index: false, follow: false },
};

function formatDate(value: string | null) {
  if (!value) return "No activity yet";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

function statusLabel(status: string) {
  return status === "working"
    ? "Working on it"
    : status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function ConnectorAdminPage({ searchParams }: Props) {
  const query = await searchParams;
  const authenticated = await isAdminAuthenticated();

  if (!authenticated) {
    return (
      <main className="page narrow connector-page">
        <SiteHeader product="Project hub" />
        <section className="hero compact-hero connector-dashboard-hero">
          <p className="eyebrow">Private Connector tools</p>
          <h1>Connector admin</h1>
          <p className="lede">Use the existing Localized.life admin password to manage people and needs.</p>
        </section>
        <section className="panel">
          {query.auth ? <p className="notice bad">Your admin session expired. Sign in again.</p> : null}
          <form action={adminLogin} className="form">
            <input type="hidden" name="return_path" value="/connector/admin" />
            <label>
              Admin password
              <input name="admin_password" type="password" required autoComplete="current-password" />
            </label>
            <button className="button primary" type="submit">
              Open Connector tools
            </button>
          </form>
        </section>
      </main>
    );
  }

  const overview = await getConnectorAdminOverview("garrett");

  return (
    <main className="page connector-page connector-admin-page">
      <SiteHeader product="Project hub" />
      <section className="connector-admin-heading">
        <div>
          <p className="eyebrow">Private operator view</p>
          <h1>{overview?.connector.display_name || "Connector"} dashboard</h1>
          <p className="lede">Add people quickly, see open needs, follow up, and keep the relationship history useful.</p>
        </div>
        <div className="toolbar">
          <Link className="button" href="/connect/garrett">
            Public reconnect page
          </Link>
          <form action={adminLogout}>
            <input type="hidden" name="return_path" value="/connector/admin" />
            <button className="button" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </section>

      {!overview ? (
        <section className="notice bad stack">
          <h2>Connector database setup is not available yet</h2>
          <p>Apply the Connector MVP migration, then reload this page.</p>
        </section>
      ) : (
        <>
          {query.added ? (
            <p className="notice good">
              Person connected.
              {query.invite === "sent"
                ? " Their private account link was emailed."
                : query.invite === "setup"
                  ? " Email is not configured, so the invite still needs to be sent."
                  : " No invite was requested yet."}
            </p>
          ) : null}
          {query.error ? <p className="notice bad">The person could not be added. Check the fields and try again.</p> : null}

          <section className="connector-admin-stats" aria-label="Connector summary">
            <div>
              <strong>{overview.people.length}</strong>
              <span>{overview.people.length === 1 ? "person" : "people"}</span>
            </div>
            <div>
              <strong>{overview.needs.filter((need) => ["new", "working", "scheduled"].includes(need.status)).length}</strong>
              <span>open needs</span>
            </div>
            <div>
              <strong>{overview.needs.filter((need) => need.status === "completed").length}</strong>
              <span>completed</span>
            </div>
          </section>

          <section className="panel connector-add-person" id="add-person">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Fast phone entry</p>
                <h2>Add a person</h2>
                <p className="muted">Only a name is required. Add an email when you are ready to invite them.</p>
              </div>
            </div>
            <form action={addConnectorPerson} className="form connector-quick-add-form">
              <div className="grid two">
                <label>
                  Name
                  <input name="display_name" required autoComplete="name" placeholder="Person's name" />
                </label>
                <label>
                  Phone
                  <input name="phone" type="tel" autoComplete="tel" placeholder="Optional" />
                </label>
              </div>
              <div className="grid two">
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" placeholder="Optional until invite" />
                </label>
                <label>
                  Town
                  <input name="town" defaultValue="Peotone" autoComplete="address-level2" />
                </label>
              </div>
              <input type="hidden" name="state" value="IL" />
              <label>
                How we met
                <input name="how_met" placeholder="Storm cleanup, word of mouth, Facebook, local work..." />
              </label>
              <label>
                Household name, optional
                <input name="household_name" placeholder="Create a simple household and make this person its manager" />
              </label>
              <label>
                Private note, optional
                <textarea name="private_notes" rows={3} placeholder="One useful reminder—not a giant CRM record." />
              </label>
              <label className="checkbox-row connector-invite-check">
                <input name="send_invite" type="checkbox" defaultChecked />
                Email their private Localized.life access link when an email is provided
              </label>
              <button className="button primary" type="submit">
                Add person and connect them to me
              </button>
            </form>
          </section>

          <section className="connector-dashboard-section" id="open-needs">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Work queue</p>
                <h2>Open needs</h2>
              </div>
            </div>
            {overview.needs.some((need) => ["new", "working", "scheduled"].includes(need.status)) ? (
              <div className="connector-need-list connector-admin-need-list">
                {overview.needs
                  .filter((need) => ["new", "working", "scheduled"].includes(need.status))
                  .map((need) => {
                    const person = overview.people.find((entry) => entry.id === need.requester_person_id);
                    return (
                      <article className="card connector-need-card" key={need.id}>
                        <div className="connector-need-card-top">
                          <div>
                            <p className="eyebrow">{person?.display_name || "Connected person"}</p>
                            <h3>{need.title}</h3>
                          </div>
                          <span className={`connector-status connector-status-${need.status}`}>{statusLabel(need.status)}</span>
                        </div>
                        {need.details ? <p>{need.details}</p> : null}
                        <p className="muted">Received {formatDate(need.created_at)}</p>
                        {person ? (
                          <Link className="button primary compact-button" href={`/connector/admin/people/${person.id}#needs`}>
                            Open person and need
                          </Link>
                        ) : null}
                      </article>
                    );
                  })}
              </div>
            ) : (
              <div className="empty connector-empty">
                <h3>No open needs</h3>
                <p>New member requests will appear here.</p>
              </div>
            )}
          </section>

          <section className="connector-dashboard-section" id="my-people">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Relationships</p>
                <h2>My people</h2>
              </div>
            </div>
            {overview.people.length ? (
              <div className="connector-people-grid">
                {overview.people.map((person) => (
                  <article className="card connector-person-card" key={person.id}>
                    <div>
                      <h3>{person.display_name}</h3>
                      <p className="muted">
                        {person.household?.name || [person.town, person.state].filter(Boolean).join(", ") || "Location not added"}
                      </p>
                    </div>
                    <div className="connector-person-summary">
                      <span>{person.openNeeds} open {person.openNeeds === 1 ? "need" : "needs"}</span>
                      <span>Last activity: {formatDate(person.lastInteraction || person.updated_at)}</span>
                    </div>
                    <Link className="button primary compact-button" href={`/connector/admin/people/${person.id}`}>
                      Open contact record
                    </Link>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty connector-empty">
                <h3>No one connected yet</h3>
                <p>Add the first person above or share the public reconnect page.</p>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
