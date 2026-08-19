import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClaimPersonProfile } from "@/components/ClaimPersonProfile";
import { SiteHeader } from "@/components/SiteHeader";
import { getPersonClaimInvitation } from "@/lib/personClaims";

export const metadata: Metadata = {
  title: "Your private invitation",
  description: "Claim the Localized.life profile created for you.",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function PersonClaimPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getPersonClaimInvitation(token);
  if (!invitation) notFound();

  const location = [invitation.person.town, invitation.person.state].filter(Boolean).join(", ");

  return (
    <main className="page narrow connector-page connector-claim-page person-claim-page">
      <SiteHeader product="Project hub" />
      <section className="connector-public-hero connector-personal-hero person-claim-hero">
        <div>
          <p className="eyebrow">A private invitation from {invitation.referrer.displayName}</p>
          <h1>{invitation.person.displayName}</h1>
          <p className="lede">Your Localized.life profile is ready.</p>
        </div>
        <div className="connector-promise-card">
          <p>Your private link</p>
          <strong>Use this page to claim the profile that was created for you.</strong>
        </div>
      </section>

      {invitation.state === "active" ? (
        <>
          <section className="panel person-claim-summary">
            <div>
              <p className="eyebrow">Your profile</p>
              <h2>{invitation.person.displayName}</h2>
              <p className="muted">
                {location || "Location not added"} · Connected with {invitation.referrer.displayName}
              </p>
            </div>
            <p>This page is private. Claiming it unlocks posting, requests, connections, and your full account.</p>
          </section>
          <ClaimPersonProfile
            token={token}
            personName={invitation.person.displayName}
            contactHint={invitation.person.contactHint}
            returnTo="/account"
          />
        </>
      ) : (
        <section className="notice bad stack">
          <h2>This private link is no longer active.</h2>
          <p>
            {invitation.state === "claimed"
              ? "This profile already has an account. Sign in to continue."
              : `Ask ${invitation.referrer.displayName} for a new link.`}
          </p>
          {invitation.state === "claimed" ? <a className="button primary compact-button" href="/account">Account sign in</a> : null}
        </section>
      )}
    </main>
  );
}
