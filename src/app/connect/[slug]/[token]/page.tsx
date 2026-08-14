import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClaimPersonProfile } from "@/components/ClaimPersonProfile";
import { InvitationPersonPortal } from "@/components/InvitationPersonPortal";
import { SiteHeader } from "@/components/SiteHeader";
import { getClaimInvitation } from "@/lib/connectorClaims";

export const metadata: Metadata = {
  title: "Your private Localized.life profile",
  description: "Manage work, requests, and useful local help with your Connector.",
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
      <SiteHeader product="Project hub" />
      <section className="connector-public-hero connector-personal-hero">
        <div><p className="eyebrow">Private profile with {invitation.connector.display_name}</p><h1>{invitation.person.displayName}&apos;s Localized.life</h1><p className="lede">Keep track of work, requests, and useful help from this one private link. You do not need to create an account yet.</p></div>
        <div className="connector-promise-card"><p>Private link access</p><strong>This link opens your working profile. Keep it private and return anytime.</strong></div>
      </section>
      {invitation.state === "active" ? (
        <>
          <InvitationPersonPortal token={token} />
          <details className="panel connector-claim-later">
            <summary><span><small>Optional for now</small><strong>Claim this profile for permanent access</strong></span><span aria-hidden="true">+</span></summary>
            <div className="connector-claim-later-body">
              <p>You can keep using the private link above. Claiming later gives you normal sign-in access, so you will not need to find this link each time.</p>
              <ClaimPersonProfile token={token} personName={invitation.person.displayName} emailHint={invitation.person.emailHint} />
            </div>
          </details>
        </>
      ) : <section className="notice bad stack"><h2>This invitation is {invitation.state}.</h2><p>{invitation.state === "claimed" ? "This profile now uses normal Localized.life sign-in." : `Ask ${invitation.connector.display_name} for a fresh private link.`}</p></section>}
    </main>
  );
}
