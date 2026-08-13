import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashSecret } from "@/lib/tokens";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!accessToken) return NextResponse.json({ error: "Sign in to claim this profile." }, { status: 401 });

  const { token } = (await request.json().catch(() => ({}))) as { token?: string };
  if (!token || token.length < 32) return NextResponse.json({ error: "This invitation is not valid." }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  const user = userData.user;
  if (userError || !user?.email || !user.email_confirmed_at) {
    return NextResponse.json({ error: "Confirm your email, then open this invitation again." }, { status: 401 });
  }

  const { data: invitation, error: invitationError } = await supabase
    .from("connector_claim_invitations")
    .select("id, person_id, expires_at, claimed_at, revoked_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();
  if (invitationError || !invitation || invitation.revoked_at || new Date(invitation.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "This invitation is invalid, revoked, or expired." }, { status: 410 });
  }

  const { data: person, error: personError } = await supabase
    .from("people")
    .select("id, auth_user_id, email, claim_status")
    .eq("id", invitation.person_id)
    .single();
  if (personError || !person) return NextResponse.json({ error: "This Person profile was not found." }, { status: 404 });

  if (person.auth_user_id === user.id && person.claim_status === "claimed") {
    return NextResponse.json({ ok: true, alreadyClaimed: true });
  }
  if (person.auth_user_id || invitation.claimed_at) {
    return NextResponse.json({ error: "This profile has already been claimed." }, { status: 409 });
  }
  if (person.email && person.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Sign in with the email address this invitation was made for, or ask your Connector to update it." },
      { status: 403 },
    );
  }

  const { data: otherIdentity } = await supabase
    .from("people")
    .select("id")
    .eq("auth_user_id", user.id)
    .neq("id", person.id)
    .maybeSingle();
  if (otherIdentity) {
    return NextResponse.json({ error: "This account is already attached to another Person profile." }, { status: 409 });
  }

  const now = new Date().toISOString();
  const { data: claimedPerson, error: claimError } = await supabase
    .from("people")
    .update({
      auth_user_id: user.id,
      email: person.email || user.email.toLowerCase(),
      claim_status: "claimed",
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", person.id)
    .is("auth_user_id", null)
    .select("id")
    .maybeSingle();
  if (claimError || !claimedPerson) {
    return NextResponse.json({ error: claimError?.message || "This profile could not be claimed." }, { status: 409 });
  }

  const { error: finishError } = await supabase
    .from("connector_claim_invitations")
    .update({ claimed_at: now })
    .eq("id", invitation.id)
    .is("claimed_at", null)
    .is("revoked_at", null);
  if (finishError) {
    console.error("Person claimed, but invitation audit update failed", finishError);
  }

  await supabase
    .from("connector_claim_invitations")
    .update({ revoked_at: now })
    .eq("person_id", person.id)
    .neq("id", invitation.id)
    .is("claimed_at", null)
    .is("revoked_at", null);

  return NextResponse.json({ ok: true });
}
