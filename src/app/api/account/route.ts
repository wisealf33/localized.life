import { NextResponse } from "next/server";
import { authenticatePerson } from "@/lib/connectionAccess";
import { personProfilePayload, personStartDetails } from "@/lib/personProfile";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashSecret, invitationToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const needStatuses = new Set(["new", "working", "scheduled", "completed", "closed"]);
const postTypes = new Set(["service", "goods", "event", "mentoring", "request"]);
const postOwnerStates = new Set(["active", "paused", "closed", "removed"]);
const postAreaByType = {
  service: "service",
  goods: "market",
  event: "event",
  mentoring: "mentor",
  request: "service",
} as const;

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullable(value: unknown, max = 4000) {
  return text(value, max) || null;
}

function publicUrl(value: unknown) {
  const next = text(value, 1000);
  if (!next) return null;
  try {
    const parsed = new URL(next);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error();
    return parsed.toString();
  } catch {
    throw new Error("Add a complete public link beginning with http:// or https://.");
  }
}

function siteUrl(path: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life").replace(/\/$/, "");
  return `${origin}${path}`;
}

function orderedPair(firstPersonId: string, secondPersonId: string) {
  return firstPersonId < secondPersonId
    ? { person_one_id: firstPersonId, person_two_id: secondPersonId }
    : { person_one_id: secondPersonId, person_two_id: firstPersonId };
}

async function createConnection(actorPersonId: string, connectedPersonId: string) {
  const pair = orderedPair(actorPersonId, connectedPersonId);
  const { error } = await getSupabaseAdmin().from("person_connections").upsert(
    {
      ...pair,
      introduced_by_person_id: actorPersonId,
      connection_source: "personal_introduction",
      status: "active",
      ended_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "person_one_id,person_two_id", ignoreDuplicates: false },
  );
  if (error) throw new Error(error.message);
}

async function captureReferral(actorPersonId: string, referredPersonId: string) {
  const supabase = getSupabaseAdmin();
  const { data: current, error: lookupError } = await supabase
    .from("person_referral_attributions")
    .select("id")
    .eq("referred_person_id", referredPersonId)
    .in("status", ["captured", "confirmed"])
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (current) return;

  const { error } = await supabase.from("person_referral_attributions").insert({
    referred_person_id: referredPersonId,
    referrer_person_id: actorPersonId,
    source_type: "personal_introduction",
    source_reference: `person:${actorPersonId}`,
    status: "captured",
    metadata: { entry_method: "claimed_dashboard" },
  });
  if (error) throw new Error(error.message);
}

async function activeInvitation(referringPersonId: string, personId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("person_claim_invitations")
    .select("id, created_at")
    .eq("person_id", personId)
    .eq("referring_person_id", referringPersonId)
    .is("claimed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function createInvitation(referringPersonId: string, personId: string, replace = false) {
  const supabase = getSupabaseAdmin();
  const existing = await activeInvitation(referringPersonId, personId);
  if (existing && !replace) {
    return { url: siteUrl(`/claim/${existing.id}`), reused: true };
  }

  const now = new Date().toISOString();
  if (existing) {
    const { error: revokeError } = await supabase
      .from("person_claim_invitations")
      .update({ revoked_at: now })
      .eq("id", existing.id)
      .is("claimed_at", null)
      .is("revoked_at", null);
    if (revokeError) throw new Error(revokeError.message);
  }

  const token = invitationToken();
  const { error } = await supabase.from("person_claim_invitations").insert({
    id: token,
    person_id: personId,
    referring_person_id: referringPersonId,
    created_by_person_id: referringPersonId,
    token_hash: hashSecret(token),
    expires_at: null,
  });
  if (error) throw new Error(error.message);
  return { url: siteUrl(`/claim/${token}`), replaced: Boolean(existing) };
}

export async function GET(request: Request) {
  const actor = await authenticatePerson(request);
  if (!actor) return NextResponse.json({ error: "Sign in to open your account." }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const actorPersonId = actor.person.id;
  const [connectorResult, connectionsResult, needsResult, postsResult] = await Promise.all([
    supabase
      .from("connector_profiles")
      .select("person_id, slug, display_name, headline, intro, active")
      .eq("person_id", actorPersonId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("person_connections")
      .select("id, person_one_id, person_two_id, connected_at, connection_source")
      .eq("status", "active")
      .or(`person_one_id.eq.${actorPersonId},person_two_id.eq.${actorPersonId}`)
      .order("connected_at", { ascending: false }),
    supabase
      .from("needs")
      .select("id, requester_person_id, connector_person_id, assigned_person_id, title, details, status, scheduled_for, completed_at, created_at, updated_at")
      .or(`requester_person_id.eq.${actorPersonId},connector_person_id.eq.${actorPersonId},assigned_person_id.eq.${actorPersonId}`)
      .order("updated_at", { ascending: false })
      .limit(30),
    supabase
      .from("local_submissions")
      .select("id, post_type, owner_state, title, category, contact, city, state, website_url, description, status, admin_notes, created_at, updated_at")
      .eq("owner_person_id", actorPersonId)
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);

  const firstError = connectorResult.error || connectionsResult.error || needsResult.error || postsResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

  const connections = connectionsResult.data || [];
  const connectedPersonIds = connections.map((connection) =>
    connection.person_one_id === actorPersonId ? connection.person_two_id : connection.person_one_id,
  );
  const requesterIds = (needsResult.data || []).map((need) => need.requester_person_id);
  const personIds = Array.from(new Set([...connectedPersonIds, ...requesterIds])).filter(
    (personId) => personId !== actorPersonId,
  );

  const [peopleResult, invitationsResult] = await Promise.all([
    personIds.length
      ? supabase
          .from("people")
          .select("id, display_name, email, phone, town, state, claim_status, claimed_at, created_at")
          .in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
    connectedPersonIds.length
      ? supabase
          .from("person_claim_invitations")
          .select("id, person_id, created_at")
          .eq("referring_person_id", actorPersonId)
          .in("person_id", connectedPersonIds)
          .is("claimed_at", null)
          .is("revoked_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (peopleResult.error || invitationsResult.error) {
    return NextResponse.json({ error: peopleResult.error?.message || invitationsResult.error?.message }, { status: 500 });
  }

  const peopleById = new Map((peopleResult.data || []).map((person) => [person.id, person]));
  const invitationsByPersonId = new Map(
    (invitationsResult.data || []).map((invitation) => [invitation.person_id, invitation]),
  );
  const people = connections.flatMap((connection) => {
    const personId = connection.person_one_id === actorPersonId ? connection.person_two_id : connection.person_one_id;
    const person = peopleById.get(personId);
    if (!person) return [];
    const invitation = invitationsByPersonId.get(personId);
    return [{
      ...person,
      connected_at: connection.connected_at,
      connection_source: connection.connection_source,
      invitation_url: invitation ? siteUrl(`/claim/${invitation.id}`) : null,
    }];
  });

  const activity = (needsResult.data || []).map((need) => ({
    ...need,
    requester_name: need.requester_person_id === actorPersonId
      ? actor.person.display_name
      : peopleById.get(need.requester_person_id)?.display_name || "A local connection",
    perspective: need.requester_person_id === actorPersonId
      ? "Your request"
      : need.assigned_person_id === actorPersonId
        ? "Assigned to you"
        : "Local request",
  }));

  return NextResponse.json({
    user: { email: actor.user.email || null },
    person: actor.person,
    connector: connectorResult.data || null,
    people,
    activity,
    posts: postsResult.data || [],
  });
}

export async function POST(request: Request) {
  const actor = await authenticatePerson(request);
  if (!actor) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = text(body.action, 60);
    const supabase = getSupabaseAdmin();

    if (action === "update-profile") {
      const displayName = text(body.displayName, 120);
      if (!displayName) throw new Error("Add your name.");
      const profile = personProfilePayload(body, { includePrimaryEmail: true });
      const locationChanged = ["address_line1", "address_line2", "town", "state", "postal_code", "country_code"].some(
        (key) => profile[key] !== (actor.person as Record<string, unknown>)[key],
      );
      const { error } = await supabase
        .from("people")
        .update({
          display_name: displayName,
          ...profile,
          ...(locationChanged
            ? { latitude: null, longitude: null, location_precision: "none", geocoded_at: null }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", actor.person.id)
        .eq("auth_user_id", actor.user.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "create-post") {
      const postType = text(body.postType, 20) as keyof typeof postAreaByType;
      const title = text(body.title, 180);
      const description = text(body.description, 5000);
      if (!postTypes.has(postType)) throw new Error("Choose a valid post type.");
      if (!title) throw new Error("Add a title.");
      if (!description) throw new Error("Add a description.");

      const state = text(body.state, 2).toUpperCase() || actor.person.state || null;
      const { data: post, error } = await supabase
        .from("local_submissions")
        .insert({
          submission_area: postAreaByType[postType],
          post_type: postType,
          owner_person_id: actor.person.id,
          owner_state: "active",
          title,
          category: nullable(body.category, 180),
          name: actor.person.display_name,
          contact: nullable(body.contact, 1000),
          submitter_email: actor.person.email || actor.user.email || null,
          city: nullable(body.city, 120) || actor.person.town || null,
          state,
          website_url: publicUrl(body.websiteUrl),
          description,
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !post) throw new Error(error?.message || "Your post could not be saved.");
      return NextResponse.json({ ok: true, postId: post.id });
    }

    if (action === "update-post") {
      const postId = text(body.postId, 80);
      const title = text(body.title, 180);
      const description = text(body.description, 5000);
      if (!postId) throw new Error("Choose a post to update.");
      if (!title) throw new Error("Add a title.");
      if (!description) throw new Error("Add a description.");

      const { data: post, error } = await supabase
        .from("local_submissions")
        .update({
          title,
          category: nullable(body.category, 180),
          contact: nullable(body.contact, 1000),
          city: nullable(body.city, 120),
          state: nullable(body.state, 2)?.toUpperCase() || null,
          website_url: publicUrl(body.websiteUrl),
          description,
          owner_state: "active",
          status: "pending",
          admin_notes: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", postId)
        .eq("owner_person_id", actor.person.id)
        .select("id")
        .maybeSingle();
      if (error || !post) throw new Error(error?.message || "This post is not available in your account.");
      return NextResponse.json({ ok: true });
    }

    if (action === "set-post-state") {
      const postId = text(body.postId, 80);
      const ownerState = text(body.ownerState, 20);
      if (!postId || !postOwnerStates.has(ownerState)) throw new Error("Choose a valid post update.");

      const { data: post, error } = await supabase
        .from("local_submissions")
        .update({ owner_state: ownerState, updated_at: new Date().toISOString() })
        .eq("id", postId)
        .eq("owner_person_id", actor.person.id)
        .select("id")
        .maybeSingle();
      if (error || !post) throw new Error(error?.message || "This post is not available in your account.");
      return NextResponse.json({ ok: true });
    }

    if (action === "add-person") {
      const { displayName, email: personEmail, phone } = personStartDetails(body);
      const profile = personProfilePayload(body, { includePrimaryEmail: true });

      let existingPerson: {
        id: string;
        claim_status: "claimed" | "unclaimed";
        created_by_person_id: string | null;
      } | null = null;
      if (personEmail) {
        const result = await supabase
          .from("people")
          .select("id, claim_status, created_by_person_id")
          .ilike("email", personEmail)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existingPerson = result.data;
      }
      if (!existingPerson && phone) {
        const result = await supabase
          .from("people")
          .select("id, claim_status, created_by_person_id")
          .eq("phone", phone)
          .limit(1)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existingPerson = result.data;
      }
      if (existingPerson?.id === actor.person.id) throw new Error("This contact information belongs to your account.");

      let personId = existingPerson?.id || "";
      let created = false;
      if (!personId) {
        const result = await supabase
          .from("people")
          .insert({
            display_name: displayName,
            ...profile,
            how_met: nullable(body.howMet, 500),
            private_notes: nullable(body.privateNote, 2000),
            created_by_person_id: actor.person.id,
            claim_status: "unclaimed",
          })
          .select("id")
          .single();
        if (result.error || !result.data) throw new Error(result.error?.message || "This person could not be added.");
        personId = result.data.id;
        created = true;
      } else if (existingPerson?.claim_status === "unclaimed" && existingPerson.created_by_person_id !== actor.person.id) {
        throw new Error("This person already has a private profile. Ask them to share their Localized.life account after they claim it.");
      }

      await createConnection(actor.person.id, personId);
      await captureReferral(actor.person.id, personId);
      const invitation = existingPerson?.claim_status === "claimed"
        ? null
        : await createInvitation(actor.person.id, personId);

      return NextResponse.json({
        ok: true,
        created,
        personId,
        alreadyClaimed: existingPerson?.claim_status === "claimed",
        invitation,
      });
    }

    if (action === "regenerate-invite") {
      const personId = text(body.personId, 80);
      if (!personId) throw new Error("Choose a person first.");
      const pair = orderedPair(actor.person.id, personId);
      const { data: connection, error: connectionError } = await supabase
        .from("person_connections")
        .select("id")
        .eq("person_one_id", pair.person_one_id)
        .eq("person_two_id", pair.person_two_id)
        .eq("status", "active")
        .maybeSingle();
      if (connectionError || !connection) throw new Error("This person is not in your connections.");

      const { data: person, error: personError } = await supabase
        .from("people")
        .select("claim_status")
        .eq("id", personId)
        .single();
      if (personError || !person) throw new Error("This profile was not found.");
      if (person.claim_status === "claimed") throw new Error("This person already has an account.");

      return NextResponse.json({ ok: true, invitation: await createInvitation(actor.person.id, personId, true) });
    }

    if (action === "update-need-status") {
      const needId = text(body.needId, 80);
      const status = text(body.status, 20);
      if (!needId || !needStatuses.has(status)) throw new Error("Choose a valid update.");
      const { error } = await supabase
        .from("needs")
        .update({
          status,
          completed_at: status === "completed" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", needId)
        .or(`requester_person_id.eq.${actor.person.id},assigned_person_id.eq.${actor.person.id},connector_person_id.eq.${actor.person.id}`);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    throw new Error("That account action is not available.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That change could not be saved." },
      { status: 400 },
    );
  }
}
