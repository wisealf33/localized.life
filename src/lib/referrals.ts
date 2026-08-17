import "server-only";

import { getSupabaseAdmin } from "./supabase";

type ReferralInput = {
  referredPersonId: string;
  referrerPersonId: string;
  sourceType: string;
  sourceReference: string;
  metadata?: Record<string, unknown>;
};

async function currentReferral(referredPersonId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("person_referral_attributions")
    .select("id, referrer_person_id")
    .eq("referred_person_id", referredPersonId)
    .in("status", ["captured", "confirmed"])
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function captureReferral(input: ReferralInput) {
  if (input.referredPersonId === input.referrerPersonId) return { captured: false };

  const current = await currentReferral(input.referredPersonId);
  if (current) return { captured: false, current };

  const { error } = await getSupabaseAdmin().from("person_referral_attributions").insert({
    referred_person_id: input.referredPersonId,
    referrer_person_id: input.referrerPersonId,
    source_type: input.sourceType,
    source_reference: input.sourceReference,
    status: "captured",
    metadata: input.metadata || {},
  });
  if (error) throw new Error(error.message);
  return { captured: true };
}

export async function assignReferral(input: ReferralInput) {
  if (input.referredPersonId === input.referrerPersonId) {
    throw new Error("A person cannot be their own referrer.");
  }

  const current = await currentReferral(input.referredPersonId);
  if (current?.referrer_person_id === input.referrerPersonId) return { assigned: false };
  if (current) throw new Error("This person already has a referrer.");

  const result = await captureReferral(input);
  return { assigned: result.captured };
}

export async function isReferralCoordinator(personId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("referral_coordinators")
    .select("person_id")
    .eq("person_id", personId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}
