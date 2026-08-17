import { NextResponse } from "next/server";
import { authenticatePerson } from "@/lib/connectionAccess";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const appointmentStatuses = new Set(["scheduled", "completed", "cancelled"]);
const customerStatuses = new Set(["active", "archived"]);

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

async function requireOwnedCustomer(ownerPersonId: string, customerId: string, activeOnly = true) {
  const { data, error } = await getSupabaseAdmin()
    .from("account_customers")
    .select("id, status")
    .eq("id", customerId)
    .eq("owner_person_id", ownerPersonId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Choose a customer from your account.");
  if (activeOnly && data.status !== "active") throw new Error("Restore this customer before scheduling them.");
  return data;
}

export async function GET(request: Request) {
  const actor = await authenticatePerson(request);
  if (!actor) return NextResponse.json({ error: "Sign in to open your calendar." }, { status: 401 });

  try {
    const range = requestedRange(request);
    const supabase = getSupabaseAdmin();
    const [customersResult, appointmentsResult] = await Promise.all([
      supabase
        .from("account_customers")
        .select("id, display_name, email, phone, address, notes, status, created_at, updated_at")
        .eq("owner_person_id", actor.person.id)
        .order("status", { ascending: true })
        .order("display_name", { ascending: true })
        .limit(500),
      supabase
        .from("account_appointments")
        .select("id, customer_id, title, starts_at, ends_at, status, location, notes, created_at, updated_at")
        .eq("owner_person_id", actor.person.id)
        .gte("starts_at", range.start)
        .lt("starts_at", range.end)
        .order("starts_at", { ascending: true })
        .limit(2000),
    ]);

    const firstError = customersResult.error || appointmentsResult.error;
    if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });

    return NextResponse.json({
      person: { id: actor.person.id, display_name: actor.person.display_name },
      range,
      customers: customersResult.data || [],
      appointments: appointmentsResult.data || [],
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

    if (action === "create-customer") {
      const displayName = text(body.displayName, 120);
      if (!displayName) throw new Error("Add the customer's name.");
      const { data, error } = await supabase
        .from("account_customers")
        .insert({
          owner_person_id: actor.person.id,
          display_name: displayName,
          email: email(body.email),
          phone: nullable(body.phone, 60),
          address: nullable(body.address, 500),
          notes: nullable(body.notes, 4000),
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(error?.message || "This customer could not be saved.");
      return NextResponse.json({ ok: true, customerId: data.id });
    }

    if (action === "update-customer") {
      const customerId = text(body.customerId, 80);
      const displayName = text(body.displayName, 120);
      const status = text(body.status, 20) || "active";
      if (!customerId) throw new Error("Choose a customer to update.");
      if (!displayName) throw new Error("Add the customer's name.");
      if (!customerStatuses.has(status)) throw new Error("Choose a valid customer status.");
      const { data, error } = await supabase
        .from("account_customers")
        .update({
          display_name: displayName,
          email: email(body.email),
          phone: nullable(body.phone, 60),
          address: nullable(body.address, 500),
          notes: nullable(body.notes, 4000),
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId)
        .eq("owner_person_id", actor.person.id)
        .select("id")
        .maybeSingle();
      if (error || !data) throw new Error(error?.message || "This customer is not available in your account.");
      return NextResponse.json({ ok: true });
    }

    if (action === "create-appointment" || action === "update-appointment") {
      const appointmentId = text(body.appointmentId, 80);
      const customerId = text(body.customerId, 80);
      const title = text(body.title, 180);
      const startsAt = timestamp(body.startsAt, "start time");
      const endsAt = timestamp(body.endsAt, "end time");
      const status = text(body.status, 20) || "scheduled";
      if (action === "update-appointment" && !appointmentId) throw new Error("Choose an appointment to update.");
      if (!customerId) throw new Error("Choose a customer.");
      if (!title) throw new Error("Add an appointment title.");
      if (endsAt <= startsAt) throw new Error("The end time must be after the start time.");
      if (endsAt.getTime() - startsAt.getTime() > 7 * 24 * 60 * 60 * 1000) {
        throw new Error("An appointment cannot be longer than seven days.");
      }
      if (!appointmentStatuses.has(status)) throw new Error("Choose a valid appointment status.");
      await requireOwnedCustomer(actor.person.id, customerId, status === "scheduled");

      const values = {
        customer_id: customerId,
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
