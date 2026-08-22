import "server-only";

import { getSupabaseAdmin } from "./supabase";

export function orderedPersonPair(firstPersonId: string, secondPersonId: string) {
  return firstPersonId < secondPersonId
    ? { person_one_id: firstPersonId, person_two_id: secondPersonId }
    : { person_one_id: secondPersonId, person_two_id: firstPersonId };
}

type EnsurePersonConnectionInput = {
  firstPersonId: string;
  secondPersonId: string;
  introducedByPersonId?: string | null;
  connectionSource: string;
};

export async function ensurePersonConnection(input: EnsurePersonConnectionInput) {
  if (input.firstPersonId === input.secondPersonId) return;

  const supabase = getSupabaseAdmin();
  const pair = orderedPersonPair(input.firstPersonId, input.secondPersonId);
  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("person_connections").upsert(
    {
      ...pair,
      introduced_by_person_id: input.introducedByPersonId || null,
      connection_source: input.connectionSource,
      status: "active",
      ended_at: null,
      updated_at: now,
    },
    { onConflict: "person_one_id,person_two_id", ignoreDuplicates: true },
  );
  if (insertError) throw new Error(insertError.message);

  // Re-activate an existing relationship without replacing its original source.
  const { error: updateError } = await supabase
    .from("person_connections")
    .update({ status: "active", ended_at: null, updated_at: now })
    .eq("person_one_id", pair.person_one_id)
    .eq("person_two_id", pair.person_two_id);
  if (updateError) throw new Error(updateError.message);
}
