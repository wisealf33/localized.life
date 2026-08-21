"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { AccountSignIn } from "./AccountSignIn";
import { PersonProfileFields } from "./PersonProfileFields";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { formatPersonNumber } from "@/lib/phone";
import { localServices } from "@/lib/localServices";

type ActivityStatus = "active" | "needs_follow_up" | "not_onboarded";

type OperationalSummary = {
  activityStatus: ActivityStatus;
  lastActivityAt: string | null;
  upcomingAppointments: number;
  completedAppointments: number;
  nextAppointmentAt: string | null;
  configuredAvailabilityDays: number;
  availableDays: number;
  openRequests: number;
};

type AvailabilityWindow = { start: string; end: string };

type ManagedAvailability = {
  availability_date: string;
  status: "open" | "custom" | "closed";
  time_windows: AvailabilityWindow[] | null;
  updated_at: string;
};

type ManagedAppointment = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
  updated_at: string;
};

type PersonSummary = {
  id: string;
  personal_number: number;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
  claim_status: "claimed" | "unclaimed";
  skills: string[] | null;
  services_offered: string | null;
  openNeeds: number;
  operational: OperationalSummary;
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
  accessScope: "system" | "relationships";
  people: PersonSummary[];
  needs: NeedRecord[];
  referralIntake: {
    canAssign: boolean;
    unassigned: Array<{
      id: string;
      personal_number: number;
      display_name: string;
      email: string | null;
      phone: string | null;
      town: string | null;
      state: string | null;
      claim_status: "claimed" | "unclaimed";
      created_at: string;
    }>;
    referrerOptions: Array<{
      id: string;
      display_name: string;
      role: string;
      assignedReferralCount: number;
      lastAssignedAt: string | null;
      suggested: boolean;
    }>;
  };
};

type PersonDetail = Overview & {
  relationshipAccess: "direct" | "system";
  person: PersonSummary & {
    how_met: string | null;
    private_notes: string | null;
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
  operational: {
    summary: OperationalSummary;
    availability: ManagedAvailability[];
    appointments: ManagedAppointment[];
  };
  activeInvitation: { url: string } | null;
};

const serviceTitles = new Map(localServices.map((service) => [service.slug, service.title]));

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

function activityLabel(status: ActivityStatus) {
  if (status === "active") return "Active";
  if (status === "not_onboarded") return "Not onboarded";
  return "Needs follow-up";
}

function serviceTitle(slug: string) {
  return serviceTitles.get(slug) || slug.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function time(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
    new Date(2026, 0, 1, hours, minutes),
  );
}

function appointmentRange(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const sameDay = startDate.toDateString() === endDate.toDateString();
  const startLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(startDate);
  const endLabel = new Intl.DateTimeFormat("en-US", {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(endDate);
  return `${startLabel}–${endLabel}`;
}

function availabilityText(entry: ManagedAvailability) {
  if (entry.status === "closed") return "Unavailable";
  if (entry.status === "open") return "Open availability";
  if (!entry.time_windows?.length) return "Custom availability";
  return entry.time_windows.map((window) => `${time(window.start)}–${time(window.end)}`).join(", ");
}

async function accessToken() {
  const { data } = (await getSupabaseBrowser()?.auth.getSession()) || { data: { session: null } };
  return data.session?.access_token || "";
}

function isDesignPreview() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname) && new URLSearchParams(window.location.search).has("preview");
}

function previewOperational(overrides: Partial<OperationalSummary> = {}): OperationalSummary {
  return {
    activityStatus: "active",
    lastActivityAt: "2026-08-21T14:30:00.000Z",
    upcomingAppointments: 2,
    completedAppointments: 4,
    nextAppointmentAt: "2026-08-24T14:00:00.000Z",
    configuredAvailabilityDays: 4,
    availableDays: 3,
    openRequests: 1,
    ...overrides,
  };
}

function previewPerson(overrides: Partial<PersonSummary> = {}): PersonSummary {
  return {
    id: "preview-jamie",
    personal_number: 1042,
    display_name: "Jamie Carter",
    email: "jamie@example.com",
    phone: "(555) 014-2098",
    town: "Paw Paw",
    state: "IL",
    claim_status: "claimed",
    skills: ["house-cleaning", "cooking-meal-sharing", "yard-cleanup"],
    services_offered: null,
    openNeeds: 1,
    operational: previewOperational(),
    ...overrides,
  };
}

function previewOverview(): Overview {
  return {
    actor: { id: "preview-connector", displayName: "Alex Morgan" },
    connector: { slug: "alex-morgan", display_name: "Alex Morgan" },
    accessScope: "relationships",
    people: [
      previewPerson(),
      previewPerson({
        id: "preview-robin",
        personal_number: 1043,
        display_name: "Robin Lee",
        email: null,
        phone: "(555) 018-4492",
        town: "DeKalb",
        skills: ["handyman-repairs", "furniture-assembly"],
        openNeeds: 0,
        operational: previewOperational({
          activityStatus: "needs_follow_up",
          lastActivityAt: "2026-07-02T18:00:00.000Z",
          upcomingAppointments: 0,
          completedAppointments: 1,
          nextAppointmentAt: null,
          configuredAvailabilityDays: 0,
          availableDays: 0,
          openRequests: 0,
        }),
      }),
      previewPerson({
        id: "preview-taylor",
        personal_number: 1044,
        display_name: "Taylor Brooks",
        email: "taylor@example.com",
        phone: null,
        town: "Rochelle",
        claim_status: "unclaimed",
        skills: [],
        openNeeds: 1,
        operational: previewOperational({
          activityStatus: "not_onboarded",
          lastActivityAt: "2026-08-19T16:20:00.000Z",
          upcomingAppointments: 0,
          completedAppointments: 0,
          nextAppointmentAt: null,
          configuredAvailabilityDays: 0,
          availableDays: 0,
          openRequests: 1,
        }),
      }),
    ],
    needs: [],
    referralIntake: { canAssign: false, unassigned: [], referrerOptions: [] },
  };
}

function previewDetail(): PersonDetail {
  const overview = previewOverview();
  const person = previewPerson({
    how_met: "Introduced after a neighborhood cleanup",
    private_notes: null,
    created_at: "2026-05-18T16:00:00.000Z",
    claimed_at: "2026-05-19T13:00:00.000Z",
  } as Partial<PersonDetail["person"]>);
  return {
    ...overview,
    relationshipAccess: "direct",
    person: person as PersonDetail["person"],
    relationship: { started_at: "2026-05-18T16:00:00.000Z" },
    needs: [
      {
        id: "preview-need",
        requester_person_id: person.id,
        title: "Meal exchange for Thursday",
        details: "Looking to trade two prepared dinners this week.",
        status: "working",
        scheduled_for: null,
        amount_cents: null,
        connector_notes: null,
        created_at: "2026-08-20T15:00:00.000Z",
      },
    ],
    interactions: [],
    households: [],
    operational: {
      summary: person.operational,
      availability: [
        { availability_date: "2026-08-24", status: "custom", time_windows: [{ start: "09:00", end: "12:30" }, { start: "15:00", end: "18:00" }], updated_at: "2026-08-21T14:30:00.000Z" },
        { availability_date: "2026-08-25", status: "open", time_windows: [], updated_at: "2026-08-21T14:30:00.000Z" },
        { availability_date: "2026-08-27", status: "closed", time_windows: [], updated_at: "2026-08-21T14:30:00.000Z" },
      ],
      appointments: [
        { id: "preview-appointment-1", title: "Recurring house cleaning", starts_at: "2026-08-24T14:00:00.000Z", ends_at: "2026-08-24T16:30:00.000Z", status: "scheduled", updated_at: "2026-08-21T14:30:00.000Z" },
        { id: "preview-appointment-2", title: "Meal preparation", starts_at: "2026-08-26T21:00:00.000Z", ends_at: "2026-08-26T23:00:00.000Z", status: "scheduled", updated_at: "2026-08-21T14:30:00.000Z" },
        { id: "preview-appointment-3", title: "Yard cleanup", starts_at: "2026-08-18T15:00:00.000Z", ends_at: "2026-08-18T18:00:00.000Z", status: "completed", updated_at: "2026-08-18T18:05:00.000Z" },
      ],
    },
    activeInvitation: null,
  };
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
    if (isDesignPreview()) {
      setData(personId ? previewDetail() : previewOverview());
      setAuthState("signed-in");
      return;
    }
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
    if (isDesignPreview()) {
      const previewTimer = window.setTimeout(() => void load(), 0);
      return () => window.clearTimeout(previewTimer);
    }
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
        setMessage(result.referralNumber ? `${result.referralNumber} assigned and recorded.` : "Assigned referral recorded.");
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
    const operational = detail.operational;
    const systemOnly = detail.relationshipAccess === "system";
    const activeInvitationUrl = invitationUrl || detail.activeInvitation?.url || "";
    return (
      <div className="connector-member-shell">
        <Link className="back-link" href="/connections">← My Connections</Link>
        <section className="connector-record-heading">
          <div>
            <p className="eyebrow">Connection page</p>
            <h1>{person.display_name}</h1>
            <p className="lede">{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p>
          </div>
          <div className="connector-record-contact">
            {person.phone ? <a href={`tel:${person.phone}`}>{person.phone}</a> : <span>No phone</span>}
            {person.email ? <a href={`mailto:${person.email}`}>{person.email}</a> : <span>No email</span>}
          </div>
        </section>
        {message ? <p className="notice good">{message}</p> : null}

        <section className="connector-record-grid">
          <article className="panel">
            <p className="eyebrow">Identity and invitation</p>
            <h2>{person.claim_status === "claimed" ? "Profile claimed" : "Private claim link"}</h2>
            <dl className="connector-details-list">
              <div><dt>Created</dt><dd>{date(person.created_at)}</dd></div>
              <div><dt>Person number</dt><dd>{formatPersonNumber(person.personal_number) || "Pending"}</dd></div>
              <div><dt>{systemOnly ? "Entered system" : "Connected"}</dt><dd>{date(detail.relationship.started_at)}</dd></div>
              <div><dt>Claim status</dt><dd>{person.claim_status === "claimed" ? `Claimed ${date(person.claimed_at)}` : "Unclaimed"}</dd></div>
              <div><dt>How we met</dt><dd>{person.how_met || "Not recorded"}</dd></div>
            </dl>
            {person.claim_status === "unclaimed" && systemOnly ? <p className="notice">Invitation access stays with this Person&apos;s direct Connector.</p> : person.claim_status === "unclaimed" ? (
              <div className="stack">
                {activeInvitationUrl ? (
                  <div className="connector-invite-result" id="person-invitation">
                    <label>Private profile claim link<input value={activeInvitationUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label>
                    <div className="toolbar">
                      <button className="button primary" type="button" onClick={() => copyInvitation(activeInvitationUrl)}>Copy link</button>
                      <button className="button" type="button" onClick={() => shareInvitation(person.display_name, activeInvitationUrl)}>Text or share</button>
                    </div>
                    <p className="muted connector-small-copy">Send this link to {person.display_name}. It opens their existing profile, asks them to create only a password, and then signs them in so they can complete their own information.</p>
                    <div className="connector-invite-security-actions">
                      <button className="text-button" type="button" disabled={busy} onClick={() => replaceInvitation(person.id, person.display_name)}>Replace compromised link</button>
                      <button className="text-button" type="button" disabled={busy} onClick={() => revokeInvitation(person.id, person.display_name)}>Revoke link</button>
                    </div>
                  </div>
                ) : <button className="button primary compact-button" type="button" disabled={busy} onClick={() => invitationAction("generate-invite")}>Create private invitation link</button>}
              </div>
            ) : <p className="notice good">This Person claimed the profile and now manages their own account information.</p>}
          </article>
        </section>

        <section className="connector-dashboard-section managed-visibility-section" id="operational-visibility">
          <div className="managed-visibility-heading">
            <div>
              <p className="eyebrow">Read-only management view</p>
              <h2>Operational visibility</h2>
              <p className="muted">See enough to guide, teach, and encourage {person.display_name} without taking control of their account.</p>
            </div>
            <span className={`managed-activity-badge ${operational.summary.activityStatus}`}>
              <span aria-hidden="true" />{activityLabel(operational.summary.activityStatus)}
            </span>
          </div>

          <div className="managed-operational-stats" aria-label="Recent activity summary">
            <div><strong>{operational.summary.upcomingAppointments}</strong><span>upcoming appointments</span></div>
            <div><strong>{operational.summary.completedAppointments}</strong><span>completed in 30 days</span></div>
            <div><strong>{operational.summary.availableDays}</strong><span>available days set</span></div>
            <div><strong>{operational.summary.openRequests}</strong><span>open requests</span></div>
          </div>

          <div className="managed-operational-grid">
            <article className="panel managed-operational-panel">
              <div className="managed-panel-heading">
                <div><p className="eyebrow">Calendar</p><h3>Availability</h3></div>
                <span>Next 60 days</span>
              </div>
              {operational.availability.length ? (
                <div className="managed-availability-list">
                  {operational.availability.map((entry) => (
                    <div className="managed-availability-row" key={entry.availability_date}>
                      <time dateTime={entry.availability_date}>{date(`${entry.availability_date}T12:00:00`)}</time>
                      <span className={`managed-availability-value ${entry.status}`}>{availabilityText(entry)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="managed-inline-empty"><strong>No availability preferences recorded</strong><p>Their calendar currently accepts appointments by default.</p></div>
              )}
            </article>

            <article className="panel managed-operational-panel">
              <div className="managed-panel-heading">
                <div><p className="eyebrow">Work activity</p><h3>Schedule</h3></div>
                <span>Recent and upcoming</span>
              </div>
              {operational.appointments.length ? (
                <div className="managed-schedule-list">
                  {operational.appointments.map((appointment) => (
                    <div className="managed-schedule-row" key={appointment.id}>
                      <div><strong>{appointment.title}</strong><time>{appointmentRange(appointment.starts_at, appointment.ends_at)}</time></div>
                      <span className={`connector-status connector-status-${appointment.status}`}>{appointment.status}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="managed-inline-empty"><strong>No recent or upcoming appointments</strong><p>New calendar activity will appear here automatically.</p></div>
              )}
            </article>
          </div>

          <article className="panel managed-skills-panel">
            <div><p className="eyebrow">Profile</p><h3>Skills and services</h3></div>
            {person.skills?.length ? <div className="managed-skill-list">{person.skills.map((skill) => <span key={skill}>{serviceTitle(skill)}</span>)}</div> : <p className="muted">No skills or services have been selected yet.</p>}
            {person.services_offered ? <p className="managed-services-note">{person.services_offered}</p> : null}
          </article>

          <p className="managed-privacy-note"><strong>Private by design:</strong> wallet activity, customer contact details, service addresses, and private appointment notes are not included. Only {person.display_name} can change this calendar information.</p>
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
                  {!systemOnly ? <form className="form connector-need-update-form" onSubmit={(event) => submit(event, "update-need")}>
                    <input type="hidden" name="needId" value={need.id} />
                    <div className="grid two"><label>Status<select name="status" defaultValue={need.status}><option value="new">New</option><option value="working">Working</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="closed">Closed</option></select></label><label>Amount, optional<input name="amount" type="number" min="0" step="0.01" defaultValue={need.amount_cents === null ? "" : need.amount_cents / 100} /></label></div>
                    <label>Scheduled time<input name="scheduledFor" type="datetime-local" defaultValue={localDateTime(need.scheduled_for)} /></label>
                    <label>Private Connector note<textarea name="connectorNotes" rows={2} defaultValue={need.connector_notes || ""} /></label>
                    <button className="button compact-button" type="submit" disabled={busy}>Update need</button>
                  </form> : need.connector_notes ? <p className="muted">Coordinator note: {need.connector_notes}</p> : null}
                </article>
              )) : <div className="empty connector-empty"><h3>No Needs yet</h3><p>Add current help or record something already completed.</p></div>}
            </div>
            {!systemOnly ? <form className="panel form connector-add-need-panel" onSubmit={(event) => submit(event, "add-need")}>
              <p className="eyebrow">Add a Need</p>
              <label>Title<input name="title" required placeholder="Storm cleanup" /></label>
              <label>Details<textarea name="details" rows={3} /></label>
              <div className="grid two"><label>Status<select name="status" defaultValue="new"><option value="new">New</option><option value="working">Working</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="closed">Closed</option></select></label><label>Amount, optional<input name="amount" type="number" min="0" step="0.01" placeholder="150.00" /></label></div>
              <label>Scheduled time<input name="scheduledFor" type="datetime-local" /></label>
              <label>Private Connector note<textarea name="connectorNotes" rows={2} /></label>
              <button className="button primary" type="submit" disabled={busy}>Add Need</button>
            </form> : null}
          </div>
        </section>

        <section className="connector-dashboard-section" id="history">
          <div className="section-heading"><div><p className="eyebrow">History</p><h2>Private notes and shared activity</h2></div></div>
          <div className="connector-history-layout">
            <div className="connector-history-list">
              {detail.interactions.map((interaction) => <article className="connector-history-item" key={interaction.id}><time>{date(interaction.occurred_at, true)}</time><p>{interaction.note}</p><span>{interaction.visibility === "shared" ? "Shared with this Person" : "Private Connector Note"}</span></article>)}
              {!detail.interactions.length ? <p className="muted">No activity yet.</p> : null}
            </div>
            {!systemOnly ? <form className="panel form connector-history-form" onSubmit={(event) => submit(event, "add-interaction")}>
              <p className="eyebrow">Add activity</p>
              <label>What happened?<textarea name="note" rows={4} required /></label>
              <label>Who can see it?<select name="visibility" defaultValue="private"><option value="private">Private Connector Note</option><option value="shared">Shared Activity / History</option></select></label>
              <button className="button" type="submit" disabled={busy}>Add activity</button>
            </form> : null}
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
        <div><p className="eyebrow">Signed in as {overview.actor.displayName}</p><h1>{overview.accessScope === "system" ? "Network People" : "People I manage"}</h1><p className="lede">{overview.accessScope === "system" ? "Founder access includes every Person record. Relationship tools still follow each Person's direct Connector or assigned responsibility." : "See the availability and work activity of People assigned to you, so you can guide, teach, and encourage them without controlling their accounts."}</p></div>
        <div className="toolbar"><a className="button primary" href="#managed-people">View managed People</a><Link className="button" href="/account">Open my account</Link><button className="button" type="button" onClick={signOut}>Sign out</button></div>
      </section>
      {message ? <p className="notice good">{message}</p> : null}
      <section className="connector-admin-stats"><div><strong>{overview.people.length}</strong><span>{overview.accessScope === "system" ? "people in system" : "people managed"}</span></div><div><strong>{openNeeds.length}</strong><span>open Needs</span></div><div><strong>{overview.people.filter((person) => person.claim_status === "unclaimed").length}</strong><span>unclaimed</span></div></section>
      {overview.referralIntake.canAssign ? <section className="connector-dashboard-section" id="referral-intake">
        <div className="section-heading"><div><p className="eyebrow">Internal referral intake</p><h2>People waiting for an assigned sponsor</h2><p className="muted">The system places People with fewer assigned referrals first. Review the evidence and make the final assignment.</p></div><span className="connector-referral-count">{overview.referralIntake.unassigned.length} waiting</span></div>
        {overview.referralIntake.unassigned.length ? <div className="connector-referral-list">{overview.referralIntake.unassigned.map((person) => <article className="card connector-referral-card" key={person.id}>
          <div><div className="connector-person-title"><h3>{person.display_name}</h3><span className={`connector-claim-badge ${person.claim_status}`}>{person.claim_status}</span></div><p className="muted">{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p><p className="connector-referral-contact">{person.phone || person.email || "Contact details not added"}</p><p className="muted connector-small-copy">{formatPersonNumber(person.personal_number) || "Person number pending"} · Entered {date(person.created_at)}</p></div>
          <form className="connector-referral-form" onSubmit={(event) => submit(event, "assign-referrer")}>
            <input type="hidden" name="referredPersonId" value={person.id} />
            <label>Assigned sponsor<select name="referrerPersonId" required defaultValue=""><option value="" disabled>Choose a person</option>{overview.referralIntake.referrerOptions.map((referrer) => <option value={referrer.id} key={referrer.id}>{referrer.suggested ? "Suggested — " : ""}{referrer.display_name} — {referrer.assignedReferralCount} prior AR{referrer.assignedReferralCount === 1 ? "" : "s"}</option>)}</select></label>
            <label>Assignment note <span className="muted">Optional</span><input name="assignmentReason" placeholder="Reason for this final choice" /></label>
            <button className="button primary compact-button" type="submit" disabled={busy}>Confirm assigned referral</button>
          </form>
        </article>)}</div> : <div className="empty connector-empty"><h3>No assigned referrals waiting</h3><p>Everyone currently in the intake queue has a sponsor recorded.</p></div>}
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
        {invitationUrl && invitationPersonId ? <section className="notice good stack connector-invite-result connector-ready-invitation" id="ready-invitation"><p className="eyebrow">Ready to send now</p><strong>{invitationPersonName || "This Person"} is connected. Their private invitation is below.</strong><label>Secure personalized claim link<input value={invitationUrl} readOnly onFocus={(event) => event.currentTarget.select()} /></label><div className="toolbar"><button className="button primary" type="button" onClick={() => copyInvitation()}>Copy private link</button><button className="button" type="button" onClick={() => shareInvitation(invitationPersonName || "Your connection")}>Text or share now</button><Link className="button" href={`/connections/${invitationPersonId}`}>Open connection</Link></div><p className="muted connector-small-copy">Keep this link private. It lets this Person create a password, claim this exact profile, and complete their own information.</p></section> : null}
      </section>
      <section className="connector-dashboard-section" id="managed-people">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{overview.accessScope === "system" ? "System access" : "Connector assignments"}</p>
            <h2>{overview.accessScope === "system" ? "People in the network" : "People you manage"}</h2>
            <p className="muted">Operational visibility is read-only and helps you notice who is active, available, or may need encouragement.</p>
          </div>
        </div>
        {overview.people.length ? (
          <div className="connector-people-grid">
            {overview.people.map((person) => (
              <article className="card connector-person-card" key={person.id}>
                <div>
                  <div className="connector-person-title">
                    <h3>{person.display_name}</h3>
                    <span className={`connector-claim-badge ${person.claim_status}`}>{person.claim_status}</span>
                  </div>
                  <p className="muted">{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p>
                </div>
                <div className="managed-person-status-row">
                  <span className={`managed-activity-badge ${person.operational.activityStatus}`}>
                    <span aria-hidden="true" />{activityLabel(person.operational.activityStatus)}
                  </span>
                  <span>{person.operational.lastActivityAt ? `Last activity ${date(person.operational.lastActivityAt)}` : "No activity recorded"}</span>
                </div>
                <div className="connector-person-metrics">
                  <div><strong>{person.operational.upcomingAppointments}</strong><span>Upcoming</span></div>
                  <div><strong>{person.operational.availableDays}</strong><span>Available days</span></div>
                  <div><strong>{person.openNeeds}</strong><span>Open {person.openNeeds === 1 ? "Need" : "Needs"}</span></div>
                </div>
                <div className="connector-person-summary">
                  <span>{person.skills?.length ? person.skills.slice(0, 2).map(serviceTitle).join(" · ") : "Skills not added"}</span>
                  <span>{person.phone || person.email || "Contact details not added"}</span>
                </div>
                <Link className="button primary compact-button" href={`/connections/${person.id}`}>
                  {person.claim_status === "unclaimed" && overview.accessScope !== "system" ? "Open Person and claim link" : "View activity"}
                </Link>
              </article>
            ))}
          </div>
        ) : <div className="empty connector-empty"><h3>No managed People yet</h3><p>People assigned to you as their Connector will appear here.</p></div>}
      </section>
      <section className="connector-dashboard-section"><div className="section-heading"><div><p className="eyebrow">Work queue</p><h2>Open Needs</h2></div></div>{openNeeds.length ? <div className="connector-need-list">{openNeeds.map((need) => { const person = overview.people.find((entry) => entry.id === need.requester_person_id); return <article className="card connector-need-card" key={need.id}><div className="connector-need-card-top"><div><p className="eyebrow">{person?.display_name || "Connected Person"}</p><h3>{need.title}</h3></div><span className={`connector-status connector-status-${need.status}`}>{need.status}</span></div>{person ? <Link className="button compact-button" href={`/connections/${person.id}#needs`}>Open Person</Link> : null}</article>; })}</div> : <p className="muted">No open Needs right now.</p>}</section>
    </div>
  );
}
