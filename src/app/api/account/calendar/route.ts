import { NextResponse } from "next/server";
import { authenticatePerson } from "@/lib/connectionAccess";
import { captureReferral } from "@/lib/referrals";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const appointmentStatuses = new Set(["scheduled", "completed", "cancelled"]);
const calendarPersonStatuses = new Set(["active", "archived"]);

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

function timestamp(value: unknown, label: string) {
  const parsed = new Date(text(value, 80));
  if (Number.isNaN(parsed.getTime())) throw new Error(`Add a valid ${label}.`);
  return parsed;
}

function requestedRange(request: Request) {
  const url = new URL(request.url);
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const startValue = url.searchParams.get("start");
  const endValue = url.searchParams.get("end");
  const start = startValue ? timestamp(startValue, "calendar start") : defaultStart;
  const end = endValue ? timestamp(endValue, "calendar end") : defaultEnd;
  if (end <= start) throw new Error("The calendar end must be after its start.");
  if (end.getTime() - start.getTime() > 370 * 24 * 60 * 60 * 1000) {
    throw new Error("Open no more than one year of appointments at a time.");
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

function orderedPair(firstPersonId: string, secondPersonId: string) {
  return firstPersonId < secondPersonId
    ? { person_one_id: firstPersonId, person_two_id: secondPersonId }
    : { person_one_id: secondPersonId, person_two_id: firstPersonId };
}

async function createConnection(ownerPersonId: string, personId: string) {
  const { error } = await getSupabaseAdmin().from("person_connections").upsert(
    {
      ...orderedPair(ownerPersonId, personId),
      introduced_by_person_id: ownerPersonId,
      connection_source: "personal_introduction",
      status: "active",
      ended_at: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "person_one_id,person_two_id", ignoreDuplicates: false },
  );
  if (error) throw new Error(error.message);
}

async function isAvailablePerson(ownerPersonId: string, personId: string) {
  if (ownerPersonId === personId) return false;
  const pair = orderedPair(ownerPersonId, personId);
  const supabase = getSupabaseAdmin();
  const [calendarResult, connectionResult, connectorResult, createdResult] = await Promise.all([
    supabase
      .from("account_calendar_people")
      .select("id")
      .eq("owner_person_id", ownerPersonId)
      .eq("person_id", personId)
      .maybeSingle(),
    supabase
      .from("person_connections")
      .select("id")
      .eq("person_one_id", pair.person_one_id)
      .eq("person_two_id", pair.person_two_id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("connector_relationships")
      .select("id")
      .eq("connector_person_id", ownerPersonId)
      .eq("person_id", personId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("people")
      .select("id")
      .eq("id", personId)
      .eq("created_by_person_id", ownerPersonId)
      .maybeSingle(),
  ]);
  const error = calendarResult.error || connectionResult.error || connectorResult.error || createdResult.error;
  if (error) throw new Error(error.message);
  return Boolean(calendarResult.data || connectionResult.data || connectorResult.data || createdResult.data);
}

async function ensureCalendarPerson(ownerPersonId: string, personId: string) {
  const supabase = getSupabaseAdmin();
  const existing = await supabase
    .from("account_calendar_people")
    .select("id, status")
    .eq("owner_person_id", ownerPersonId)
    .eq("person_id", personId)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;
  if (!(await isAvailablePerson(ownerPersonId, personId))) {
    throw new Error("Choose a person from your connections.");
  }

  const created = await supabase
    .from("account_calendar_people")
    .insert({ owner_person_id: ownerPersonId, person_id: personId })
    .select("id, status")
    .single();
  if (created.error || !created.data) throw new Error(created.error?.message || "This person could not be added.");
  return created.data;
}

async function requireOwnedCalendarPerson(ownerPersonId: string, calendarPersonId: string, activeOnly = true) {
  const { data, error } = await getSupabaseAdmin()
    .from("account_calendar_people")
    .select("id, person_id, status")
    .eq("id", calendarPersonId)
    .eq("owner_person_id", ownerPersonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Choose a person from your calendar.");
  if (activeOnly && data.status !== "active") throw new Error("Restore this person before scheduling them.");
  return data;
}

export async function GET(request: Request) {
  const actor = await authenticatePerson(request);
  if (!actor) return NextResponse.json({ error: "Sign in to open your calendar." }, { status: 401 });

  try {
    const range = requestedRange(request);
    const supabase = getSupabaseAdmin();
    const [calendarPeopleResult, appointmentsResult, connectionsResult, connectorPeopleResult, createdPeopleResult] = await Promise.all([
      supabase
        .from("account_calendar_people")
        .select("id, person_id, service_address_line1, service_address_line2, service_city, service_state, service_postal_code, service_country_code, private_notes, status, created_at, updated_at")
        .eq("owner_person_id", actor.person.id)
        .order("status", { ascending: true })
        .limit(500),
      supabase
        .from("account_appointments")
        .select("id, calendar_person_id, title, starts_at, ends_at, status, location, notes, created_at, updated_at")
        .eq("owner_person_id", actor.person.id)
        .gte("starts_at", range.start)
        .lt("starts_at", range.end)
        .order("starts_at", { ascending: true })
        .limit(2000),
      supabase
        .from("person_connections")
        .select("person_one_id, person_two_id")
        .eq("status", "active")
        .or(`person_one_id.eq.${actor.person.id},person_two_id.eq.${actor.person.id}`),
      supabase
        .from("connector_relationships")
        .select("person_id")
        .eq("connector_person_id", actor.person.id)
        .eq("status", "active")
        .not("person_id", "is", null),
      supabase.from("people").select("id").eq("created_by_person_id", actor.person.id),
    ]);

    const firstError =
      calendarPeopleResult.error ||
      appointmentsResult.error ||
      connectionsResult.error ||
      connectorPeopleResult.error ||
      createdPeopleResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    const calendarPeople = calendarPeopleResult.data || [];
    const personIds = new Set(calendarPeople.map((entry) => entry.person_id));
    for (const connection of connectionsResult.data || []) {
      personIds.add(connection.person_one_id === actor.person.id ? connection.person_two_id : connection.person_one_id);
    }
    for (const relationship of connectorPeopleResult.data || []) {
      if (relationship.person_id) personIds.add(relationship.person_id);
    }
    for (const person of createdPeopleResult.data || []) personIds.add(person.id);
    personIds.delete(actor.person.id);

    const peopleResult = personIds.size
      ? await supabase
          .from("people")
          .select("id, display_name, email, phone, town, state, claim_status, created_at, updated_at")
          .in("id", Array.from(personIds))
          .order("display_name")
      : { data: [], error: null };
    if (peopleResult.error) return NextResponse.json({ error: peopleResult.error.message }, { status: 500 });

    const calendarByPersonId = new Map(calendarPeople.map((entry) => [entry.person_id, entry]));
    const personByCalendarId = new Map(calendarPeople.map((entry) => [entry.id, entry.person_id]));
    const people = (peopleResult.data || []).map((person) => ({
      ...person,
      calendar: calendarByPersonId.get(person.id) || null,
    }));
    const appointments = (appointmentsResult.data || []).flatMap((appointment) => {
      const personId = personByCalendarId.get(appointment.calendar_person_id);
      return personId ? [{ ...appointment, person_id: personId }] : [];
    });

    return NextResponse.json({
      person: { id: actor.person.id, display_name: actor.person.display_name },
      range,
      people,
      appointments,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Your calendar could not be opened." },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const actor = await authenticatePerson(request);
  if (!actor) return NextResponse.json({ error: "Sign in to manage your calendar." }, { status: 401 });

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = text(body.action, 60);
    const supabase = getSupabaseAdmin();

    if (action === "create-person") {
      const displayName = text(body.displayName, 120);
      const personEmail = email(body.email);
      const phone = nullable(body.phone, 60);
      if (!displayName) throw new Error("Add the person's name.");
      if (!personEmail && !phone) throw new Error("Add a phone number or email for this person.");

      let existing: { id: string; claim_status: string; created_by_person_id: string | null } | null = null;
      if (personEmail) {
        const result = await supabase
          .from("people")
          .select("id, claim_status, created_by_person_id")
          .ilike("email", personEmail)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existing = result.data;
      }
      if (!existing && phone) {
        const result = await supabase
          .from("people")
          .select("id, claim_status, created_by_person_id")
          .eq("phone", phone)
          .limit(1)
          .maybeSingle();
        if (result.error) throw new Error(result.error.message);
        existing = result.data;
      }
      if (existing?.id === actor.person.id) throw new Error("This contact information belongs to your account.");
      if (existing?.claim_status === "unclaimed" && existing.created_by_person_id !== actor.person.id) {
        throw new Error("This person already has a private profile. Ask them to connect after they claim it.");
      }

      let personId = existing?.id || "";
      if (!personId) {
        const result = await supabase
          .from("people")
          .insert({
            display_name: displayName,
            email: personEmail,
            phone,
            town: nullable(body.serviceCity, 120),
            state: text(body.serviceState, 2).toUpperCase() || actor.person.state || "IL",
            created_by_person_id: actor.person.id,
            claim_status: "unclaimed",
          })
          .select("id")
          .single();
        if (result.error || !result.data) throw new Error(result.error?.message || "This person could not be saved.");
        personId = result.data.id;
      }

      await createConnection(actor.person.id, personId);
      await captureReferral({
        referredPersonId: personId,
        referrerPersonId: actor.person.id,
        sourceType: "personal_introduction",
        sourceReference: `person:${actor.person.id}`,
        metadata: { entry_method: "appointment_calendar" },
      });
      const calendarPerson = await ensureCalendarPerson(actor.person.id, personId);
      const { error } = await supabase
        .from("account_calendar_people")
        .update({
          service_address_line1: nullable(body.serviceAddressLine1, 240),
          service_address_line2: nullable(body.serviceAddressLine2, 240),
          service_city: nullable(body.serviceCity, 120),
          service_state: text(body.serviceState, 2).toUpperCase() || null,
          service_postal_code: nullable(body.servicePostalCode, 20),
          service_country_code: text(body.serviceCountryCode, 2).toUpperCase() || "US",
          private_notes: nullable(body.privateNotes, 4000),
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", calendarPerson.id)
        .eq("owner_person_id", actor.person.id);
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true, personId });
    }

    if (action === "save-person-details") {
      const personId = text(body.personId, 80);
      const status = text(body.status, 20) || "active";
      if (!personId) throw new Error("Choose a person to update.");
      if (!calendarPersonStatuses.has(status)) throw new Error("Choose a valid calendar status.");
      const calendarPerson = await ensureCalendarPerson(actor.person.id, personId);
      const { data, error } = await supabase
        .from("account_calendar_people")
        .update({
          service_address_line1: nullable(body.serviceAddressLine1, 240),
          service_address_line2: nullable(body.serviceAddressLine2, 240),
          service_city: nullable(body.serviceCity, 120),
          service_state: text(body.serviceState, 2).toUpperCase() || null,
          service_postal_code: nullable(body.servicePostalCode, 20),
          service_country_code: text(body.serviceCountryCode, 2).toUpperCase() || "US",
          private_notes: nullable(body.privateNotes, 4000),
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", calendarPerson.id)
        .eq("owner_person_id", actor.person.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "This person is not available in your calendar.");
      return NextResponse.json({ ok: true });
    }

    if (action === "create-appointment" || action === "update-appointment") {
      const appointmentId = text(body.appointmentId, 80);
      const personId = text(body.personId, 80);
      const title = text(body.title, 180);
      const startsAt = timestamp(body.startsAt, "start time");
      const endsAt = timestamp(body.endsAt, "end time");
      const status = text(body.status, 20) || "scheduled";
      if (action === "update-appointment" && !appointmentId) throw new Error("Choose an appointment to update.");
      if (!personId) throw new Error("Choose a person.");
      if (!title) throw new Error("Add an appointment title.");
      if (endsAt <= startsAt) throw new Error("The end time must be after the start time.");
      if (endsAt.getTime() - startsAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
        throw new Error("An appointment cannot be longer than seven days.");
      }
      if (!appointmentStatuses.has(status)) throw new Error("Choose a valid appointment status.");
      const calendarPerson = await ensureCalendarPerson(actor.person.id, personId);
      await requireOwnedCalendarPerson(actor.person.id, calendarPerson.id, status === "scheduled");

      const values = {
        calendar_person_id: calendarPerson.id,
        title,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status,
        location: nullable(body.location, 500),
        notes: nullable(body.notes, 4000),
        updated_at: new Date().toISOString(),
      };

      if (action === "create-appointment") {
        const { data, error } = await supabase
          .from("account_appointments")
          .insert({ ...values, owner_person_id: actor.person.id })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message || "This appointment could not be saved.");
        return NextResponse.json({ ok: true, appointmentId: data.id });
      }

      const { data, error } = await supabase
        .from("account_appointments")
        .update(values)
        .eq("id", appointmentId)
        .eq("owner_person_id", actor.person.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "This appointment is not available in your account.");
      return NextResponse.json({ ok: true, appointmentId: data.id });
    }

    if (action === "set-appointment-status") {
      const appointmentId = text(body.appointmentId, 80);
      const status = text(body.status, 20);
      if (!appointmentId || !appointmentStatuses.has(status)) throw new Error("Choose a valid appointment update.");
      const { data, error } = await supabase
        .from("account_appointments")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", appointmentId)
        .eq("owner_person_id", actor.person.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "This appointment is not available in your account.");
      return NextResponse.json({ ok: true });
    }

    throw new Error("That calendar action is not available.");
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "That calendar change could not be saved." },
      { status: 400 },
    );
  }
}
