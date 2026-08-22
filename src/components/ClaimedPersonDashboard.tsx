"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  CalendarBlank,
  CaretRight,
  ChatCircle,
  CheckCircle,
  CookingPot,
  Copy,
  DotsThreeCircle,
  EnvelopeSimple,
  GearSix,
  HouseLine,
  Info,
  LinkSimple,
  ListChecks,
  MapPin,
  Package,
  PencilSimple,
  Question,
  ShareNetwork,
  SignOut,
  UserCircle,
  UserPlus,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { AccountSignIn } from "@/components/AccountSignIn";
import { PersonProfileFields, type PersonProfileValue } from "@/components/PersonProfileFields";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase-browser";
import { formatPersonNumber } from "@/lib/phone";
import {
  createEmptyRequestDraft,
  getRequestCategory,
  recordTimingLabel,
  requestDatabasePayload,
  requestDisplayStatus,
  requestNextStep,
  type RequestDraft,
  type StructuredRequestRecord,
} from "@/lib/requestSystem";

type AccountPerson = PersonProfileValue & {
  id: string;
  personal_number: number;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
  claim_status: "claimed" | "unclaimed";
};

type ConnectionPerson = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
  claim_status: "claimed" | "unclaimed";
  claimed_at: string | null;
  connected_at: string;
  invitation_url: string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  details: string;
  status: "new" | "working" | "scheduled" | "completed" | "closed";
  scheduled_for: string | null;
  completed_at: string | null;
  updated_at: string;
  requester_name: string;
  perspective: "Your request" | "Assigned to you" | "Local request";
};

type AccountData = {
  user: { email: string | null };
  person: AccountPerson;
  connector: { person_id: string; slug: string; display_name: string; headline: string } | null;
  assignedConnector: {
    person_id: string;
    display_name: string;
    headline: string;
    intro: string;
    phone: string | null;
    email: string | null;
    assignment_scope: "person" | "household";
    household_id: string | null;
  } | null;
  people: ConnectionPerson[];
  activity: ActivityItem[];
  posts: Array<{ id: string }>;
  requests: StructuredRequestRecord[];
};

type ViewState =
  | { status: "loading" }
  | { status: "config" }
  | { status: "signed-out" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; data: AccountData };

const requestKinds = [
  { value: "meals", label: "Meals", helper: "Request cooking, meal prep, or a meal exchange", Icon: CookingPot },
  { value: "home_help", label: "Home help", helper: "Ask for practical help around the household", Icon: HouseLine },
  { value: "items", label: "Items", helper: "Look for an item, material, or household supply", Icon: Package },
  { value: "information", label: "Information", helper: "Ask for local information or the right connection", Icon: Info },
  { value: "other_request", label: "Other request", helper: "Describe something that is not already listed", Icon: DotsThreeCircle },
] as const;

function isDesignPreview() {
  return process.env.NODE_ENV === "development"
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("preview") === "1";
}

function designPreviewState() {
  return typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("previewState") || "";
}

const statusLabels: Record<ActivityItem["status"], string> = {
  new: "New",
  working: "In progress",
  scheduled: "Scheduled",
  completed: "Completed",
  closed: "Closed",
};

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function activityDate(item: ActivityItem) {
  if (item.scheduled_for) {
    return {
      primary: shortDate(item.scheduled_for),
      secondary: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(
        new Date(item.scheduled_for),
      ),
    };
  }
  return { primary: statusLabels[item.status], secondary: shortDate(item.updated_at) };
}

function activityIcon(item: ActivityItem) {
  if (item.status === "completed" || item.status === "closed") return CheckCircle;
  if (item.perspective === "Your request") return Question;
  if (item.status === "scheduled") return CalendarBlank;
  if (item.status === "working") return ListChecks;
  return ChatCircle;
}

function designPreviewData(): AccountData {
  const structuredDraft: RequestDraft = {
    ...createEmptyRequestDraft({ broadType: "home_help", categoryId: "cleaning", city: "Peotone", state: "IL" }),
    answers: { cleaningType: "regular", cleaningScope: "selected_areas", areas: ["kitchen", "main_living_area", "bathrooms"], bathrooms: 2, bedrooms: 0, cleaningTasks: ["floors", "kitchen", "bathrooms"], suppliesAvailable: "yes", petsInHome: "yes" },
    serviceIntent: "ongoing",
    cadenceFrequency: "every_other_week",
    cadenceDays: ["tuesday"],
    cadenceTimeWindows: ["morning"],
    desiredStartPeriod: "within_two_weeks",
    scheduleFlexibility: "somewhat_flexible",
  };
  const structuredFields = requestDatabasePayload(structuredDraft);
  const requestBase = { post_type: "request" as const, admin_notes: null, created_at: "2026-08-22T12:00:00Z", updated_at: "2026-08-22T12:00:00Z" };
  return {
    user: { email: "garrett@example.com" },
    person: {
      id: "preview-garrett",
      personal_number: 1,
      display_name: "Garrett",
      email: "garrett@example.com",
      phone: "",
      town: "Peotone",
      state: "IL",
      claim_status: "claimed",
    },
    connector: { person_id: "preview-garrett", slug: "garrett", display_name: "Garrett", headline: "Local Connector" },
    assignedConnector: {
      person_id: "preview-maya",
      display_name: "Maya R.",
      headline: "Household Connector",
      intro: "Your private point of contact for household needs and local service relationships.",
      phone: "708-555-0106",
      email: null,
      assignment_scope: "household",
      household_id: "preview-household",
    },
    people: [
      { id: "preview-1", display_name: "Jamie S.", email: "jamie@example.com", phone: null, town: "Peotone", state: "IL", claim_status: "claimed", claimed_at: "2026-08-12T12:00:00Z", connected_at: "2026-08-12T12:00:00Z", invitation_url: null },
      { id: "preview-2", display_name: "Alex M.", email: null, phone: "555-0102", town: "Peotone", state: "IL", claim_status: "unclaimed", claimed_at: null, connected_at: "2026-08-10T12:00:00Z", invitation_url: "https://www.localized.life/claim/preview" },
      { id: "preview-3", display_name: "Megan R.", email: "megan@example.com", phone: null, town: "Monee", state: "IL", claim_status: "claimed", claimed_at: "2026-08-08T12:00:00Z", connected_at: "2026-08-08T12:00:00Z", invitation_url: null },
    ],
    activity: [
      { id: "activity-1", title: "Reply to Jamie about shelf assembly", details: "Jamie asked about help assembling shelves this weekend.", status: "new", scheduled_for: null, completed_at: null, updated_at: "2026-08-14T15:00:00Z", requester_name: "Jamie S.", perspective: "Local request" },
      { id: "activity-2", title: "Finish your honey listing", details: "Add photos, details, and price.", status: "working", scheduled_for: null, completed_at: null, updated_at: "2026-08-14T19:00:00Z", requester_name: "Garrett", perspective: "Your request" },
      { id: "activity-3", title: "Check in on bench repair", details: "Follow up with Alex about the parts.", status: "scheduled", scheduled_for: "2026-08-15T14:00:00-05:00", completed_at: null, updated_at: "2026-08-14T12:00:00Z", requester_name: "Alex M.", perspective: "Assigned to you" },
      { id: "activity-4", title: "Peotone Plant Swap", details: "Bring extra tomatoes and herbs.", status: "scheduled", scheduled_for: "2026-08-22T18:00:00-05:00", completed_at: null, updated_at: "2026-08-13T12:00:00Z", requester_name: "Garrett", perspective: "Your request" },
      { id: "activity-5", title: "Honey pickup window", details: "Orders can be picked up at your porch.", status: "scheduled", scheduled_for: "2026-08-23T09:00:00-05:00", completed_at: null, updated_at: "2026-08-12T12:00:00Z", requester_name: "Garrett", perspective: "Your request" },
    ],
    posts: [{ id: "request-structured" }, { id: "post-1" }, { id: "post-2" }, { id: "post-3" }, { id: "post-4" }, { id: "post-5" }],
    requests: [
      { ...requestBase, ...structuredFields, id: "request-structured", owner_state: "active", status: "pending" },
      {
        ...requestBase,
        id: "post-5",
        owner_state: "closed",
        title: "Help assembling shelves",
        category: "Furniture assembly",
        city: "Peotone",
        state: "IL",
        description: "Looking for help assembling two shelving units.",
        status: "approved",
        request_schema_version: null,
        request_broad_type: null,
        request_category_id: null,
        request_subcategory_id: null,
        request_answers: {},
        service_intent: null,
        timing_preference: null,
        requested_date: null,
        requested_date_end: null,
        time_windows: [],
        cadence_frequency: null,
        cadence_days: [],
        cadence_time_windows: [],
        desired_start_period: null,
        schedule_flexibility: null,
        generated_summary: null,
        request_status: null,
        workflow_status: null,
        created_at: "2026-08-01T12:00:00Z",
        updated_at: "2026-08-11T12:00:00Z",
      },
    ],
  };
}

export function ClaimedPersonDashboard() {
  const [view, setView] = useState<ViewState>(() =>
    isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" },
  );
  const [requestKind, setRequestKind] = useState<(typeof requestKinds)[number]["value"]>("meals");
  const [peopleExpanded, setPeopleExpanded] = useState(false);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [invitation, setInvitation] = useState<{ name: string; url: string } | null>(null);

  const loadAccount = useCallback(async () => {
    if (isDesignPreview()) {
      const state = designPreviewState();
      if (state === "loading") { setView({ status: "loading" }); return; }
      if (state === "error") { setView({ status: "error", message: "Your account could not be opened." }); return; }
      const data = designPreviewData();
      setView({ status: "ready", data: state === "empty" ? { ...data, activity: [], posts: [], requests: [] } : data });
      return;
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setView({ status: "config" });
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setView({ status: "signed-out" });
      return;
    }

    const response = await fetch("/api/account", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (response.status === 401) {
      setView({ status: "missing" });
      return;
    }
    if (!response.ok) {
      setView({ status: "error", message: payload.error || "Your account could not be opened." });
      return;
    }
    setView({ status: "ready", data: payload as AccountData });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const timer = window.setTimeout(() => void loadAccount(), 0);
    if (!supabase) return () => window.clearTimeout(timer);
    const { data } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadAccount(), 0);
    });
    return () => {
      window.clearTimeout(timer);
      data.subscription.unsubscribe();
    };
  }, [loadAccount]);

  async function accountPost(body: Record<string, unknown>) {
    const supabase = getSupabaseBrowser();
    const { data } = (await supabase?.auth.getSession()) || { data: { session: null } };
    if (!data.session) throw new Error("Sign in to continue.");
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
    return payload as {
      invitation?: { url: string } | null;
      alreadyClaimed?: boolean;
    };
  }

  async function addPerson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const name = String(values.get("displayName") || [values.get("firstName"), values.get("lastName")].filter(Boolean).join(" ")).trim();
    setBusy(true);
    setMessage("");
    setInvitation(null);
    try {
      const result = await accountPost({
        action: "add-person",
        ...Object.fromEntries(values),
      });
      form.reset();
      if (result.invitation?.url) {
        setInvitation({ name, url: result.invitation.url });
        setMessage(`${name} was added. Their private link is ready to send.`);
      } else if (result.alreadyClaimed) {
        setMessage(`${name} already has an account and is now in your connections.`);
      } else {
        setMessage(`${name} was added to your connections.`);
      }
      await loadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "This person could not be added.");
    } finally {
      setBusy(false);
    }
  }

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      await accountPost({
        action: "update-profile",
        ...Object.fromEntries(values),
      });
      setMessage("Your profile was updated.");
      setProfileOpen(false);
      await loadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your profile could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation(url: string) {
    await navigator.clipboard.writeText(url);
    setMessage("Private link copied.");
  }

  async function shareInvitation(name: string, url: string) {
    if (navigator.share) {
      await navigator.share({ title: `Localized.life profile for ${name}`, text: "Here is your private Localized.life profile link:", url });
      return;
    }
    await copyInvitation(url);
  }

  async function createPersonInvitation(person: ConnectionPerson) {
    setBusy(true);
    setMessage("");
    try {
      const result = await accountPost({ action: "regenerate-invite", personId: person.id });
      if (!result.invitation?.url) throw new Error("The private link could not be created.");
      setInvitation({ name: person.display_name, url: result.invitation.url });
      setMessage(`${person.display_name}'s private link is ready to send.`);
      await loadAccount();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "The private link could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await getSupabaseBrowser()?.auth.signOut();
    setView({ status: "signed-out" });
  }

  if (view.status === "loading") {
    return <section className="account-loading" aria-live="polite">Opening your account…</section>;
  }
  if (view.status === "config") {
    return <section className="notice bad"><h2>Account access is not configured</h2><p>Add the Supabase browser settings for this environment.</p></section>;
  }
  if (view.status === "signed-out") {
    return <AccountSignIn title="Open your Localized.life account" returnTo="/account" />;
  }
  if (view.status === "missing") {
    return <section className="notice stack"><h2>This sign-in is not attached to a claimed profile.</h2><p>Open the private invitation that was sent to you, then claim that profile with this account.</p><button className="button" type="button" onClick={signOut}>Use another account</button></section>;
  }
  if (view.status === "error") return <section className="notice bad">{view.message}</section>;

  const { data } = view;
  const visiblePeople = peopleExpanded ? data.people : data.people.slice(0, 4);
  const accountRequests = (data.requests || []).filter((request) => request.owner_state !== "removed");
  const postsQuery = isDesignPreview() ? "?preview=1" : "";
  const requestHref = `/account/posts?new=request${requestKind ? `&category=${encodeURIComponent(requestKind)}` : ""}${isDesignPreview() ? "&preview=1" : ""}`;

  return (
    <div className="account-dashboard">
      <section className="account-person-header">
        <div className="account-avatar" aria-hidden="true"><UserCircle weight="duotone" /></div>
        <div className="account-person-copy">
          <h1>{data.person.display_name}</h1>
          <p>Your place for local work, posts, and people.</p>
          <div className="account-person-meta">
            <span><MapPin weight="fill" /> {[data.person.town, data.person.state].filter(Boolean).join(", ") || "Add your location"}</span>
            {formatPersonNumber(data.person.personal_number) ? <span>{formatPersonNumber(data.person.personal_number)}</span> : null}
            <button className="account-link-button" type="button" onClick={() => { setProfileOpen((open) => !open); setSettingsOpen(false); }}>
              View or edit profile
            </button>
          </div>
        </div>
      </section>

      {message ? <p className="notice good account-message" aria-live="polite">{message}</p> : null}

      {profileOpen ? (
        <section className="account-inline-panel" aria-labelledby="edit-profile-title">
          <div className="account-inline-heading"><div><p className="eyebrow">Your profile</p><h2 id="edit-profile-title">Profile details</h2></div><button className="icon-button" type="button" aria-label="Close profile editor" onClick={() => setProfileOpen(false)}><X /></button></div>
          <form className="form account-profile-form" onSubmit={updateProfile}>
            <PersonProfileFields
              person={data.person}
              manageOwnCalendar
              intro="Fill in what is useful and leave anything else blank. Access to private details is controlled by system roles and network relationships."
            />
            <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
          </form>
        </section>
      ) : null}

      <div className="account-main-grid">
        <div className="account-primary-column">
          <section className="account-composer" aria-labelledby="account-composer-title">
            <div className="account-composer-top">
              <div className="account-composer-icon" aria-hidden="true"><Question weight="bold" /></div>
              <div className="account-composer-copy"><h2 id="account-composer-title">Request something from your community</h2><p>Ask for a meal, practical help, an item, information, or something else you need.</p></div>
              <label className="account-post-select"><span className="sr-only">Request type</span><select value={requestKind} onChange={(event) => setRequestKind(event.target.value as typeof requestKind)}>{requestKinds.map((kind) => <option key={kind.label} value={kind.value}>{kind.label}</option>)}</select></label>
              <Link className="button primary account-start-button" href={requestHref}>Start a request</Link>
            </div>
            <div className="account-post-types" aria-label="Request categories">
              {requestKinds.map(({ value, label, helper, Icon }) => (
                <button className={requestKind === value ? "account-post-type active" : "account-post-type"} type="button" key={label} onClick={() => setRequestKind(value)} title={helper} aria-pressed={requestKind === value}>
                  <Icon weight={requestKind === value ? "duotone" : "regular"} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>

          <Link className="account-calendar-launch" href="/account/calendar">
            <span className="account-calendar-launch-icon" aria-hidden="true"><CalendarBlank weight="duotone" /></span>
            <span><strong>Appointment calendar</strong><small>Schedule people you know and keep private service details together</small></span>
            <CaretRight />
          </Link>

          {accountRequests.length ? (
            <section className="account-requests" id="my-requests" aria-labelledby="account-requests-title">
              <div className="account-section-heading"><h2 id="account-requests-title">My requests</h2><Link className="account-link-button" href={`/account/posts${postsQuery}`}>View all<CaretRight /></Link></div>
              <div className="account-request-list">
                {accountRequests.slice(0, 5).map((request) => {
                  const category = getRequestCategory(request.request_category_id);
                  const location = [request.city, request.state].filter(Boolean).join(", ") || "Location not specified";
                  return (
                    <Link className="account-request-row" href={`/account/posts?request=${encodeURIComponent(request.id)}${isDesignPreview() ? "&preview=1" : ""}`} key={request.id}>
                      <div className="account-request-row-icon" aria-hidden="true"><Question weight="duotone" /></div>
                      <div className="account-request-main">
                        <h3>{request.title}</h3>
                        <p>{category?.label || request.category || "Earlier request"} · {request.service_intent === "ongoing" ? "Ongoing help" : "One-time request"}</p>
                        <div><span><CalendarBlank />{recordTimingLabel(request)}</span><span><MapPin />{location}</span></div>
                      </div>
                      <div className="account-request-state"><span>{requestDisplayStatus(request)}</span><small>Next step</small><strong>{requestNextStep(request)}</strong></div>
                      <div className="account-request-updated"><small>Updated</small><span>{shortDate(request.updated_at)}</span></div>
                      <CaretRight className="account-row-caret" aria-hidden="true" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="account-activity" aria-labelledby="account-activity-title">
            <div className="account-section-heading"><h2 id="account-activity-title">Today and next</h2></div>
            {data.activity.length ? (
              <div className="account-activity-list">
                {data.activity.map((item) => {
                  const date = activityDate(item);
                  const Icon = activityIcon(item);
                  return (
                    <article className="account-activity-row" key={item.id}>
                      <div className="account-activity-date"><strong>{date.primary}</strong><span>{date.secondary}</span></div>
                      <div className={`account-activity-icon account-activity-icon-${item.status}`} aria-hidden="true"><Icon weight="duotone" /></div>
                      <div className="account-activity-copy"><h3>{item.title}</h3><p>{item.details || `${item.perspective} from ${item.requester_name}`}</p></div>
                      <span className="account-activity-status">{item.perspective}</span>
                      <CaretRight className="account-row-caret" aria-hidden="true" />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="account-empty-list"><ListChecks weight="duotone" /><div><h3>Nothing needs your attention</h3><p>Upcoming plans and items that need action will appear here.</p></div></div>
            )}
          </section>
          <Link className="account-manage-all-posts" href={`/account/posts${postsQuery}`}>
            <PencilSimple weight="duotone" />
            <span><strong>Manage requests and posts</strong><small>{data.posts.length} {data.posts.length === 1 ? "entry" : "entries"}, including earlier service, goods, event, and mentoring posts</small></span>
            <CaretRight />
          </Link>
        </div>

        <aside className="account-sidebar" aria-label="People and account tools">
          <section className="account-people-section">
            <div className="account-sidebar-heading"><h2>People</h2><button className="account-link-button account-add-person-button" type="button" onClick={() => setAddPersonOpen((open) => !open)}><UserPlus /> Add someone</button></div>
            <p className="account-sidebar-intro">People connected through an introduction, direct referral, or assigned relationship appear here.</p>

            {addPersonOpen ? (
              <form className="form account-add-person-form" onSubmit={addPerson}>
                <div className="account-inline-heading"><strong>Add someone</strong><button className="icon-button" type="button" aria-label="Close add person form" onClick={() => setAddPersonOpen(false)}><X /></button></div>
                <div className="grid two"><label>First name<input name="firstName" autoComplete="given-name" /></label><label>Last name<input name="lastName" autoComplete="family-name" /></label></div>
                <label>Profile name <span className="muted">Optional</span><input name="displayName" autoComplete="name" /><span className="field-note">Created from the first or last name when blank.</span></label>
                <div className="grid two"><label>Phone<input name="phone" type="tel" autoComplete="tel" /></label><label>Email<input name="email" type="email" autoComplete="email" /></label></div>
                <p className="field-note">Required: at least one name above and either phone or email.</p>
                <label>Street address<input name="addressLine1" autoComplete="address-line1" /></label>
                <label>Apartment, suite, or unit<input name="addressLine2" autoComplete="address-line2" /></label>
                <div className="grid two"><label>City or town<input name="town" autoComplete="address-level2" /></label><label>State<input name="state" maxLength={2} autoComplete="address-level1" /></label></div>
                <div className="grid two"><label>ZIP code<input name="postalCode" autoComplete="postal-code" /></label><label>County<input name="county" /></label></div>
                <label>How do you know them?<input name="howMet" placeholder="Neighbor, local work, introduction…" /></label>
                <button className="button primary" type="submit" disabled={busy}>{busy ? "Adding…" : "Add person"}</button>
              </form>
            ) : null}

            {invitation ? (
              <div className="account-invitation-result">
                <p className="eyebrow">Private link ready</p>
                <strong>Send this to {invitation.name}</strong>
                <input value={invitation.url} readOnly onFocus={(event) => event.currentTarget.select()} aria-label={`Private link for ${invitation.name}`} />
                <div className="account-invitation-actions"><button className="button primary compact-button" type="button" onClick={() => copyInvitation(invitation.url)}><Copy /> Copy link</button><button className="button compact-button" type="button" onClick={() => shareInvitation(invitation.name, invitation.url)}><ShareNetwork /> Share</button></div>
              </div>
            ) : null}

            {visiblePeople.length ? (
              <div className="account-people-list">
                {visiblePeople.map((person, index) => (
                  <article className="account-person-row" key={person.id}>
                    <div className={`account-small-avatar account-small-avatar-${(index % 3) + 1}`} aria-hidden="true"><UserCircle weight="duotone" /></div>
                    <div><h3>{person.display_name}</h3><p>{[person.town, person.state].filter(Boolean).join(", ") || "Location not added"}</p><small>{person.claim_status === "claimed" ? `Connected ${shortDate(person.connected_at)}` : "Profile not claimed"}</small></div>
                    {person.invitation_url ? <button className="icon-button" type="button" aria-label={`Copy private link for ${person.display_name}`} title="Copy private link" onClick={() => copyInvitation(person.invitation_url!)}><LinkSimple /></button> : person.claim_status === "unclaimed" ? <button className="icon-button" type="button" disabled={busy} aria-label={`Create private link for ${person.display_name}`} title="Create private link" onClick={() => createPersonInvitation(person)}><LinkSimple /></button> : <Link className="icon-button" href={`/account/people/${person.id}${isDesignPreview() ? "?preview=1" : ""}`} aria-label={`View shared profile for ${person.display_name}`} title="View shared profile"><CaretRight /></Link>}
                  </article>
                ))}
              </div>
            ) : <div className="account-sidebar-empty"><UsersThree weight="duotone" /><p>Your established connections will appear here.</p></div>}

            {data.people.length > 4 ? <button className="account-link-button account-view-all" type="button" onClick={() => setPeopleExpanded((expanded) => !expanded)}>{peopleExpanded ? "Show fewer people" : "View all people"}<CaretRight /></button> : null}
          </section>

          {data.assignedConnector ? (
            <section className="account-assigned-connector-section">
              <div className="account-connector-title"><h2>Your Connector</h2><span>Private</span></div>
              <div className="account-assigned-connector-copy">
                <strong>{data.assignedConnector.display_name}</strong>
                <p>{data.assignedConnector.headline || data.assignedConnector.intro}</p>
                <small>{data.assignedConnector.assignment_scope === "household" ? "Assigned to your household" : "Assigned to you"}</small>
              </div>
              {data.assignedConnector.phone ? <a className="account-tool-link" href={`tel:${data.assignedConnector.phone}`}><ChatCircle weight="duotone" /><span>Contact {data.assignedConnector.display_name}</span><CaretRight /></a> : data.assignedConnector.email ? <a className="account-tool-link" href={`mailto:${data.assignedConnector.email}`}><EnvelopeSimple weight="duotone" /><span>Contact {data.assignedConnector.display_name}</span><CaretRight /></a> : <p>Contact details will appear when they are available.</p>}
            </section>
          ) : null}

          {data.connector ? (
            <section className="account-connector-section">
              <div className="account-connector-title"><h2>Connector tools</h2><span>Your role</span></div>
              <p>Tools for the people and requests you help coordinate.</p>
              <Link className="account-tool-link" href="/connections"><UsersThree weight="duotone" /><span>People you manage</span><CaretRight /></Link>
              <Link className="account-tool-link" href="/connections#needs"><Question weight="duotone" /><span>Local requests</span><CaretRight /></Link>
            </section>
          ) : null}

          <section className="account-settings-section">
            <button className="account-tool-link" type="button" onClick={() => { setSettingsOpen((open) => !open); setProfileOpen(false); }}><GearSix weight="duotone" /><span>Account settings</span><CaretRight /></button>
            {settingsOpen ? <div className="account-settings-body"><p>Signed in as <strong>{data.user.email}</strong></p><p>Your phone, email, private links, and relationship notes are not shown in the public directory.</p><button className="button compact-button" type="button" onClick={signOut}><SignOut /> Sign out</button></div> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}
