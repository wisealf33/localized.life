import { NextResponse } from "next/server";
import { authLoginFromContact, passwordAuthEmail } from "@/lib/authIdentity";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashSecret } from "@/lib/tokens";

export async function POST(request: Request) {
  const { token, password } = (await request.json().catch(() => ({}))) as {
    token?: string;
    password?: string;
  };
  if (!token || token.length < 32) {
    return NextResponse.json({ error: "This private link is not valid." }, { status: 400 });
  }
  if (!password || password.length < 8 || password.length > 72) {
    return NextResponse.json({ error: "Create a password between 8 and 72 characters." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: personInvitation, error: personInvitationError } = await supabase
    .from("person_claim_invitations")
    .select("id, person_id, expires_at, claimed_at, revoked_at")
    .eq("token_hash", hashSecret(token))
    .maybeSingle();
  const connectorInvitationResult = personInvitation
    ? { data: null, error: null }
    : await supabase
      .from("connector_claim_invitations")
      .select("id, person_id, expires_at, claimed_at, revoked_at")
      .eq("token_hash", hashSecret(token))
      .maybeSingle();
  const invitation = personInvitation || connectorInvitationResult.data;
  const invitationTable = personInvitation ? "person_claim_invitations" : "connector_claim_invitations";
  const invitationError = personInvitationError || connectorInvitationResult.error;
  const expired = invitation?.expires_at ? new Date(invitation.expires_at).getTime() <= Date.now() : false;
  if (invitationError || !invitation || invitation.revoked_at || expired) {
    return NextResponse.json({ error: "This private link is no longer active." }, { status: 410 });
  }

  const { data: person, error: personError } = await supabase
    .from("people")
    .select("id, auth_user_id, email, phone, claim_status")
    .eq("id", invitation.person_id)
    .single();
  if (personError || !person) {
    return NextResponse.json({ error: "This profile was not found." }, { status: 404 });
  }
  if (person.auth_user_id || invitation.claimed_at || person.claim_status === "claimed") {
    return NextResponse.json({ error: "This profile already has an account. Sign in from the account page." }, { status: 409 });
  }

  const login = authLoginFromContact(person.email, person.phone);
  if (!login) {
    return NextResponse.json(
      { error: "This profile needs an email address or valid phone number before it can be claimed." },
      { status: 409 },
    );
  }

  const authEmail = passwordAuthEmail(login);
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: authEmail,
    email_confirm: true,
    password,
  });
  const newUser = created.user;
  if (createError || !newUser) {
    const identity = login.type === "email" ? "email address" : "phone number";
    return NextResponse.json(
      {
        error: createError?.message.toLowerCase().includes("already")
          ? `An account already uses this ${identity}. Sign in instead, or ask the person who invited you for help.`
          : createError?.message || "We could not create this account.",
      },
      { status: 409 },
    );
  }

  const now = new Date().toISOString();
  const { data: claimedPerson, error: claimError } = await supabase
    .from("people")
    .update({
      auth_user_id: newUser.id,
      email: login.type === "email" ? login.value : person.email,
      phone: login.type === "phone" ? login.value : person.phone,
      claim_status: "claimed",
      claimed_at: now,
      updated_at: now,
    })
    .eq("id", person.id)
    .is("auth_user_id", null)
    .eq("claim_status", "unclaimed")
    .select("id")
    .maybeSingle();
  if (claimError || !claimedPerson) {
    const { error: rollbackError } = await supabase.auth.admin.deleteUser(newUser.id);
    if (rollbackError) console.error("Could not roll back an unattached claim account", rollbackError);
    return NextResponse.json(
      { error: claimError?.message || "This profile was claimed in another session. Sign in to continue." },
      { status: 409 },
    );
  }

  const { error: finishError } = await supabase
    .from(invitationTable)
    .update({ claimed_at: now })
    .eq("id", invitation.id)
    .is("claimed_at", null)
    .is("revoked_at", null);
  if (finishError) console.error("Person claimed, but invitation audit update failed", finishError);

  await supabase
    .from(invitationTable)
    .update({ revoked_at: now })
    .eq("person_id", person.id)
    .neq("id", invitation.id)
    .is("claimed_at", null)
    .is("revoked_at", null);

  if (invitationTable === "person_claim_invitations") {
    const { error: attributionError } = await supabase
      .from("person_referral_attributions")
      .update({ status: "confirmed", confirmed_at: now, updated_at: now })
      .eq("referred_person_id", person.id)
      .eq("status", "captured");
    if (attributionError) console.error("Person claimed, but referral confirmation failed", attributionError);
  }

  await supabase
    .from(invitationTable === "person_claim_invitations" ? "connector_claim_invitations" : "person_claim_invitations")
    .update({ revoked_at: now })
    .eq("person_id", person.id)
    .is("claimed_at", null)
    .is("revoked_at", null);

  return NextResponse.json({ ok: true, login: { type: "email", value: authEmail } });
}
