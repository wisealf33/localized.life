"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function ClaimPersonProfile({
  token,
  personName,
  emailHint,
  returnTo = "/account",
}: {
  token: string;
  personName: string;
  emailHint: string | null;
  returnTo?: string;
}) {
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [claimed, setClaimed] = useState(false);

  const claim = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    const { data } = (await supabase?.auth.getSession()) || { data: { session: null } };
    if (!data.session) return;
    setBusy(true);
    const response = await fetch("/api/connect/claim", {
      method: "POST",
      headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(payload.error || "We could not connect this profile to your account.");
      return;
    }
    setClaimed(true);
    setMessage("Your account is ready. You can now sign in from any device.");
  }, [token]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const check = window.setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      setSignedIn(Boolean(data.session));
    }, 0);
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => {
      window.clearTimeout(check);
      listener.subscription.unsubscribe();
    };
  }, [claim]);

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    if (password.length < 8) {
      setMessage("Use at least 8 characters for your password.");
      return;
    }
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.href },
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (data.session) await claim();
    else setMessage("Check your email to confirm your account, then return to this page.");
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) setMessage(error.message);
  }

  async function magicLink(event: MouseEvent<HTMLButtonElement>) {
    const emailInput = event.currentTarget.closest("form")?.querySelector<HTMLInputElement>("input[name='email']");
    const email = emailInput?.value.trim() || "";
    const supabase = getSupabaseBrowser();
    if (!supabase || !email) {
      setMessage("Add your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.href },
    });
    setBusy(false);
    setMessage(error ? error.message : "Check your email for a private sign-in link.");
  }

  async function signOut() {
    await getSupabaseBrowser()?.auth.signOut();
    setSignedIn(false);
    setMessage("");
  }

  if (claimed) {
    return <section className="panel connector-claim-panel"><p className="eyebrow">Account ready</p><h2>Welcome, {personName}</h2><p>{message}</p><Link className="button primary" href={returnTo}>Open my account</Link></section>;
  }

  if (signedIn) {
    return <section className="panel connector-claim-panel"><p className="eyebrow">Signed in</p><h2>Is this the account for {personName}?</h2><p className="muted">Continue if this account belongs to {personName}. Otherwise, sign in with another account.</p><div className="toolbar"><button className="button primary" type="button" disabled={busy} onClick={claim}>{busy ? "Connecting…" : "Yes, continue"}</button><button className="button" type="button" disabled={busy} onClick={signOut}>Use another account</button></div>{message ? <p className="notice bad">{message}</p> : null}</section>;
  }

  return (
    <section className="connector-claim-grid">
      <form className="panel form connector-claim-panel" onSubmit={createAccount}>
        <p className="eyebrow">New account</p>
        <h2>Create your account</h2>
        {emailHint ? <p className="muted">Use the email address connected to this page ({emailHint}).</p> : null}
        <label>Email<input data-claim-email name="email" type="email" autoComplete="email" required /></label>
        <label>Create password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <button className="button primary" type="submit" disabled={busy}>Create my account</button>
      </form>
      <form className="panel form connector-claim-panel" onSubmit={signIn}>
        <p className="eyebrow">Returning member</p>
        <h2>Sign in</h2>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="button" type="submit" disabled={busy}>Sign in and continue</button>
        <button className="text-button" type="button" onClick={magicLink} disabled={busy}>Email me a sign-in link instead</button>
      </form>
      {message ? <p className="notice connector-claim-message">{message}</p> : null}
    </section>
  );
}
