"use client";

import { FormEvent, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AccountSignIn({
  title = "Sign in to Localized.life",
  returnTo,
}: {
  title?: string;
  returnTo: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");
    const supabase = getSupabaseBrowser();
    if (!supabase || !email || !password) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(error ? error.message : "Signed in. Opening your account…");
  }

  async function sendMagicLink() {
    const form = document.querySelector<HTMLFormElement>("[data-account-sign-in]");
    const email = form ? String(new FormData(form).get("email") || "").trim() : "";
    const supabase = getSupabaseBrowser();
    if (!supabase || !email) {
      setMessage("Add your email address first.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${returnTo}` },
    });
    setBusy(false);
    setMessage(error ? error.message : "Check your email for a private sign-in link.");
  }

  return (
    <section className="panel connector-login-panel">
      <p className="eyebrow">Your normal account</p>
      <h2>{title}</h2>
      <p className="muted">Use your email and password. A private email link is also available.</p>
      <form className="form connector-login-form" onSubmit={signIn} data-account-sign-in>
        <label>
          Email address
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="button primary" type="submit" disabled={busy}>
          {busy ? "Working…" : "Sign in"}
        </button>
        <button className="button" type="button" onClick={sendMagicLink} disabled={busy}>
          Email me a sign-in link instead
        </button>
      </form>
      {message ? <p className="notice">{message}</p> : null}
    </section>
  );
}
