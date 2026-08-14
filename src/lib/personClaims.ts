import "server-only";

import { getSupabaseAdmin } from "./supabase";
import { hashSecret } from "./tokens";

export async function getPersonClaimInvitation(token: string) {
  if (!token || token.length < 32) return null;

  const supabase = getSupabaseAdmin();
  const { data: invitation, error } = await supabase
    .from("person_claim_invitations")
    .select("id, person_id, referring_person_id, expires_at, claimed_at, revoked_at, created_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();
  if (error || !invitation) return null;

  const [{ data: person }, { data: referrer }] = await Promise.all([
    supabase
      .from("people")
      .select("id, display_name, email, town, state, claim_status, claimed_at")
      .eq("id", invitation.person_id)
      .maybeSingle(),
    supabase
      .from("people")
      .select("id, display_name, town, state")
      .eq("id", invitation.referring_person_id)
      .maybeSingle(),
  ]);
  if (!person || !referrer) return null;

  const expired = invitation.expires_at ? new Date(invitation.expires_at).getTime() <= Date.now() : false;
  const state = invitation.revoked_at
    ? "revoked"
    : invitation.claimed_at || person.claim_status === "claimed"
      ? "claimed"
      : expired
        ? "expired"
        : "active";

  return {
    invitationId: invitation.id,
    person: {
      id: person.id,
      displayName: person.display_name,
      town: person.town,
      state: person.state,
      emailHint: person.email ? person.email.replace(/^(.).+(@.+)$/, "$1•••$2") : null,
    },
    referrer: {
      id: referrer.id,
      displayName: referrer.display_name,
      town: referrer.town,
      state: referrer.state,
    },
    state,
    expiresAt: invitation.expires_at,
  } as const;
}
