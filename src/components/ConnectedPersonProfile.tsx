"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  EnvelopeSimple,
  HandHeart,
  MapPin,
  Phone,
  ShareNetwork,
  ShieldCheck,
  UserCircle,
  Wrench,
} from "@phosphor-icons/react";
import { AccountSignIn } from "@/components/AccountSignIn";
import { localServices } from "@/lib/localServices";
import { getSupabaseBrowser, isSupabaseBrowserConfigured } from "@/lib/supabase-browser";

type ConnectedPersonData = {
  person: {
    display_name: string;
    email: string | null;
    phone: string | null;
    town: string | null;
    state: string | null;
    skills: string[] | null;
    services_wanted: string[] | null;
    service_radius_miles: number | null;
  };
  connection: {
    connected_at: string;
    relationship_direction: "introduced_by_you" | "introduced_you" | "established_connection";
  };
};

type ViewState =
  | { status: "loading" }
  | { status: "config" }
  | { status: "signed-out" }
  | { status: "error"; message: string }
  | { status: "ready"; data: ConnectedPersonData };

function previewData(): ConnectedPersonData {
  return {
    person: {
      display_name: "Jennifer Deardorff",
      email: "jennifer@example.com",
      phone: "630-555-0187",
      town: "Peotone",
      state: "IL",
      skills: ["cooking-meal-sharing", "house-cleaning", "garden-help"],
      services_wanted: ["handyman-repairs", "yard-cleanup"],
      service_radius_miles: 15,
    },
    connection: {
      connected_at: "2026-08-19T12:00:00Z",
      relationship_direction: "introduced_by_you",
    },
  };
}

function serviceNames(slugs: string[] | null) {
  const selected = new Set(slugs || []);
  return localServices.filter((service) => selected.has(service.slug)).map((service) => service.title);
}

function relationshipCopy(data: ConnectedPersonData) {
  if (data.connection.relationship_direction === "introduced_by_you") {
    return `You introduced ${data.person.display_name} to Localized.life. This direct referral also creates a mutual Person connection.`;
  }
  if (data.connection.relationship_direction === "introduced_you") {
    return `${data.person.display_name} introduced you to Localized.life. Your direct referral relationship creates this mutual Person connection.`;
  }
  return `You and ${data.person.display_name} are connected through an established Localized.life relationship.`;
}

function connectedDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function ConnectedPersonProfile({ personId, preview = false }: { personId: string; preview?: boolean }) {
  const [view, setView] = useState<ViewState>(() => {
    if (preview) return { status: "ready", data: previewData() };
    return isSupabaseBrowserConfigured() ? { status: "loading" } : { status: "config" };
  });

  useEffect(() => {
    if (preview) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) {
        setView({ status: "signed-out" });
        return;
      }
      const response = await fetch(`/api/account/people/${encodeURIComponent(personId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setView({ status: "error", message: result.error || "This connection could not be opened." });
        return;
      }
      setView({ status: "ready", data: result });
    });
  }, [personId, preview]);

  if (view.status === "loading") return <section className="account-loading">Opening this connection…</section>;
  if (view.status === "config") return <section className="notice bad">Account access is not configured.</section>;
  if (view.status === "signed-out") return <AccountSignIn title="Sign in to view this connection" returnTo={`/account/people/${personId}`} />;
  if (view.status === "error") {
    return <section className="connected-profile-error"><Link href="/account"><ArrowLeft /> Back to my account</Link><div className="notice bad">{view.message}</div></section>;
  }

  const { data } = view;
  const skills = serviceNames(data.person.skills);
  const wanted = serviceNames(data.person.services_wanted);
  const location = [data.person.town, data.person.state].filter(Boolean).join(", ");

  return (
    <div className="connected-profile">
      <Link className="connected-profile-back" href="/account"><ArrowLeft /> My account</Link>

      <header className="connected-profile-header">
        <div className="connected-profile-avatar" aria-hidden="true"><UserCircle weight="duotone" /></div>
        <div>
          <p className="connected-profile-label">Your connection</p>
          <h1>{data.person.display_name}</h1>
          <p className="connected-profile-location"><MapPin weight="fill" /> {location || "Location not added"}</p>
        </div>
        <div className="connected-profile-contact">
          {data.person.phone ? <a className="button" href={`tel:${data.person.phone}`}><Phone /> Call or text</a> : null}
          {data.person.email ? <a className="button" href={`mailto:${data.person.email}`}><EnvelopeSimple /> Email</a> : null}
        </div>
      </header>

      <section className="connected-profile-relationship" aria-labelledby="connection-relationship-title">
        <ShareNetwork weight="duotone" aria-hidden="true" />
        <div><h2 id="connection-relationship-title">Direct relationship</h2><p>{relationshipCopy(data)}</p><small>Connected {connectedDate(data.connection.connected_at)}</small></div>
      </section>

      <div className="connected-profile-grid">
        <section className="connected-profile-section" aria-labelledby="connection-skills-title">
          <div className="connected-profile-section-heading"><Wrench weight="duotone" /><h2 id="connection-skills-title">Services they can provide</h2></div>
          {skills.length ? <ul className="connected-profile-tags">{skills.map((skill) => <li key={skill}>{skill}</li>)}</ul> : <p>No services selected yet.</p>}
          {data.person.service_radius_miles !== null ? <small>Service area: {data.person.service_radius_miles === 0 ? "at their location" : `within ${data.person.service_radius_miles} miles`}</small> : null}
        </section>

        <section className="connected-profile-section" aria-labelledby="connection-wanted-title">
          <div className="connected-profile-section-heading"><HandHeart weight="duotone" /><h2 id="connection-wanted-title">Services they may need</h2></div>
          {wanted.length ? <ul className="connected-profile-tags wanted">{wanted.map((service) => <li key={service}>{service}</li>)}</ul> : <p>No services selected yet.</p>}
        </section>
      </div>

      <section className="connected-profile-privacy">
        <ShieldCheck weight="duotone" aria-hidden="true" />
        <div><h2>Shared with connections</h2><p>This view includes connection-safe profile information. Exact address, household details, calendar activity, private notes, management information, and wallet activity remain private.</p></div>
      </section>
    </div>
  );
}
