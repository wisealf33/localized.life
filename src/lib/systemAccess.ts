import "server-only";

import { getSupabaseAdmin } from "./supabase";

export async function hasSystemManagementAccess(personId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("person_system_roles")
    .select("role")
    .eq("person_id", personId)
    .eq("active", true)
    .in("role", ["founder", "system_manager"])
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}
