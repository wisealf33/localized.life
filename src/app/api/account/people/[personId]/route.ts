import { NextResponse } from "next/server";
import { authenticatePerson } from "@/lib/connectionAccess";
import { orderedPersonPair } from "@/lib/personConnections";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: RouteContext<"/api/account/people/[personId]">) {
  const actor = await authenticatePerson(request);
  if (!actor) return NextResponse.json({ error: "Sign in to view this connection." }, { status: 401 });

  const { personId } = await context.params;
  if (!personId || personId === actor.person.id) {
    return NextResponse.json({ error: "This connection is not available." }, { status: 404 });
  }

  const supabase = getSupabaseAdmin();
  const pair = orderedPersonPair(actor.person.id, personId);
  const { data: connection, error: connectionError } = await supabase
    .from("person_connections")
    .select("id, connected_at")
    .eq("person_one_id", pair.person_one_id)
    .eq("person_two_id", pair.person_two_id)
    .eq("status", "active")
    .maybeSingle();
  if (connectionError) return NextResponse.json({ error: connectionError.message }, { status: 500 });
  if (!connection) {
    return NextResponse.json({ error: "This Person is not in your connections." }, { status: 403 });
  }

  const [personResult, introducedByActorResult, introducedActorResult] = await Promise.all([
    supabase
      .from("people")
      .select("display_name, email, phone, town, state, skills, services_wanted, service_radius_miles")
      .eq("id", personId)
      .maybeSingle(),
    supabase
      .from("person_referral_attributions")
      .select("id")
      .eq("referrer_person_id", actor.person.id)
      .eq("referred_person_id", personId)
      .in("status", ["captured", "confirmed"])
      .maybeSingle(),
    supabase
      .from("person_referral_attributions")
      .select("id")
      .eq("referrer_person_id", personId)
      .eq("referred_person_id", actor.person.id)
      .in("status", ["captured", "confirmed"])
      .maybeSingle(),
  ]);
  const firstError = personResult.error || introducedByActorResult.error || introducedActorResult.error;
  if (firstError) return NextResponse.json({ error: firstError.message }, { status: 500 });
  if (!personResult.data) return NextResponse.json({ error: "This profile was not found." }, { status: 404 });

  const relationship = introducedByActorResult.data
    ? { direction: "introduced_by_you" as const }
    : introducedActorResult.data
      ? { direction: "introduced_you" as const }
      : { direction: "established_connection" as const };

  return NextResponse.json({
    person: personResult.data,
    connection: {
      connected_at: connection.connected_at,
      relationship_direction: relationship.direction,
    },
  });
}
