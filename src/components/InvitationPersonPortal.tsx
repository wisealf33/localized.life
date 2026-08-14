"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Need = {
  id: string;
  title: string;
  details: string;
  status: "new" | "working" | "scheduled" | "completed" | "closed";
  scheduled_for: string | null;
  completed_at: string | null;
  amount_cents: number | null;
  created_at: string;
  updated_at: string;
};

type PortalData = {
  person: { id: string; displayName: string; town: string | null; state: string | null };
  connector: { person_id: string; display_name: string; intro: string };
  needs: Need[];
  interactions: Array<{ id: string; need_id: string | null; note: string; occurred_at: string }>;
};

function date(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(value),
  );
}

function money(cents: number | null) {
  if (cents === null) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const statusLabels: Record<Need["status"], string> = {
  new: "New request",
  working: "In progress",
  scheduled: "Scheduled",
  completed: "Finished",
  closed: "No longer needed",
};

export function InvitationPersonPortal({ token }: { token: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/connect/portal", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error || "This private profile could not be opened.");
      return;
    }
    setData(payload);
    setError("");
  }, [token]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/connect/portal", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "That change could not be saved.");
    return payload as { message?: string };
  }

  async function addNeed(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      const result = await post({
        action: "add-need",
        title: values.get("title"),
        details: values.get("details"),
      });
      form.reset();
      setMessage(result.message || "Your request was added.");
      await load();
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : "That request could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function resolveNeed(needId: string, status: "completed" | "closed") {
    setBusy(true);
    setMessage("");
    try {
      const result = await post({ action: "resolve-need", needId, status });
      setMessage(result.message || "The Need was updated.");
      await load();
    } catch (nextError) {
      setMessage(nextError instanceof Error ? nextError.message : "That Need could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <section className="notice bad"><h2>Private profile unavailable</h2><p>{error}</p></section>;
  if (!data) return <section className="panel connector-loading">Opening this private profile…</section>;

  const openNeeds = data.needs.filter((need) => ["new", "working", "scheduled"].includes(need.status));
  const completedNeeds = data.needs.filter((need) => ["completed", "closed"].includes(need.status));

  return (
    <div className="connector-invitation-portal">
      <section className="connector-portal-summary">
        <div><span>Open</span><strong>{openNeeds.length}</strong><small>Needs or jobs</small></div>
        <div><span>History</span><strong>{completedNeeds.length}</strong><small>Finished or closed</small></div>
        <div><span>Connected with</span><strong>{data.connector.display_name}</strong><small>Your local Connector</small></div>
      </section>

      {message ? <p className="notice good" aria-live="polite">{message}</p> : null}

      <section className="grid two connector-portal-main-grid">
        <article className="panel connector-portal-current">
          <p className="eyebrow">Current work and requests</p>
          <h2>What&apos;s happening now</h2>
          {openNeeds.length ? (
            <div className="connector-need-list">
              {openNeeds.map((need) => (
                <article className="card connector-need-card connector-portal-need-card" key={need.id}>
                  <div className="connector-need-card-top">
                    <h3>{need.title}</h3>
                    <span className={`connector-status connector-status-${need.status}`}>{statusLabels[need.status]}</span>
                  </div>
                  {need.details ? <p>{need.details}</p> : null}
                  <p className="muted connector-small-copy">
                    Added {date(need.created_at)}
                    {need.scheduled_for ? ` · Scheduled ${date(need.scheduled_for)}` : ""}
                    {need.amount_cents !== null ? ` · ${money(need.amount_cents)}` : ""}
                  </p>
                  <div className="toolbar connector-portal-need-actions">
                    <button className="button compact-button" type="button" disabled={busy} onClick={() => resolveNeed(need.id, "completed")}>This is finished</button>
                    <button className="text-button" type="button" disabled={busy} onClick={() => resolveNeed(need.id, "closed")}>I no longer need this</button>
                  </div>
                </article>
              ))}
            </div>
          ) : <div className="empty connector-empty"><h3>Nothing open right now</h3><p>A new request will appear here for you and {data.connector.display_name} to follow together.</p></div>}
        </article>

        <form className="panel form connector-portal-request" onSubmit={addNeed}>
          <div><p className="eyebrow">Request something</p><h2>What do you need?</h2><p className="muted">This can be practical help, a job, information, or a useful local connection.</p></div>
          <label>Short title<input name="title" required maxLength={160} placeholder="Yard cleanup, a repair, help finding someone…" /></label>
          <label>A little more detail<textarea name="details" rows={5} placeholder="Add timing, location area, or anything that helps explain it." /></label>
          <button className="button primary" type="submit" disabled={busy}>{busy ? "Saving…" : `Send request to ${data.connector.display_name}`}</button>
        </form>
      </section>

      {data.interactions.length ? (
        <section className="connector-dashboard-section">
          <div className="section-heading"><div><p className="eyebrow">Shared updates</p><h2>Notes shared with you</h2></div></div>
          <div className="connector-history-list">
            {data.interactions.map((interaction) => <article className="connector-history-item" key={interaction.id}><time dateTime={interaction.occurred_at}>{date(interaction.occurred_at)}</time><p>{interaction.note}</p></article>)}
          </div>
        </section>
      ) : null}

      {completedNeeds.length ? (
        <section className="connector-dashboard-section">
          <div className="section-heading"><div><p className="eyebrow">History</p><h2>Finished and closed</h2></div></div>
          <div className="connector-need-list connector-portal-history-grid">
            {completedNeeds.map((need) => <article className="card connector-need-card connector-need-completed" key={need.id}><div className="connector-need-card-top"><h3>{need.title}</h3><span className={`connector-status connector-status-${need.status}`}>{statusLabels[need.status]}</span></div><p className="muted">{date(need.completed_at || need.updated_at)}</p></article>)}
          </div>
        </section>
      ) : null}
    </div>
  );
}
