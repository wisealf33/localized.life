"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase-browser";
import { AccountSignIn } from "@/components/AccountSignIn";
import type {
  ConnectorProfile,
  ConnectorRelationship,
  Household,
  HouseholdMembership,
  Need,
  ConnectorInteraction,
} from "@/lib/connectorTypes";

type MemberPerson = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
};

type DashboardData = {
  user: User;
  person: MemberPerson;
  connector: ConnectorProfile;
  relationship: ConnectorRelationship;
  memberships: HouseholdMembership[];
  households: Household[];
  needs: Need[];
  interactions: ConnectorInteraction[];
};

type ViewState =
  | { status: "loading" }
  | { status: "config" }
  | { status: "signed-out" }
  | { status: "unconnected"; email: string }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

const personFields = "id, auth_user_id, display_name, email, phone, town, state";
const relationshipFields =
  "id, connector_person_id, person_id, household_id, is_primary, status, started_at";
const needFields =
  "id, requester_person_id, household_id, connector_person_id, title, details, status, scheduled_for, completed_at, assigned_person_id, created_at, updated_at";

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

function statusLabel(status: Need["status"]) {
  return {
    new: "New",
    working: "Working on it",
    scheduled: "Scheduled",
    completed: "Completed",
    closed: "Closed",
  }[status];
}

export function ConnectorMemberDashboard() {
  const [view, setView] = useState<ViewState>(() =>
    isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" },
  );
  const [formMessage, setFormMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setView({ status: "config" });
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setView({ status: "signed-out" });
      return;
    }

    const user = userData.user;
    const personResult = await supabase
      .from("people")
      .select(personFields)
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (personResult.error || !personResult.data) {
      setView({ status: "unconnected", email: user.email || "this account" });
      return;
    }

    const person = personResult.data as MemberPerson;
    const membershipsResult = await supabase
      .from("household_memberships")
      .select("person_id, household_id, role")
      .eq("person_id", person.id);
    if (membershipsResult.error) {
      setView({ status: "error", message: membershipsResult.error.message });
      return;
    }

    const memberships = (membershipsResult.data || []) as HouseholdMembership[];
    const householdIds = memberships.map((membership) => membership.household_id);
    const directRelationshipPromise = supabase
      .from("connector_relationships")
      .select(relationshipFields)
      .eq("person_id", person.id)
      .eq("status", "active")
      .eq("is_primary", true)
      .maybeSingle();
    const householdRelationshipPromise = householdIds.length
      ? supabase
          .from("connector_relationships")
          .select(relationshipFields)
          .in("household_id", householdIds)
          .eq("status", "active")
          .eq("is_primary", true)
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });
    const householdsPromise = householdIds.length
      ? supabase
          .from("households")
          .select("id, name, address_line, town, state, zip")
          .in("id", householdIds)
      : Promise.resolve({ data: [], error: null });
    const needsPromise = supabase.from("needs").select(`${needFields}, amount_cents`).order("created_at", { ascending: false });
    const interactionsPromise = supabase
      .from("connector_interactions")
      .select("id, person_id, connector_person_id, need_id, note, visibility, occurred_at")
      .eq("person_id", person.id)
      .eq("visibility", "shared")
      .order("occurred_at", { ascending: false });

    const [directRelationship, householdRelationship, householdsResult, needsResult, interactionsResult] = await Promise.all([
      directRelationshipPromise,
      householdRelationshipPromise,
      householdsPromise,
      needsPromise,
      interactionsPromise,
    ]);
    const relationship = (directRelationship.data || householdRelationship.data) as ConnectorRelationship | null;
    if (!relationship) {
      setView({ status: "unconnected", email: user.email || "this account" });
      return;
    }
    if (householdsResult.error || needsResult.error || interactionsResult.error) {
      setView({ status: "error", message: householdsResult.error?.message || needsResult.error?.message || interactionsResult.error?.message || "Could not load dashboard." });
      return;
    }

    const connectorResult = await supabase
      .from("connector_profiles")
      .select("person_id, slug, display_name, headline, intro, active")
      .eq("person_id", relationship.connector_person_id)
      .eq("active", true)
      .maybeSingle();
    if (connectorResult.error || !connectorResult.data) {
      setView({ status: "error", message: "Your Connector profile is not available yet." });
      return;
    }

    setView({
      status: "ready",
      data: {
        user,
        person,
        connector: connectorResult.data as ConnectorProfile,
        relationship,
        memberships,
        households: (householdsResult.data || []) as Household[],
        needs: (needsResult.data || []) as Need[],
        interactions: (interactionsResult.data || []) as ConnectorInteraction[],
      },
    });
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let active = true;
    const initialLoad = window.setTimeout(() => void loadDashboard(), 0);
    const { data } = supabase.auth.onAuthStateChange(() => {
      if (active) window.setTimeout(() => void loadDashboard(), 0);
    });
    return () => {
      active = false;
      window.clearTimeout(initialLoad);
      data.subscription.unsubscribe();
    };
  }, [loadDashboard]);

  async function submitNeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (view.status !== "ready") return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const details = String(formData.get("details") || "").trim();
    const householdId = String(formData.get("household_id") || "").trim();
    if (!title) return;

    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setSubmitting(true);
    setFormMessage("");
    const { error } = await supabase.from("needs").insert({
      requester_person_id: view.data.person.id,
      household_id: householdId || null,
      connector_person_id: view.data.connector.person_id,
      title,
      details,
    });
    setSubmitting(false);
    if (error) {
      setFormMessage("That need was not saved yet. Please try again.");
      return;
    }
    form.reset();
    setFormMessage(`${view.data.connector.display_name} received your need.`);
    await loadDashboard();
  }

  async function signOut() {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    setView({ status: "signed-out" });
  }

  if (view.status === "loading") {
    return <div className="panel connector-loading">Opening your private dashboard...</div>;
  }

  if (view.status === "config") {
    return (
      <div className="notice bad stack">
        <h2>Member login needs one configuration value</h2>
        <p>Add the Supabase publishable key to enable Connector accounts in this environment.</p>
      </div>
    );
  }

  if (view.status === "signed-out") {
    return <AccountSignIn title="Open your Localized.life dashboard" returnTo="/connector/dashboard" />;
  }

  if (view.status === "unconnected") {
    return (
      <div className="notice stack">
        <h2>This account is not connected yet</h2>
        <p>We found {view.email}, but it is not attached to a Connector relationship.</p>
        <Link className="button primary compact-button" href="/local-services/request">
          Request local help
        </Link>
        <button className="button compact-button" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    );
  }

  if (view.status === "error") {
    return <div className="notice bad">{view.message}</div>;
  }

  const { connector, person, memberships, households, needs, interactions } = view.data;
  const openNeeds = needs.filter((need) => ["new", "working", "scheduled"].includes(need.status));
  const completedNeeds = needs.filter((need) => ["completed", "closed"].includes(need.status));
  const managerHouseholdIds = new Set(
    memberships.filter((membership) => membership.role === "manager").map((membership) => membership.household_id),
  );

  return (
    <div className="connector-member-shell">
      <section className="connector-welcome-card">
        <div>
          <p className="eyebrow">Your Connector</p>
          <h2>{connector.display_name}</h2>
          <p>{connector.intro}</p>
        </div>
        <div className="connector-member-identity">
          <span>Signed in as</span>
          <strong>{person.display_name}</strong>
          <button className="text-button" type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </section>

      <section className="panel connector-need-form-panel">
        <div>
          <p className="eyebrow">Need something?</p>
          <h2>Tell {connector.display_name} what is going on.</h2>
          <p className="muted">It does not have to be a commercial job. Ask for practical help, information, or the right connection.</p>
        </div>
        <form className="form" onSubmit={submitNeed}>
          <label>
            What do you need?
            <input name="title" required maxLength={160} placeholder="Branches removed, a ride, help finding someone..." />
          </label>
          <label>
            A little more detail
            <textarea name="details" rows={4} placeholder="Add timing, location area, or anything that helps explain the need." />
          </label>
          {households.some((household) => managerHouseholdIds.has(household.id)) ? (
            <label>
              Is this for your household?
              <select name="household_id" defaultValue="">
                <option value="">No, this is for me</option>
                {households
                  .filter((household) => managerHouseholdIds.has(household.id))
                  .map((household) => (
                    <option key={household.id} value={household.id}>
                      {household.name || "My household"}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Sending..." : `Ask ${connector.display_name} for help`}
          </button>
          {formMessage ? <p className="notice good">{formMessage}</p> : null}
        </form>
      </section>

      <section className="connector-dashboard-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Current</p>
            <h2>Things we&apos;re working on</h2>
          </div>
        </div>
        {openNeeds.length ? (
          <div className="connector-need-list">
            {openNeeds.map((need) => (
              <article className="card connector-need-card" key={need.id}>
                <div className="connector-need-card-top">
                  <h3>{need.title}</h3>
                  <span className={`connector-status connector-status-${need.status}`}>{statusLabel(need.status)}</span>
                </div>
                {need.details ? <p>{need.details}</p> : null}
                <p className="muted">
                  Started {formatDate(need.created_at)}
                  {need.scheduled_for ? ` · Scheduled ${formatDate(need.scheduled_for)}` : ""}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty connector-empty">
            <h3>Nothing open right now</h3>
            <p>When you send a need, it will appear here while you and {connector.display_name} work on it.</p>
          </div>
        )}
      </section>

      <section className="connector-dashboard-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shared activity</p>
            <h2>Your relationship history</h2>
          </div>
        </div>
        {interactions.length ? (
          <div className="connector-history-list">
            {interactions.map((interaction) => (
              <article className="connector-history-item" key={interaction.id}>
                <time dateTime={interaction.occurred_at}>{formatDate(interaction.occurred_at)}</time>
                <p>{interaction.note}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Shared updates will appear here. Private Connector Notes never do.</p>
        )}
      </section>

      <section className="connector-dashboard-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">History</p>
            <h2>Things we&apos;ve completed</h2>
          </div>
        </div>
        {completedNeeds.length ? (
          <div className="connector-need-list">
            {completedNeeds.map((need) => (
              <article className="card connector-need-card connector-need-completed" key={need.id}>
                <div className="connector-need-card-top">
                  <h3>{need.title}</h3>
                  <span className={`connector-status connector-status-${need.status}`}>{statusLabel(need.status)}</span>
                </div>
                <p className="muted">{formatDate(need.completed_at || need.updated_at)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Completed needs will stay here as a simple history.</p>
        )}
      </section>

      {households.length ? (
        <section className="panel connector-household-panel">
          <p className="eyebrow">Your household</p>
          {households.map((household) => (
            <div key={household.id}>
              <h2>{household.name || "Your household"}</h2>
              <p className="muted">{[household.town, household.state, household.zip].filter(Boolean).join(", ")}</p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
