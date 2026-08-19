import { NextResponse } from "next/server";
import { authenticatePerson, isConnectedPerson } from "@/lib/connectionAccess";
import { personProfileColumns, personProfilePayload, personStartDetails } from "@/lib/personProfile";
import { getSupabaseAdmin } from "@/lib/supabase";
import { assignReferral, captureReferral, isReferralCoordinator } from "@/lib/referrals";
import { formatReferralNumber, normalizePhone } from "@/lib/phone";
import { hasSystemManagementAccess } from "@/lib/systemAccess";
import { hashSecret, invitationToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const statuses = new Set(["new", "working", "scheduled", "completed", "closed"]);

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullable(value: unknown, max = 4000) {
  return text(value, max) || null;
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

async function createInvitation(
  connector: { person_id: string; slug: string },
  personId: string,
  replaceExisting = false,
) {
  await requireConnection(connector.person_id, personId);
  const supabase = getSupabaseAdmin();
  const { data: existingInvitation, error: lookupError } = await supabase
    .from("connector_claim_invitations")
    .select("id")
    .eq("person_id", personId)
    .eq("connector_person_id", connector.person_id)
    .is("claimed_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error(lookupError.message);
  if (existingInvitation && !replaceExisting) {
    return { url: invitationUrl(connector.slug, existingInvitation.id), reused: true };
  }

  const rawToken = invitationToken();
  const now = new Date().toISOString();

  const { error: revokeError } = await supabase
    .from("connector_claim_invitations")
    .update({ revoked_at: now })
    .eq("person_id", personId)
    .eq("connector_person_id", connector.person_id)
    .is("claimed_at", null)
    .is("revoked_at", null);
  if (revokeError) throw new Error(revokeError.message);

  const { error } = await supabase.from("connector_claim_invitations").insert({
    id: rawToken,
    person_id: personId,
    connector_person_id: connector.person_id,
    created_by_person_id: connector.person_id,
    token_hash: hashSecret(rawToken),
    expires_at: null,
  });
  if (error) throw new Error(error.message);
  return { url: invitationUrl(connector.slug, rawToken), replaced: Boolean(existingInvitation) };
}

export async function GET(request: Request) {
  const actor = await authenticatePerson(request, true);
  if (!actor || !("connector" in actor)) {
    return NextResponse.json({ error: "Sign in with your Connector account." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const personId = new URL(request.url).searchParams.get("person_id");
  const systemManagementAccess = await hasSystemManagementAccess(actor.person.id);

  if (personId) {
    const directRelationshipAccess = await isConnectedPerson(actor.person.id, personId);
    if (!systemManagementAccess && !directRelationshipAccess) {
      return NextResponse.json({ error: "Connection not found." }, { status: 404 });
    }
    const relationshipQuery = supabase
      .from("connector_relationships")
      .select("id, connector_person_id, person_id, household_id, is_primary, status, started_at")
      .eq("person_id", personId)
      .eq("status", "active")
      .order("started_at", { ascending: true })
      .limit(1);
    const needsQuery = supabase
      .from("needs")
      .select("id, requester_person_id, household_id, connector_person_id, title, details, status, scheduled_for, completed_at, assigned_person_id, connection_made_by_person_id, connector_notes, amount_cents, created_at, updated_at")
      .eq("requester_person_id", personId)
      .order("created_at", { ascending: false });
    const interactionsQuery = supabase
      .from("connector_interactions")
      .select("id, person_id, connector_person_id, need_id, note, visibility, occurred_at, created_at")
      .eq("person_id", personId)
      .order("occurred_at", { ascending: false });
    const [personResult, relationshipResult, needsResult, interactionsResult, membershipsResult, inviteResult] =
      await Promise.all([
        supabase
          .from("people")
          .select(personProfileColumns)
          .eq("id", personId)
          .single(),
        (systemManagementAccess ? relationshipQuery : relationshipQuery.eq("connector_person_id", actor.person.id)).maybeSingle(),
        systemManagementAccess ? needsQuery : needsQuery.eq("connector_person_id", actor.person.id),
        systemManagementAccess ? interactionsQuery : interactionsQuery.eq("connector_person_id", actor.person.id),
        supabase.from("household_memberships").select("person_id, household_id, role").eq("person_id", personId),
        supabase
          .from("connector_claim_invitations")
          .select("id, expires_at, created_at")
          .eq("person_id", personId)
          .eq("connector_person_id", actor.person.id)
          .is("claimed_at", null)
          .is("revoked_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
    const firstError = [personResult, relationshipResult, needsResult, interactionsResult, membershipsResult, inviteResult].find(
      (result) => result.error,
    )?.error;
    if (firstError || !personResult.data || (!relationshipResult.data && !systemManagementAccess)) {
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
      accessScope: systemManagementAccess ? "system" : "relationships",
      relationshipAccess: directRelationshipAccess ? "direct" : "system",
      person: personResult.data,
      relationship: relationshipResult.data || { started_at: personResult.data.created_at },
      needs: needsResult.data || [],
      interactions: interactionsResult.data || [],
      memberships: membershipsResult.data || [],
      households: householdsResult.data || [],
      activeInvitation: inviteResult.data
        ? {
            ...inviteResult.data,
            url: invitationUrl(actor.connector!.slug, inviteResult.data.id),
          }
        : null,
    });
  }

  const relationshipsQuery = supabase
    .from("connector_relationships")
    .select("id, person_id, started_at")
    .eq("status", "active")
    .not("person_id", "is", null)
    .order("started_at", { ascending: false });
  const needsQuery = supabase
    .from("needs")
    .select("id, requester_person_id, title, details, status, scheduled_for, amount_cents, created_at, updated_at")
    .order("updated_at", { ascending: false });
  const [relationshipsResult, needsResult, coordinatorResult] = await Promise.all([
    systemManagementAccess ? relationshipsQuery : relationshipsQuery.eq("connector_person_id", actor.person.id),
    systemManagementAccess ? needsQuery : needsQuery.eq("connector_person_id", actor.person.id),
    supabase
      .from("referral_coordinators")
      .select("person_id")
      .eq("person_id", actor.person.id)
      .eq("active", true)
      .maybeSingle(),
  ]);
  if (relationshipsResult.error || needsResult.error || coordinatorResult.error) {
    return NextResponse.json(
      { error: relationshipsResult.error?.message || needsResult.error?.message || coordinatorResult.error?.message },
      { status: 500 },
    );
  }
  const ids = Array.from(new Set((relationshipsResult.data || []).flatMap((relationship) =>
    relationship.person_id ? [relationship.person_id] : [],
  )));
  const peopleResult = systemManagementAccess
    ? await supabase
        .from("people")
        .select("id, personal_number, display_name, email, phone, town, state, claim_status, claimed_at, created_at, updated_at")
        .neq("id", actor.person.id)
    : ids.length
    ? await supabase
        .from("people")
        .select("id, personal_number, display_name, email, phone, town, state, claim_status, claimed_at, created_at, updated_at")
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

  let unassignedReferrals: Array<Record<string, unknown>> = [];
  let referrerOptions: Array<{
    id: string;
    display_name: string;
    role: string;
    assignedReferralCount: number;
    lastAssignedAt: string | null;
    suggested: boolean;
  }> = [];
  if (coordinatorResult.data) {
    const [candidatesResult, attributionsResult, connectorsResult, coordinatorsResult] = await Promise.all([
      supabase
        .from("people")
        .select("id, personal_number, display_name, email, phone, town, state, claim_status, created_at")
        .neq("id", actor.person.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("person_referral_attributions")
        .select("referred_person_id, referrer_person_id, referral_type, internal_sequence_number, captured_at")
        .in("status", ["captured", "confirmed"]),
      supabase.from("connector_profiles").select("person_id").eq("active", true),
      supabase.from("referral_coordinators").select("person_id").eq("active", true),
    ]);
    const referralError =
      candidatesResult.error || attributionsResult.error || connectorsResult.error || coordinatorsResult.error;
    if (referralError) return NextResponse.json({ error: referralError.message }, { status: 500 });

    const assignedIds = new Set((attributionsResult.data || []).map((entry) => entry.referred_person_id));
    unassignedReferrals = (candidatesResult.data || []).filter((person) => !assignedIds.has(person.id));

    const connectorIds = new Set((connectorsResult.data || []).map((entry) => entry.person_id));
    const coordinatorIds = new Set((coordinatorsResult.data || []).map((entry) => entry.person_id));
    const eligibleIds = Array.from(new Set([...connectorIds, ...coordinatorIds]));
    const referrersResult = eligibleIds.length
      ? await supabase.from("people").select("id, display_name").in("id", eligibleIds).order("display_name")
      : { data: [], error: null };
    if (referrersResult.error) return NextResponse.json({ error: referrersResult.error.message }, { status: 500 });
    const assignedAttributions = (attributionsResult.data || []).filter(
      (attribution) => attribution.referral_type === "assigned",
    );
    referrerOptions = (referrersResult.data || [])
      .map((person) => {
        const assignments = assignedAttributions.filter(
          (attribution) => attribution.referrer_person_id === person.id,
        );
        const lastAssignedAt = assignments.reduce<string | null>(
          (latest, attribution) => !latest || attribution.captured_at > latest ? attribution.captured_at : latest,
          null,
        );
        return {
          ...person,
          role: connectorIds.has(person.id) && coordinatorIds.has(person.id)
            ? "Connector · coordinator"
            : coordinatorIds.has(person.id)
              ? "Coordinator"
              : "Connector",
          assignedReferralCount: assignments.length,
          lastAssignedAt,
          suggested: false,
        };
      })
      .sort((first, second) =>
        first.assignedReferralCount - second.assignedReferralCount ||
        (first.lastAssignedAt || "").localeCompare(second.lastAssignedAt || "") ||
        first.display_name.localeCompare(second.display_name),
      )
      .map((person, index) => ({ ...person, suggested: index === 0 }));
  }

  return NextResponse.json({
    actor: { id: actor.person.id, displayName: actor.person.display_name },
    connector: actor.connector,
    accessScope: systemManagementAccess ? "system" : "relationships",
    people,
    needs: needsResult.data || [],
    referralIntake: {
      canAssign: Boolean(coordinatorResult.data),
      unassigned: unassignedReferrals,
      referrerOptions,
    },
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

    if (action === "assign-referrer") {
      if (!(await isReferralCoordinator(actor.person.id))) {
        return NextResponse.json({ error: "Referral coordination access is required." }, { status: 403 });
      }

      const referredPersonId = text(body.referredPersonId, 80);
      const referrerPersonId = text(body.referrerPersonId, 80);
      if (!referredPersonId || !referrerPersonId) throw new Error("Choose a person and a referrer.");

      const [referredResult, connectorResult, coordinatorResult] = await Promise.all([
        supabase.from("people").select("id").eq("id", referredPersonId).maybeSingle(),
        supabase
          .from("connector_profiles")
          .select("person_id")
          .eq("person_id", referrerPersonId)
          .eq("active", true)
          .maybeSingle(),
        supabase
          .from("referral_coordinators")
          .select("person_id")
          .eq("person_id", referrerPersonId)
          .eq("active", true)
          .maybeSingle(),
      ]);
      const assignmentError = referredResult.error || connectorResult.error || coordinatorResult.error;
      if (assignmentError) throw new Error(assignmentError.message);
      if (!referredResult.data) throw new Error("This person is no longer available.");
      if (!connectorResult.data && !coordinatorResult.data) {
        throw new Error("Choose an active Connector or referral coordinator.");
      }

      const assignment = await assignReferral({
        referredPersonId,
        referrerPersonId,
        sourceType: "manual_assignment",
        sourceReference: `coordinator:${actor.person.id}`,
        assignedByPersonId: actor.person.id,
        assignmentReason: nullable(body.assignmentReason, 1000),
        metadata: { assigned_by_person_id: actor.person.id, entry_method: "referral_intake_queue" },
      });
      return NextResponse.json({
        ok: true,
        referralNumber: assignment.attribution
          ? formatReferralNumber("assigned", assignment.attribution.internal_sequence_number)
          : null,
      });
    }

    if (action === "add-person") {
      const { displayName, email: personEmail, phone } = personStartDetails(body);
      const profile = personProfilePayload(body, { includePrimaryEmail: true });
      let existing: { id: string } | null = null;
      if (personEmail) {
        const result = await supabase.from("people").select("id").ilike("email", personEmail).maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existing = result.data;
      }
      if (!existing && phone) {
        const result = await supabase
          .from("people")
          .select("id")
          .eq("phone_normalized", normalizePhone(phone))
          .maybeSingle();
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
            ...profile,
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

      await captureReferral({
        referredPersonId: personId,
        referrerPersonId: actor.person.id,
        sourceType: "connector_introduction",
        sourceReference: `connector:${actor.person.id}`,
        metadata: { entry_method: "connector_dashboard" },
      });

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
    const [directRelationshipAccess, systemManagementAccess] = await Promise.all([
      isConnectedPerson(actor.person.id, personId),
      hasSystemManagementAccess(actor.person.id),
    ]);
    if (!directRelationshipAccess && !systemManagementAccess) {
      throw new Error("This person is not available to you.");
    }
    if (!directRelationshipAccess && action !== "update-person") {
      throw new Error("A direct relationship is required for invitations, Needs, and activity.");
    }

    if (action === "generate-invite") {
      return NextResponse.json({ ok: true, invitation: await createInvitation(actor.connector!, personId, true) });
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
      const profile = personProfilePayload(body, { includePrimaryEmail: true });
      const { error } = await supabase
        .from("people")
        .update({
          display_name: displayName,
          ...profile,
          how_met: nullable(body.howMet, 500),
          private_notes: nullable(body.privateNote, 4000),
          latitude: null,
          longitude: null,
          location_precision: "none",
          geocoded_at: null,
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
