import { NextResponse } from "next/server";
import { authenticatePerson, isConnectedPerson } from "@/lib/connectionAccess";
import { getSupabaseAdmin } from "@/lib/supabase";
import { hashSecret, randomToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const statuses = new Set(["new", "working", "scheduled", "completed", "closed"]);

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullable(value: unknown, max = 4000) {
  return text(value, max) || null;
}

function email(value: unknown) {
  const next = text(value, 320).toLowerCase();
  if (!next) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) throw new Error("Add a valid email address.");
  return next;
}

function moneyToCents(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) throw new Error("Add a valid amount.");
  return Math.round(amount * 100);
}

function invitationUrl(slug: string, token: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life").replace(/\/$/, "");
  return `${origin}/connect/${encodeURIComponent(slug)}/${encodeURIComponent(token)}`;
}

async function requireConnection(connectorPersonId: string, personId: string) {
  if (!(await isConnectedPerson(connectorPersonId, personId))) {
    throw new Error("This person is not in your connections.");
  }
}

async function createInvitation(connector: { person_id: string; slug: string }, personId: string) {
  await requireConnection(connector.person_id, personId);
  const supabase = getSupabaseAdmin();
  const rawToken = randomToken(32);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error: revokeError } = await supabase
    .from("connector_claim_invitations")
    .update({ revoked_at: now })
    .eq("person_id", personId)
    .eq("connector_person_id", connector.person_id)
    .is("claimed_at", null)
    .is("revoked_at", null);
  if (revokeError) throw new Error(revokeError.message);

  const { error } = await supabase.from("connector_claim_invitations").insert({
    person_id: personId,
    connector_person_id: connector.person_id,
    created_by_person_id: connector.person_id,
    token_hash: hashSecret(rawToken),
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);
  return { url: invitationUrl(connector.slug, rawToken), expiresAt };
}

export async function GET(request: Request) {
  const actor = await authenticatePerson(request, true);
  if (!actor || !("connector" in actor)) {
    return NextResponse.json({ error: "Sign in with your Connector account." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const personId = new URL(request.url).searchParams.get("person_id");

  if (personId) {
    if (!(await isConnectedPerson(actor.person.id, personId))) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }
    const [personResult, relationshipResult, needsResult, interactionsResult, membershipsResult, inviteResult] =
      await Promise.all([
        supabase
          .from("people")
          .select("id, display_name, email, phone, town, state, how_met, private_notes, abilities, created_at, updated_at, created_by_person_id, claim_status, claimed_at")
          .eq("id", personId)
          .single(),
        supabase
          .from("connector_relationships")
          .select("id, connector_person_id, person_id, household_id, is_primary, status, started_at")
          .eq("connector_person_id", actor.person.id)
          .eq("person_id", personId)
          .eq("status", "active")
          .single(),
        supabase
          .from("needs")
          .select("id, requester_person_id, household_id, connector_person_id, title, details, status, scheduled_for, completed_at, assigned_person_id, connection_made_by_person_id, connector_notes, amount_cents, created_at, updated_at")
          .eq("connector_person_id", actor.person.id)
          .eq("requester_person_id", personId)
          .order("created_at", { ascending: false }),
        supabase
          .from("connector_interactions")
          .select("id, person_id, connector_person_id, need_id, note, visibility, occurred_at, created_at")
          .eq("connector_person_id", actor.person.id)
          .eq("person_id", personId)
          .order("occurred_at", { ascending: false }),
        supabase.from("household_memberships").select("person_id, household_id, role").eq("person_id", personId),
        supabase
          .from("connector_claim_invitations")
          .select("id, expires_at, created_at")
          .eq("person_id", personId)
          .eq("connector_person_id", actor.person.id)
          .is("claimed_at", null)
          .is("revoked_at", null)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    const firstError = [personResult, relationshipResult, needsResult, interactionsResult, membershipsResult].find(
      (result) => result.error,
    )?.error;
    if (firstError || !personResult.data || !relationshipResult.data) {
      return NextResponse.json({ error: firstError?.message || "Connection not found." }, { status: 500 });
    }

    const householdIds = (membershipsResult.data || []).map((membership) => membership.household_id);
    const householdsResult = householdIds.length
      ? await supabase
          .from("households")
          .select("id, name, address_line, town, state, zip")
          .in("id", householdIds)
      : { data: [], error: null };

    return NextResponse.json({
      actor: { id: actor.person.id, displayName: actor.person.display_name },
      connector: actor.connector,
      person: personResult.data,
      relationship: relationshipResult.data,
      needs: needsResult.data || [],
      interactions: interactionsResult.data || [],
      memberships: membershipsResult.data || [],
      households: householdsResult.data || [],
      activeInvitation: inviteResult.data || null,
    });
  }

  const [relationshipsResult, needsResult] = await Promise.all([
    supabase
      .from("connector_relationships")
      .select("id, person_id, started_at")
      .eq("connector_person_id", actor.person.id)
      .eq("status", "active")
      .not("person_id", "is", null)
      .order("started_at", { ascending: false }),
    supabase
      .from("needs")
      .select("id, requester_person_id, title, details, status, scheduled_for, amount_cents, created_at, updated_at")
      .eq("connector_person_id", actor.person.id)
      .order("updated_at", { ascending: false }),
  ]);
  if (relationshipsResult.error || needsResult.error) {
    return NextResponse.json({ error: relationshipsResult.error?.message || needsResult.error?.message }, { status: 500 });
  }
  const ids = (relationshipsResult.data || []).flatMap((relationship) =>
    relationship.person_id ? [relationship.person_id] : [],
  );
  const peopleResult = ids.length
    ? await supabase
        .from("people")
        .select("id, display_name, email, phone, town, state, claim_status, claimed_at, created_at, updated_at")
        .in("id", ids)
    : { data: [], error: null };
  if (peopleResult.error) return NextResponse.json({ error: peopleResult.error.message }, { status: 500 });

  const open = new Set(["new", "working", "scheduled"]);
  const people = (peopleResult.data || [])
    .map((person) => ({
      ...person,
      openNeeds: (needsResult.data || []).filter(
        (need) => need.requester_person_id === person.id && open.has(need.status),
      ).length,
    }))
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return NextResponse.json({
    actor: { id: actor.person.id, displayName: actor.person.display_name },
    connector: actor.connector,
    people,
    needs: needsResult.data || [],
  });
}

export async function POST(request: Request) {
  const actor = await authenticatePerson(request, true);
  if (!actor || !("connector" in actor)) {
    return NextResponse.json({ error: "Sign in with your Connector account." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = text(body.action, 50);
    const supabase = getSupabaseAdmin();

    if (action === "add-person") {
      const displayName = text(body.displayName, 120);
      if (!displayName) throw new Error("Name is required.");
      const personEmail = email(body.email);
      const phone = nullable(body.phone, 60);
      let existing: { id: string } | null = null;
      if (personEmail) {
        const result = await supabase.from("people").select("id").ilike("email", personEmail).maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existing = result.data;
      } else if (phone) {
        const result = await supabase.from("people").select("id").eq("phone", phone).maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existing = result.data;
      }

      let personId = existing?.id || "";
      let created = false;
      if (!personId) {
        const result = await supabase
          .from("people")
          .insert({
            display_name: displayName,
            email: personEmail,
            phone,
            town: nullable(body.town, 120),
            state: text(body.state, 2).toUpperCase() || "IL",
            how_met: nullable(body.howMet, 500),
            private_notes: nullable(body.privateNote, 4000),
            created_by_person_id: actor.person.id,
            claim_status: "unclaimed",
          })
          .select("id")
          .single();
        if (result.error || !result.data) throw new Error(result.error?.message || "Could not create person.");
        personId = result.data.id;
        created = true;
      }

      if (personId === actor.person.id) throw new Error("You cannot connect yourself to yourself.");
      const existingRelationship = await supabase
        .from("connector_relationships")
        .select("id")
        .eq("connector_person_id", actor.person.id)
        .eq("person_id", personId)
        .eq("status", "active")
        .maybeSingle();
      if (existingRelationship.error) throw new Error(existingRelationship.error.message);
      if (!existingRelationship.data) {
        const result = await supabase.from("connector_relationships").insert({
          connector_person_id: actor.person.id,
          person_id: personId,
          is_primary: true,
          status: "active",
          notes: nullable(body.howMet, 500),
        });
        if (result.error) throw new Error(result.error.message);
      }

      const workTitle = text(body.workTitle, 160);
      if (workTitle) {
        const status = statuses.has(text(body.workStatus, 20)) ? text(body.workStatus, 20) : "new";
        const now = new Date().toISOString();
        const scheduledFor = nullable(body.workScheduledFor, 80);
        const result = await supabase.from("needs").insert({
          requester_person_id: personId,
          connector_person_id: actor.person.id,
          title: workTitle,
          details: text(body.workDetails, 4000),
          status,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          amount_cents: moneyToCents(body.workAmount),
          completed_at: status === "completed" ? now : null,
        });
        if (result.error) throw new Error(result.error.message);
      }

      const invitation = await createInvitation(actor.connector!, personId);
      return NextResponse.json({ ok: true, created, personId, invitation });
    }

    const personId = text(body.personId, 80);
    if (!personId) throw new Error("Person is required.");
    await requireConnection(actor.person.id, personId);

    if (action === "generate-invite") {
      return NextResponse.json({ ok: true, invitation: await createInvitation(actor.connector!, personId) });
    }

    if (action === "revoke-invite") {
      const { error } = await supabase
        .from("connector_claim_invitations")
        .update({ revoked_at: new Date().toISOString() })
        .eq("person_id", personId)
        .eq("connector_person_id", actor.person.id)
        .is("claimed_at", null)
        .is("revoked_at", null);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "update-person") {
      const displayName = text(body.displayName, 120);
      if (!displayName) throw new Error("Name is required.");
      const { error } = await supabase
        .from("people")
        .update({
          display_name: displayName,
          email: email(body.email),
          phone: nullable(body.phone, 60),
          town: nullable(body.town, 120),
          state: text(body.state, 2).toUpperCase() || null,
          how_met: nullable(body.howMet, 500),
          private_notes: nullable(body.privateNote, 4000),
          abilities: nullable(body.abilities, 1000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", personId);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "add-need") {
      const title = text(body.title, 160);
      if (!title) throw new Error("Need title is required.");
      const status = statuses.has(text(body.status, 20)) ? text(body.status, 20) : "new";
      const now = new Date().toISOString();
      const scheduledFor = nullable(body.scheduledFor, 80);
      const { error } = await supabase.from("needs").insert({
        requester_person_id: personId,
        connector_person_id: actor.person.id,
        household_id: nullable(body.householdId, 80),
        title,
        details: text(body.details, 4000),
        status,
        scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        completed_at: status === "completed" ? now : null,
        amount_cents: moneyToCents(body.amount),
        connector_notes: nullable(body.connectorNotes, 4000),
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "update-need") {
      const needId = text(body.needId, 80);
      const status = text(body.status, 20);
      if (!needId || !statuses.has(status)) throw new Error("Need and status are required.");
      const scheduledFor = nullable(body.scheduledFor, 80);
      const { error } = await supabase
        .from("needs")
        .update({
          status,
          scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
          completed_at: status === "completed" ? new Date().toISOString() : null,
          amount_cents: moneyToCents(body.amount),
          connector_notes: nullable(body.connectorNotes, 4000),
          updated_at: new Date().toISOString(),
        })
        .eq("id", needId)
        .eq("requester_person_id", personId)
        .eq("connector_person_id", actor.person.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    if (action === "add-interaction") {
      const note = text(body.note, 4000);
      if (!note) throw new Error("A note is required.");
      const visibility = body.visibility === "shared" ? "shared" : "private";
      const { error } = await supabase.from("connector_interactions").insert({
        person_id: personId,
        connector_person_id: actor.person.id,
        need_id: nullable(body.needId, 80),
        note,
        visibility,
      });
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    throw new Error("Unknown action.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request could not be completed." },
      { status: 400 },
    );
  }
}
