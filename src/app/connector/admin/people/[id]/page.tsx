import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { requireAdmin } from "@/lib/admin";
import {
  addConnectorInteraction,
  addNeedAsConnector,
  resendConnectorInvite,
  updateConnectorPerson,
  updateNeedAsConnector,
} from "@/lib/connectorActions";
import { getConnectorPersonDetail } from "@/lib/connectorData";
import type { NeedStatus } from "@/lib/connectorTypes";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    invite?: string;
    need?: string;
    interaction?: string;
    person?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Connector contact record",
  robots: { index: false, follow: false },
};

const statuses: Array<{ value: NeedStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "working", label: "Working on it" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "closed", label: "Closed" },
];

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function dateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default async function ConnectorPersonPage({ params, searchParams }: Props) {
  await requireAdmin("/connector/admin");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const detail = await getConnectorPersonDetail("garrett", id);
  if (!detail) notFound();

  const householdById = new Map(detail.households.map((household) => [household.id, household]));
  const householdOptions = detail.memberships.map((membership) => ({
    ...membership,
    household: householdById.get(membership.household_id),
  }));

  return (
    <main className="page connector-page connector-person-page">
      <SiteHeader product="Project hub" />
      <div className="connector-record-nav">
        <Link className="back-link" href="/connector/admin#my-people">
          ← Back to Connector dashboard
        </Link>
      </div>
      <section className="connector-record-heading">
        <div>
          <p className="eyebrow">Connected person</p>
          <h1>{detail.person.display_name}</h1>
          <p className="lede">
            {[detail.person.town, detail.person.state].filter(Boolean).join(", ") || "Location not added"}
          </p>
        </div>
        <div className="connector-record-contact">
          {detail.person.phone ? <a href={`tel:${detail.person.phone}`}>{detail.person.phone}</a> : <span>No phone</span>}
          {detail.person.email ? <a href={`mailto:${detail.person.email}`}>{detail.person.email}</a> : <span>No email</span>}
        </div>
      </section>

      {query.invite === "sent" ? <p className="notice good">Private account access link emailed.</p> : null}
      {query.invite === "setup" ? <p className="notice bad">The access link was created, but email is not configured.</p> : null}
      {query.invite === "missing" ? <p className="notice bad">Add an email address before sending an invite.</p> : null}
      {query.need ? <p className="notice good">Need {query.need}.</p> : null}
      {query.interaction ? <p className="notice good">History note added.</p> : null}
      {query.person ? <p className="notice good">Contact record updated.</p> : null}

      <section className="grid two connector-record-grid">
        <article className="panel">
          <p className="eyebrow">Relationship</p>
          <h2>{detail.connector.display_name} is the Connector</h2>
          <dl className="connector-details-list">
            <div>
              <dt>Connected since</dt>
              <dd>{formatDate(detail.relationship.started_at)}</dd>
            </div>
            <div>
              <dt>How we met</dt>
              <dd>{detail.person.how_met || "Not recorded"}</dd>
            </div>
            <div>
              <dt>Household</dt>
              <dd>{detail.households.map((household) => household.name || "Household").join(", ") || "None"}</dd>
            </div>
            <div>
              <dt>Account</dt>
              <dd>{detail.person.auth_user_id ? "Account linked" : "Not linked yet"}</dd>
            </div>
          </dl>
          {detail.person.email ? (
            <form action={resendConnectorInvite}>
              <input type="hidden" name="person_id" value={detail.person.id} />
              <button className="button compact-button" type="submit">
                Email account access link
              </button>
            </form>
          ) : null}
        </article>

        <article className="panel">
          <p className="eyebrow">Contact record</p>
          <h2>Basic details and private notes</h2>
          <form action={updateConnectorPerson} className="form connector-record-form">
            <input type="hidden" name="person_id" value={detail.person.id} />
            <label>
              Name
              <input name="display_name" required defaultValue={detail.person.display_name} />
            </label>
            <div className="grid two">
              <label>
                Phone
                <input name="phone" type="tel" defaultValue={detail.person.phone || ""} />
              </label>
              <label>
                Email
                <input name="email" type="email" defaultValue={detail.person.email || ""} />
              </label>
            </div>
            <div className="grid two">
              <label>
                Town
                <input name="town" defaultValue={detail.person.town || ""} />
              </label>
              <label>
                State
                <input name="state" maxLength={2} defaultValue={detail.person.state || "IL"} />
              </label>
            </div>
            <label>
              How we met
              <input name="how_met" defaultValue={detail.person.how_met || ""} />
            </label>
            <label>
              Abilities, optional
              <input name="abilities" defaultValue={detail.person.abilities || ""} placeholder="Mowing, hauling, drywall..." />
            </label>
            <label>
              Private notes
              <textarea name="private_notes" rows={4} defaultValue={detail.person.private_notes || ""} />
            </label>
            <button className="button" type="submit">
              Save contact record
            </button>
          </form>
        </article>
      </section>

      <section className="connector-dashboard-section" id="needs">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Needs</p>
            <h2>Things we&apos;re working on</h2>
          </div>
        </div>
        <div className="connector-admin-needs-layout">
          <div className="connector-need-list">
            {detail.needs.length ? (
              detail.needs.map((need) => (
                <article className="card connector-need-card" key={need.id}>
                  <div className="connector-need-card-top">
                    <h3>{need.title}</h3>
                    <span className={`connector-status connector-status-${need.status}`}>
                      {statuses.find((status) => status.value === need.status)?.label}
                    </span>
                  </div>
                  {need.details ? <p>{need.details}</p> : null}
                  <form action={updateNeedAsConnector} className="form connector-need-update-form">
                    <input type="hidden" name="need_id" value={need.id} />
                    <input type="hidden" name="person_id" value={detail.person.id} />
                    <div className="grid two">
                      <label>
                        Status
                        <select name="status" defaultValue={need.status}>
                          {statuses.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Scheduled time
                        <input name="scheduled_for" type="datetime-local" defaultValue={dateTimeInput(need.scheduled_for)} />
                      </label>
                    </div>
                    <label>
                      Connector notes
                      <textarea name="connector_notes" rows={3} defaultValue={need.connector_notes || ""} placeholder="Private working note" />
                    </label>
                    <button className="button compact-button" type="submit">
                      Update need
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <div className="empty connector-empty">
                <h3>No needs yet</h3>
                <p>Add one here or let the member submit it from their dashboard.</p>
              </div>
            )}
          </div>

          <aside className="panel connector-add-need-panel">
            <p className="eyebrow">Connector entry</p>
            <h2>Add a need</h2>
            <form action={addNeedAsConnector} className="form">
              <input type="hidden" name="person_id" value={detail.person.id} />
              <label>
                Short title
                <input name="title" required maxLength={160} placeholder="Fence repair, branches removed..." />
              </label>
              <label>
                Details
                <textarea name="details" rows={4} />
              </label>
              {householdOptions.length ? (
                <label>
                  For
                  <select name="household_id" defaultValue="">
                    <option value="">{detail.person.display_name}</option>
                    {householdOptions.map(({ household, household_id: householdId }) => (
                      <option key={householdId} value={householdId}>
                        {household?.name || "Household"}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label>
                Schedule, optional
                <input name="scheduled_for" type="datetime-local" />
              </label>
              <button className="button primary" type="submit">
                Add need
              </button>
            </form>
          </aside>
        </div>
      </section>

      <section className="connector-dashboard-section" id="history">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Simple history</p>
            <h2>Interactions and follow-up</h2>
          </div>
        </div>
        <div className="connector-history-layout">
          <div className="connector-history-list">
            {detail.interactions.length ? (
              detail.interactions.map((interaction) => {
                const need = detail.needs.find((entry) => entry.id === interaction.need_id);
                return (
                  <article className="connector-history-item" key={interaction.id}>
                    <time dateTime={interaction.occurred_at}>{formatDate(interaction.occurred_at, true)}</time>
                    <p>{interaction.note}</p>
                    {need ? <span>Related to: {need.title}</span> : null}
                  </article>
                );
              })
            ) : (
              <p className="muted">No dated notes yet.</p>
            )}
          </div>
          <form action={addConnectorInteraction} className="panel form connector-history-form">
            <input type="hidden" name="person_id" value={detail.person.id} />
            <p className="eyebrow">Add a note</p>
            <label>
              What happened?
              <textarea name="note" rows={4} required placeholder="Called about fence repair, introduced to Mike, followed up..." />
            </label>
            {detail.needs.length ? (
              <label>
                Related need, optional
                <select name="need_id" defaultValue="">
                  <option value="">General relationship note</option>
                  {detail.needs.map((need) => (
                    <option key={need.id} value={need.id}>
                      {need.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button className="button" type="submit">
              Add history note
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
