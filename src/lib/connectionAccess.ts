import "server-only";

import { getSupabaseAdmin } from "./supabase";

export async function authenticatePerson(request: Request, requireConnector = false) {
  const authorization = request.headers.get("authorization") || "";
  const accessToken = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!accessToken) return null;

  const supabase = getSupabaseAdmin();
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return null;

  const { data: person, error: personError } = await supabase
    .from("people")
    .select("id, auth_user_id, display_name, email, phone, town, state, abilities, created_by_person_id, claim_status, claimed_at")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (personError || !person) return null;

  if (requireConnector) {
    const { data: profile, error: profileError } = await supabase
      .from("connector_profiles")
      .select("person_id, slug, display_name, headline, intro, active")
      .eq("person_id", person.id)
      .eq("active", true)
      .maybeSingle();
    if (profileError || !profile) return null;
    return { user: userData.user, person, connector: profile };
  }

  return { user: userData.user, person };
}

export async function isConnectedPerson(connectorPersonId: string, personId: string) {
  const { data } = await getSupabaseAdmin()
    .from("connector_relationships")
    .select("id")
    .eq("connector_person_id", connectorPersonId)
    .eq("person_id", personId)
    .eq("status", "active")
    .maybeSingle();
  return Boolean(data);
}
