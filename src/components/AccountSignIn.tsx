"use client";

import { FormEvent, useState } from "react";
import { authLoginFromInput, passwordAuthEmail } from "@/lib/authIdentity";
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
    const login = authLoginFromInput(String(data.get("login") || ""));
    const password = String(data.get("password") || "");
    const supabase = getSupabaseBrowser();
    if (!supabase || !login || !password) {
      setMessage("Enter a valid email address or phone number and your password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: passwordAuthEmail(login),
      password,
    });
    setBusy(false);
    setMessage(error ? error.message : "Signed in. Opening your account…");
  }

  async function sendMagicLink() {
    const form = document.querySelector<HTMLFormElement>("[data-account-sign-in]");
    const login = form ? authLoginFromInput(String(new FormData(form).get("login") || "")) : null;
    const supabase = getSupabaseBrowser();
    if (!supabase || !login) {
      setMessage("Add your email address first.");
      return;
    }
    if (login.type !== "email") {
      setMessage("Phone-based accounts sign in with their phone number and password.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: login.value,
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}${returnTo}` },
    });
    setBusy(false);
    setMessage(error ? error.message : "Check your email for a private sign-in link.");
  }

  return (
    <section className="panel connector-login-panel">
      <p className="eyebrow">Account access</p>
      <h2>{title}</h2>
      <p className="muted">Use the email address or phone number connected to your profile and your password.</p>
      <form className="form connector-login-form" onSubmit={signIn} data-account-sign-in>
        <label>
          Email address or phone number
          <input name="login" type="text" inputMode="email" autoComplete="username" required />
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
