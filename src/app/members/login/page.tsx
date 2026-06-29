import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { adminLogin, isAdminAuthenticated } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Members login",
  description: "Sign in to reach the Localized.life member dashboard and private project tools.",
  path: "/members/login",
});

export default async function MembersLoginPage() {
  const isMember = await isAdminAuthenticated();

  return (
    <main className="page">
      <SiteHeader active="members" product="Project hub" />

      <section className="stack">
        <p className="eyebrow">Members</p>
        <h1>Members login</h1>
        <p>
          Sign in to reach the private Localized.life dashboard for reviewing submissions, managing local project work,
          and keeping public listings organized.
        </p>
      </section>

      {isMember ? (
        <section className="panel stack">
          <h2>You are already signed in.</h2>
          <p className="muted">Open the member dashboard to continue managing Localized.life tools.</p>
          <div className="toolbar">
            <Link className="button primary" href="/members/dashboard">
              Open Members dashboard
            </Link>
            <Link className="button" href="/">
              Back to Localized.life
            </Link>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2>Sign in</h2>
          <form action={adminLogin} className="form">
            <input type="hidden" name="redirect_to" value="/members/dashboard" />
            <label>
              Member password
              <input name="admin_password" type="password" required />
            </label>
            <button className="button primary" type="submit">
              Open Members dashboard
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
