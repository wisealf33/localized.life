"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type ClaimResponse = {
  error?: string;
  login?: { type: "email" | "phone"; value: string };
};

export function ClaimPersonProfile({
  token,
  personName,
  contactHint,
  returnTo = "/account",
}: {
  token: string;
  personName: string;
  contactHint: string | null;
  returnTo?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claimed, setClaimed] = useState(false);

  async function claimProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = String(new FormData(event.currentTarget).get("password") || "");
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }

    setBusy(true);
    setMessage("");
    const response = await fetch("/api/connect/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const payload = (await response.json().catch(() => ({}))) as ClaimResponse;

    if (!response.ok || !payload.login) {
      setBusy(false);
      setMessage(payload.error || "We could not claim this profile.");
      return;
    }

    const supabase = getSupabaseBrowser();
    const credentials = payload.login.type === "email"
      ? { email: payload.login.value, password }
      : { phone: payload.login.value, password };
    const { error } = (await supabase?.auth.signInWithPassword(credentials)) || {
      error: new Error("Account sign-in is not available right now."),
    };

    if (error) {
      setBusy(false);
      setClaimed(true);
      setMessage("Your profile is claimed, but automatic sign-in did not finish. Use the account sign-in link below.");
      return;
    }

    window.location.assign(returnTo);
  }

  if (claimed) {
    return (
      <section className="panel connector-claim-panel">
        <p className="eyebrow">Profile claimed</p>
        <h2>Your account is ready, {personName}</h2>
        <p>{message}</p>
        <Link className="button primary" href="/account">Account sign in</Link>
      </section>
    );
  }

  return (
    <form className="panel form connector-claim-panel connector-password-claim" onSubmit={claimProfile}>
      <p className="eyebrow">Claim your existing profile</p>
      <h2>Create your password</h2>
      <p className="muted">
        Your profile has already been started. Create one password to claim it—there is no separate registration form.
      </p>
      {contactHint ? <p className="connector-claim-identity">Your sign-in is already connected to the {contactHint}.</p> : null}
      <label>
        Create password
        <input name="password" type="password" minLength={8} maxLength={72} autoComplete="new-password" required autoFocus />
      </label>
      <button className="button primary" type="submit" disabled={busy}>
        {busy ? "Claiming your profile…" : "Create password and open my account"}
      </button>
      <p className="muted connector-small-copy">After this, you will be signed in and can complete the rest of your profile yourself.</p>
      {message ? <p className="notice bad" role="alert">{message}</p> : null}
    </form>
  );
}
