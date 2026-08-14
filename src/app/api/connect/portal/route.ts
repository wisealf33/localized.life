import { NextResponse } from "next/server";
import { getClaimInvitationByToken } from "@/lib/connectorClaims";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function portalToken(request: Request) {
  const authorization = request.headers.get("authorization") || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
}

async function requirePortal(request: Request) {
  const invitation = await getClaimInvitationByToken(portalToken(request));
  if (!invitation || invitation.state !== "active") {
    throw new Error("This private profile link is no longer active.");
  }
  return invitation;
}

function privateResponse(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  try {
    const invitation = await requirePortal(request);
    const supabase = getSupabaseAdmin();
    const [needsResult, interactionsResult] = await Promise.all([
      supabase
        .from("needs")
        .select("id, title, details, status, scheduled_for, completed_at, amount_cents, created_at, updated_at")
        .eq("requester_person_id", invitation.person.id)
        .eq("connector_person_id", invitation.connector.person_id)
        .order("created_at", { ascending: false }),
      supabase
        .from("connector_interactions")
        .select("id, need_id, note, visibility, occurred_at")
        .eq("person_id", invitation.person.id)
        .eq("connector_person_id", invitation.connector.person_id)
        .eq("visibility", "shared")
        .order("occurred_at", { ascending: false }),
    ]);
    const error = needsResult.error || interactionsResult.error;
    if (error) return privateResponse({ error: error.message }, { status: 500 });

    return privateResponse({
      person: invitation.person,
      connector: invitation.connector,
      needs: needsResult.data || [],
      interactions: interactionsResult.data || [],
    });
  } catch (error) {
    return privateResponse(
      { error: error instanceof Error ? error.message : "This private profile could not be opened." },
      { status: 401 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const invitation = await requirePortal(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action = text(body.action, 40);
    const supabase = getSupabaseAdmin();

    if (action === "add-need") {
      const title = text(body.title, 160);
      if (!title) throw new Error("Tell us what you need first.");
      const { error } = await supabase.from("needs").insert({
        requester_person_id: invitation.person.id,
        connector_person_id: invitation.connector.person_id,
        title,
        details: text(body.details, 4000),
        status: "new",
      });
      if (error) throw new Error(error.message);
      return privateResponse({ ok: true, message: `${invitation.connector.display_name} received your request.` });
    }

    if (action === "resolve-need") {
      const needId = text(body.needId, 80);
      const status = body.status === "closed" ? "closed" : "completed";
      if (!needId) throw new Error("Choose a Need to update.");
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("needs")
        .update({
          status,
          completed_at: status === "completed" ? now : null,
          updated_at: now,
        })
        .eq("id", needId)
        .eq("requester_person_id", invitation.person.id)
        .eq("connector_person_id", invitation.connector.person_id)
        .in("status", ["new", "working", "scheduled"])
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("That Need is no longer open.");
      return privateResponse({
        ok: true,
        message: status === "completed" ? "Marked finished." : "Marked as no longer needed.",
      });
    }

    throw new Error("That profile action is not available.");
  } catch (error) {
    return privateResponse(
      { error: error instanceof Error ? error.message : "That change could not be saved." },
      { status: 400 },
    );
  }
}
