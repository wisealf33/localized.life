import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { adminLogout, isAdminAuthenticated } from "@/lib/admin";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Members dashboard",
  description: "Private Localized.life dashboard for member project tools and review queues.",
  path: "/members/dashboard",
});

export default async function MembersDashboardPage() {
  const isMember = await isAdminAuthenticated();

  return (
    <main className="page">
      <SiteHeader active="members" product="Project hub" />

      <section className="stack">
        <p className="eyebrow">Members</p>
        <h1>Members dashboard</h1>
        <p>
          A central door into the private tools for Localized.life projects, review queues, and local project work.
        </p>
      </section>

      {!isMember ? (
        <section className="panel stack">
          <h2>Member login required</h2>
          <p className="muted">Sign in to open the member dashboard and private project tools.</p>
          <Link className="button primary" href="/members/login">
            Members login
          </Link>
        </section>
      ) : (
        <>
          <section className="grid two">
            <article className="card stack">
              <p className="eyebrow">SaleTrail</p>
              <h2>Admin and review tools</h2>
              <p className="muted">
                Review claims, corrections, local submissions, event leads, outreach, and manual listing work.
              </p>
              <Link className="button primary" href="/saletrail/admin">
                Open SaleTrail tools
              </Link>
            </article>

            <article className="card stack">
              <p className="eyebrow">Harvest</p>
              <h2>Harvest project pages</h2>
              <p className="muted">
                Check the public harvest registry, Paw Paw Revival fundraiser, and planting sponsorship pages.
              </p>
              <Link className="button" href="/harvest">
                Open Harvest
              </Link>
            </article>
          </section>

          <section className="panel stack">
            <h2>Account</h2>
            <p className="muted">Use this when you are finished working in the private tools on a shared device.</p>
            <form action={adminLogout}>
              <input type="hidden" name="redirect_to" value="/members/login" />
              <button className="button ghost" type="submit">
                Sign out
              </button>
            </form>
          </section>
        </>
      )}
    </main>
  );
}
