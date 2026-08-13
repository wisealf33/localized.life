import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClaimPersonProfile } from "@/components/ClaimPersonProfile";
import { SiteHeader } from "@/components/SiteHeader";
import { getClaimInvitation } from "@/lib/connectorClaims";

export const metadata: Metadata = {
  title: "Claim your Localized.life profile",
  description: "Claim the Person profile your local Connector started for you.",
  robots: { index: false, follow: false },
};

export default async function PersonalizedConnectorPage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const invitation = await getClaimInvitation(slug, token);
  if (!invitation) notFound();

  return (
    <main className="page narrow connector-page connector-claim-page">
      <SiteHeader product="Project hub" />
      <section className="connector-public-hero connector-personal-hero">
        <div><p className="eyebrow">A personal invitation from {invitation.connector.display_name}</p><h1>{invitation.person.displayName}, your place is ready.</h1><p className="lede">{invitation.connector.display_name} started a Person profile for you after connecting in real life. Claim it to keep that same relationship, Needs, and shared history.</p></div>
        <div className="connector-promise-card"><p>One identity</p><strong>You are claiming the existing Person—not creating a customer record or a duplicate.</strong></div>
      </section>
      {invitation.state === "active" ? <ClaimPersonProfile token={token} personName={invitation.person.displayName} emailHint={invitation.person.emailHint} /> : <section className="notice bad stack"><h2>This invitation is {invitation.state}.</h2><p>Ask {invitation.connector.display_name} to create a fresh private invitation from My Connections.</p></section>}
    </main>
  );
}
