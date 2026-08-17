"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AccountSignIn } from "./AccountSignIn";
import { PersonProfileFields, type PersonProfileValue } from "./PersonProfileFields";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type PersonSummary = PersonProfileValue & {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
  claim_status: "claimed" | "unclaimed";
  openNeeds: number;
};

type NeedRecord = {
  id: string;
  requester_person_id: string;
  title: string;
  details: string;
  status: string;
  scheduled_for: string | null;
  completed_at?: string | null;
  amount_cents: number | null;
  connector_notes?: string | null;
  created_at: string;
};

type Overview = {
  actor: { id: string; displayName: string };
  connector: { slug: string; display_name: string };
  people: PersonSummary[];
  needs: NeedRecord[];
  referralIntake: {
    canAssign: boolean;
    unassigned: Array<{
      id: string;
      display_name: string;
      email: string | null;
      phone: string | null;
      town: string | null;
      state: string | null;
      claim_status: "claimed" | "unclaimed";
      created_at: string;
    }>;
    referrerOptions: Array<{ id: string; display_name: string; role: string }>;
  };
};

type PersonDetail = Overview & {
  person: PersonSummary & {
    how_met: string | null;
    private_notes: string | null;
    abilities: string | null;
    created_at: string;
    claimed_at: string | null;
  };
  relationship: { started_at: string };
  interactions: Array<{
    id: string;
    note: string;
    visibility: "private" | "shared";
    need_id: string | null;
    occurred_at: string;
  }>;
  households: Array<{ id: string; name: string | null }>;
  activeInvitation: { url: string } | null;
};

function date(value: string | null | undefined, withTime = false) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function dollars(cents: number | null) {
  return cents === null ? "" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function localDateTime(value: string | null) {
  if (!value) return "";
  const dateValue = new Date(value);
  return new Date(dateValue.getTime() - dateValue.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

async function accessToken() {
  const { data } = (await getSupabaseBrowser()?.auth.getSession()) || { data: { session: null } };
  return data.session?.access_token || "";
}

export function MyConnections({ personId }: { personId?: string }) {
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [data, setData] = useState<Overview | PersonDetail | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState("");
  const [invitationPersonId, setInvitationPersonId] = useState("");
  const [invitationPersonName, setInvitationPersonName] = useState("");

  const load = useCallback(async () => {
    const token = await accessToken();
    if (!token) {
      setAuthState("signed-out");
      setData(null);
      return;
    }
    const query = personId ? `?person_id=${encodeURIComponent(personId)}` : "";
    const response = await fetch(`/api/connections${query}`, { headers: { Authorization: `Bearer ${token}` } });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error || "Could not open My Connections.");
      setAuthState(response.status === 401 ? "signed-out" : "signed-in");
      return;
    }
    setData(payload);
    setAuthState("signed-in");
  }, [personId]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      const unavailableTimer = window.setTimeout(() => setAuthState("signed-out"), 0);
      return () => window.clearTimeout(unavailableTimer);
    }
    const timer = window.setTimeout(() => void load(), 0);
    const { data: listener } = supabase.auth.onAuthStateChange(() => window.setTimeout(() => void load(), 0));
    return () => {
      window.clearTimeout(timer);
      listener.subscription.unsubscribe();
    };
  }, [load]);

  useEffect(() => {
    if (!invitationUrl) return;
    const timer = window.setTimeout(() => {
      document.getElementById("ready-invitation")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [invitationUrl]);

  async function post(body: Record<string, unknown>) {
    const token = await accessToken();
    const response = await fetch("/api/connections", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Could not save that change.");
    return payload;
  }

  async function submit(event: FormEvent<HTMLFormElement>, action: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form));
    setBusy(true);
    setMessage("");
    try {
      const result = await post({ action, ...values, ...(personId ? { personId } : {}) });
      if (result.invitation?.url) {
        setInvitationUrl(result.invitation.url);
        setInvitationPersonId(result.personId || personId || "");
        setInvitationPersonName(String(values.displayName || [values.firstName, values.lastName].filter(Boolean).join(" ") || "This Person"));
      }
      if (action === "add-person") {
        setMessage("Person saved, connected to you, and ready to invite now.");
        form.reset();
      } else if (action === "assign-referrer") {
        setMessage("Referral assigned.");
      } else {
        setMessage("Saved.");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save that change.");
    } finally {
      setBusy(false);
    }
  }

  async function invitationAction(
    action: "generate-invite" | "revoke-invite",
    targetPersonId = personId || invitationPersonId,
    targetPersonName = invitationPersonName,
  ) {
    if (!targetPersonId) return;
    setBusy(true);
    try {
      const result = await post({ action, personId: targetPersonId });
      setInvitationUrl(result.invitation?.url || "");
      setInvitationPersonId(targetPersonId);
      setInvitationPersonName(targetPersonName);
      setMessage(
        action === "revoke-invite"
          ? "Invitation revoked."
          : result.invitation?.replaced
            ? "The old invitation was disabled and a new private link is ready."
            : "Private invitation link ready.",
      );
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the invitation.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation(url = invitationUrl) {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage("Invitation link copied.");
  }

  async function shareInvitation(name: string, url = invitationUrl) {
    if (!url) return;
    if (navigator.share) {
      await navigator.share({ title: "Your Localized.life profile", text: `${name}, claim the profile I started for you:`, url });
    } else {
      await copyInvitation(url);
    }
  }

  async function replaceInvitation(targetPersonId: string, targetPersonName: string) {
    const confirmed = window.confirm(
      "Replacing this link immediately disables the old one. Only continue if the old link was exposed or should no longer work.",
    );
    if (!confirmed) return;
    await invitationAction("generate-invite", targetPersonId, targetPersonName);
  }

  async function revokeInvitation(targetPersonId: string, targetPersonName: string) {
    const confirmed = window.confirm("Revoke this invitation? The current link will stop working immediately.");
    if (!confirmed) return;
    await invitationAction("revoke-invite", targetPersonId, targetPersonName);
  }

  async function signOut() {
    await getSupabaseBrowser()?.auth.signOut();
  }

  if (authState === "loading") return <div className="panel connector-loading">Opening My Connections…</div>;
  if (authState === "signed-out") return <AccountSignIn title="Open My Connections" returnTo={personId ? `/connections/${personId}` : "/connections"} />;
  if (!data) return <p className="notice bad">{message || "My Connections could not be loaded."}</p>;

  if (personId && "person" in data) {
    const detail = data as PersonDetail;
    const person = detail.person;
    const activeInvitationUrl = invitationUrl || detail.activeInvitation?.url || "";
    return (
      <div className="connector-member-shell">
        <Link className="back-link" href="/connections">← My Connections</Link>
        <section className="connector-record-heading">
          <div>
            <p className="eyebrow">Person record</p>
            <h1>{person.display_name}</h1>
            <p className="lede">{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p>
          </div>
          <div className="connector-record-contact">
            {person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : <span>No phone</span>}
            {person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : <span>No email</span>}
          </div>
        </section>
        {message ? <p className="notice good">{message}</p> : null}

        <section className="grid two connector-record-grid">
          <article className="panel">
            <p className="eyebrow">Identity and invitation</p>
            <h2>{person.claim_status === "claimed" ? "Profile claimed" : "Unclaimed Person"}</h2>
            <dl className="connector-details-list">
              <div><dt>Created</dt><dd>{date(person.created_at)}</dd></div>
              <div><dt>Connected</dt><dd>{date(detail.relationship.started_at)}</dd></div>
              <div><dt>Claim status</dt><dd>{person.claim_status === "claimed" ? `Claimed ${date(person.claimed_at)}` : "Unclaimed"}</dd></div>
              <div><dt>How we met</dt><dd>{person.how_met || "Not recorded"}</dd></div>
            </dl>
            {person.claim_status === "unclaimed" ? (
              <div className="stack">
                {activeInvitationUrl ? (
                  <div className="connector-invite-result" id="person-invitation">
                    <label>Unclaimed Person link<input value={activeInvitationUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
                    <div className="toolbar">
                      <button className="button primary" type="button" onClick={() => copyInvitation(activeInvitationUrl)}>Copy link</button>
                      <button className="button" type="button" onClick={() => shareInvitation(person.display_name, activeInvitationUrl)}>Text or share</button>
                    </div>
                    <p className="muted connector-small-copy">Use this same private link whenever you message them. It stays active until they claim the profile or you deliberately disable it.</p>
                    <div className="connector-invite-security-actions">
                      <button className="text-button" type="button" disabled={busy} onClick={() => replaceInvitation(person.id, person.display_name)}>Replace compromised link</button>
                      <button className="text-button" type="button" disabled={busy} onClick={() => revokeInvitation(person.id, person.display_name)}>Revoke link</button>
                    </div>
                  </div>
                ) : <button className="button primary compact-button" type="button" disabled={busy} onClick={() => invitationAction("generate-invite")}>Create private invitation link</button>}
              </div>
            ) : <p className="notice good">This Person now uses their own normal Localized.life account.</p>}
          </article>

          <article className="panel connector-person-profile-panel">
            <p className="eyebrow">Private Connector record</p>
            <h2>Complete Person profile</h2>
            <form className="form" onSubmit={(event) => submit(event, "update-person")}>
              <PersonProfileFields person={person} intro="Record only information this person has shared with you. These details remain part of the same Person identity if they later claim their account." />
              <label>How we met<input name="howMet" defaultValue={person.how_met || ""} /></label>
              <label>Private Connector Notes<textarea name="privateNote" rows={4} defaultValue={person.private_notes || ""} /></label>
              <button className="button" type="submit" disabled={busy}>Save Person</button>
            </form>
          </article>
        </section>

        <section className="connector-dashboard-section" id="needs">
          <div className="section-heading"><div><p className="eyebrow">Person-first needs</p><h2>Needs and completed help</h2></div></div>
          <div className="connector-admin-needs-layout">
            <div className="connector-need-list">
              {detail.needs.length ? detail.needs.map((need) => (
                <article className="card connector-need-card" key={need.id}>
                  <div className="connector-need-card-top"><h3>{need.title}</h3><span className={`connector-status connector-status-${need.status}`}>{need.status}</span></div>
                  {need.details ? <p>{need.details}</p> : null}
                  {need.amount_cents !== null ? <strong>{dollars(need.amount_cents)}</strong> : null}
                  <form className="form connector-need-update-form" onSubmit={(event) => submit(event, "update-need")}>
                    <input type="hidden" name="needId" value={need.id} />
                    <div className="grid two"><label>Status<select name="status" defaultValue={need.status}><option value="new">New</option><option value="working">Working</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="closed">Closed</option></select></label><label>Amount, optional<input name="amount" type="number" min="0" step="0.01" defaultValue={need.amount_cents === null ? "" : need.amount_cents / 100} /></label></div>
                    <label>Scheduled time<input name="scheduledFor" type="datetime-local" defaultValue={localDateTime(need.scheduled_for)} /></label>
                    <label>Private Connector note<textarea name="connectorNotes" rows={2} defaultValue={need.connector_notes || ""} /></label>
                    <button className="button compact-button" type="submit" disabled={busy}>Update need</button>
                  </form>
                </article>
              )) : <div className="empty connector-empty"><h3>No Needs yet</h3><p>Add current help or record something already completed.</p></div>}
            </div>
            <form className="panel form connector-add-need-panel" onSubmit={(event) => submit(event, "add-need")}>
              <p className="eyebrow">Add a Need</p>
              <label>Title<input name="title" required placeholder="Storm cleanup" /></label>
              <label>Details<textarea name="details" rows={3} /></label>
              <div className="grid two"><label>Status<select name="status" defaultValue="new"><option value="new">New</option><option value="working">Working</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="closed">Closed</option></select></label><label>Amount, optional<input name="amount" type="number" min="0" step="0.01" placeholder="150.00" /></label></div>
              <label>Scheduled time<input name="scheduledFor" type="datetime-local" /></label>
              <label>Private Connector note<textarea name="connectorNotes" rows={2} /></label>
              <button className="button primary" type="submit" disabled={busy}>Add Need</button>
            </form>
          </div>
        </section>

        <section className="connector-dashboard-section" id="history">
          <div className="section-heading"><div><p className="eyebrow">History</p><h2>Private notes and shared activity</h2></div></div>
          <div className="connector-history-layout">
            <div className="connector-history-list">
              {detail.interactions.map((interaction) => <article className="connector-history-item" key={interaction.id}><time>{date(interaction.occurred_at, true)}</time><p>{interaction.note}</p><span>{interaction.visibility === "shared" ? "Shared with this Person" : "Private Connector Note"}</span></article>)}
              {!detail.interactions.length ? <p className="muted">No activity yet.</p> : null}
            </div>
            <form className="panel form connector-history-form" onSubmit={(event) => submit(event, "add-interaction")}>
              <p className="eyebrow">Add activity</p>
              <label>What happened?<textarea name="note" rows={4} required /></label>
              <label>Who can see it?<select name="visibility" defaultValue="private"><option value="private">Private Connector Note</option><option value="shared">Shared Activity / History</option></select></label>
              <button className="button" type="submit" disabled={busy}>Add activity</button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  const overview = data as Overview;
  const openNeeds = overview.needs.filter((need) => ["new", "working", "scheduled"].includes(need.status));
  return (
    <div className="connector-member-shell">
      <section className="connector-admin-heading">
        <div><p className="eyebrow">Signed in as {overview.actor.displayName}</p><h1>My Connections</h1><p className="lede">People first. Add someone as soon as you learn about them or their Need, invite them in person, and keep useful history over time.</p></div>
        <div className="toolbar"><Link className="button" href={`/connect/${overview.connector.slug}`}>Public Connector page</Link><button className="button" type="button" onClick={signOut}>Sign out</button></div>
      </section>
      {message ? <p className="notice good">{message}</p> : null}
      <section className="connector-admin-stats"><div><strong>{overview.people.length}</strong><span>connections</span></div><div><strong>{openNeeds.length}</strong><span>open Needs</span></div><div><strong>{overview.people.filter((person) => person.claim_status === "unclaimed").length}</strong><span>unclaimed</span></div></section>
      {overview.referralIntake.canAssign ? <section className="connector-dashboard-section" id="referral-intake">
        <div className="section-heading"><div><p className="eyebrow">Referral intake</p><h2>People waiting for a referrer</h2><p className="muted">Review each person and record the Connector or coordinator who brought them into the community.</p></div><span className="connector-referral-count">{overview.referralIntake.unassigned.length} waiting</span></div>
        {overview.referralIntake.unassigned.length ? <div className="connector-referral-list">{overview.referralIntake.unassigned.map((person) => <article className="card connector-referral-card" key={person.id}>
          <div><div className="connector-person-title"><h3>{person.display_name}</h3><span className={`connector-claim-badge ${person.claim_status}`}>{person.claim_status}</span></div><p className="muted">{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p><p className="connector-referral-contact">{person.phone || person.email || "Contact details not added"}</p><p className="muted connector-small-copy">Entered {date(person.created_at)}</p></div>
          <form className="connector-referral-form" onSubmit={(event) => submit(event, "assign-referrer")}>
            <input type="hidden" name="referredPersonId" value={person.id} />
            <label>Direct referrer<select name="referrerPersonId" required defaultValue=""><option value="" disabled>Choose a person</option>{overview.referralIntake.referrerOptions.map((referrer) => <option value={referrer.id} key={referrer.id}>{referrer.display_name} — {referrer.role}</option>)}</select></label>
            <button className="button primary compact-button" type="submit" disabled={busy}>Assign referral</button>
          </form>
        </article>)}</div> : <div className="empty connector-empty"><h3>No unassigned referrals</h3><p>Everyone in the system has a direct referrer recorded.</p></div>}
      </section> : null}
      <section className="panel connector-add-person" id="add-person">
        <div className="section-heading"><div><p className="eyebrow">Person intake</p><h2>Add a Person</h2><p className="muted">Start with one name and one way to reach them. Everything stays on the same Person record when they claim it.</p></div></div>
        <form className="form connector-quick-add-form" onSubmit={(event) => submit(event, "add-person")}>
          <PersonProfileFields intake intro="Required to start: a first or last name, plus a phone number or email. Every other detail is optional." />
          <label>How we met<input name="howMet" placeholder="Storm cleanup, word of mouth, local work…" /></label>
          <label>Private note<textarea name="privateNote" rows={2} /></label>
          <fieldset className="connector-quick-work"><legend>First Need or work, optional</legend><p className="muted connector-small-copy">Add this before work begins, while it is underway, when it is scheduled, or after it is completed.</p><label>What do they need, or what work is involved?<input name="workTitle" placeholder="Storm / tree / yard cleanup" /></label><div className="grid two"><label>Current status<select name="workStatus" defaultValue="new"><option value="new">New — just learned about it</option><option value="working">Working on it</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option></select></label><label>Amount, if known<input name="workAmount" type="number" min="0" step="0.01" placeholder="150.00" /></label></div><label>Scheduled time, optional<input name="workScheduledFor" type="datetime-local" /></label><label>Short detail<textarea name="workDetails" rows={2} /></label></fieldset>
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Add Person and show invitation"}</button>
        </form>
        {invitationUrl && invitationPersonId ? <section className="notice good stack connector-invite-result connector-ready-invitation" id="ready-invitation"><p className="eyebrow">Ready to send now</p><strong>{invitationPersonName || "This Person"} is connected. Their private invitation is below.</strong><label>Secure personalized claim link<input value={invitationUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label><div className="toolbar"><button className="button primary" type="button" onClick={() => copyInvitation()}>Copy private link</button><button className="button" type="button" onClick={() => shareInvitation(invitationPersonName || "Your connection")}>Text or share now</button><Link className="button" href={`/connections/${invitationPersonId}`}>Open Person</Link></div><p className="muted connector-small-copy">Keep this link private. It lets this Person claim the exact profile and history you started for them.</p></section> : null}
      </section>
      <section className="connector-dashboard-section"><div className="section-heading"><div><p className="eyebrow">Relationships</p><h2>People you are connected with</h2></div></div>{overview.people.length ? <div className="connector-people-grid">{overview.people.map((person) => <article className="card connector-person-card" key={person.id}><div><div className="connector-person-title"><h3>{person.display_name}</h3><span className={`connector-claim-badge ${person.claim_status}`}>{person.claim_status}</span></div><p className="muted">{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p></div><div className="connector-person-summary"><span>{person.openNeeds} open {person.openNeeds === 1 ? "Need" : "Needs"}</span><span>{person.phone || person.email || "Contact details not added"}</span></div><Link className="button primary compact-button" href={`/connections/${person.id}`}>{person.claim_status === "unclaimed" ? "Open Person and invitation" : "Open Person"}</Link></article>)}</div> : <div className="empty connector-empty"><h3>No connections yet</h3><p>Add the first Person above as soon as you learn about them or their Need.</p></div>}</section>
      <section className="connector-dashboard-section"><div className="section-heading"><div><p className="eyebrow">Work queue</p><h2>Open Needs</h2></div></div>{openNeeds.length ? <div className="connector-need-list">{openNeeds.map((need) => { const person = overview.people.find((entry) => entry.id === need.requester_person_id); return <article className="card connector-need-card" key={need.id}><div className="connector-need-card-top"><div><p className="eyebrow">{person?.display_name || "Connected Person"}</p><h3>{need.title}</h3></div><span className={`connector-status connector-status-${need.status}`}>{need.status}</span></div>{person ? <Link className="button compact-button" href={`/connections/${person.id}#needs`}>Open Person</Link> : null}</article>; })}</div> : <p className="muted">No open Needs right now.</p>}</section>
    </div>
  );
}
