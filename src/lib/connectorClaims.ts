import "server-only";

import { getSupabaseAdmin } from "./supabase";
import { hashSecret } from "./tokens";

export async function getClaimInvitation(slug: string, token: string) {
  if (!token || token.length < 32) return null;
  const supabase = getSupabaseAdmin();
  const { data: invitation, error } = await supabase
    .from("connector_claim_invitations")
    .select("id, person_id, connector_person_id, expires_at, claimed_at, revoked_at, created_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();
  if (error || !invitation) return null;

  const [{ data: connector }, { data: person }] = await Promise.all([
    supabase
      .from("connector_profiles")
      .select("person_id, slug, display_name, headline, intro, active")
      .eq("person_id", invitation.connector_person_id)
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("people")
      .select("id, display_name, email, town, state, claim_status, claimed_at")
      .eq("id", invitation.person_id)
      .maybeSingle(),
  ]);
  if (!connector || !person) return null;

  const expired = new Date(invitation.expires_at).getTime() <= Date.now();
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
    connector,
    state,
    expiresAt: invitation.expires_at,
  } as const;
}
