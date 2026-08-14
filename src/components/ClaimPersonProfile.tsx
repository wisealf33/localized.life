"use client";

import Link from "next/link";
import { FormEvent, MouseEvent, useCallback, useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function ClaimPersonProfile({
  token,
  personName,
  emailHint,
}: {
  token: string;
  personName: string;
  emailHint: string | null;
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
      setMessage(payload.error || "This profile could not be claimed.");
      return;
    }
    setClaimed(true);
    setMessage("Your existing Person profile is now your account. Its history stayed with you.");
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
    else setMessage("Check your email to confirm your account, then this same invitation will finish the claim.");
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
    return <section className="panel connector-claim-panel"><p className="eyebrow">Profile claimed</p><h2>Welcome back, {personName}</h2><p>{message}</p><Link className="button primary" href="/connector/dashboard">Open your Localized.life dashboard</Link></section>;
  }

  if (signedIn) {
    return <section className="panel connector-claim-panel"><p className="eyebrow">Account detected</p><h2>Attach this account to {personName}</h2><p className="muted">Only continue if this browser is signed into {personName}&apos;s own account. This keeps the existing Person and history.</p><div className="toolbar"><button className="button primary" type="button" disabled={busy} onClick={claim}>{busy ? "Claiming…" : "Claim My Profile"}</button><button className="button" type="button" disabled={busy} onClick={signOut}>Use a different account</button></div>{message ? <p className="notice bad">{message}</p> : null}</section>;
  }

  return (
    <section className="connector-claim-grid">
      <form className="panel form connector-claim-panel" onSubmit={createAccount}>
        <p className="eyebrow">New to Localized.life</p>
        <h2>Create your normal account</h2>
        {emailHint ? <p className="muted">Use the address Garrett has for you ({emailHint}).</p> : null}
        <label>Email<input data-claim-email name="email" type="email" autoComplete="email" required /></label>
        <label>Create password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
        <button className="button primary" type="submit" disabled={busy}>Create account and claim</button>
      </form>
      <form className="panel form connector-claim-panel" onSubmit={signIn}>
        <p className="eyebrow">Already have an account</p>
        <h2>Sign in and claim</h2>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
        <button className="button" type="submit" disabled={busy}>Sign in</button>
        <button className="text-button" type="button" onClick={magicLink} disabled={busy}>Email me a sign-in link instead</button>
      </form>
      {message ? <p className="notice connector-claim-message">{message}</p> : null}
    </section>
  );
}
