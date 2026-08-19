import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClaimPersonProfile } from "@/components/ClaimPersonProfile";
import { InvitationPersonPortal } from "@/components/InvitationPersonPortal";
import { SiteHeader } from "@/components/SiteHeader";
import { getClaimInvitation } from "@/lib/connectorClaims";

export const metadata: Metadata = {
  title: "Your Localized.life page",
  description: "View requests, work, and shared updates on your private Localized.life page.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function PersonalizedConnectorPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const invitation = await getClaimInvitation(slug, token);
  if (!invitation) notFound();

  return (
    <main className="page narrow connector-page connector-claim-page">
      <SiteHeader product="Connector" />
      <section className="connector-public-hero connector-personal-hero">
        <div><p className="eyebrow">Connected with {invitation.connector.display_name}</p><h1>{invitation.person.displayName}</h1><p className="lede">See current requests, add something new, and keep up with shared updates.</p></div>
        <div className="connector-promise-card"><p>About this page</p><strong>This is a private page. Save the link so you can return anytime.</strong></div>
      </section>
      {invitation.state === "active" ? (
        <>
          <ClaimPersonProfile token={token} personName={invitation.person.displayName} contactHint={invitation.person.contactHint} />
          <InvitationPersonPortal token={token} />
        </>
      ) : <section className="notice bad stack"><h2>This private link is no longer active.</h2><p>{invitation.state === "claimed" ? "This profile already has an account. Sign in to continue." : `Ask ${invitation.connector.display_name} for a new link.`}</p>{invitation.state === "claimed" ? <a className="button primary compact-button" href="/account">Account sign in</a> : null}</section>}
    </main>
  );
}
