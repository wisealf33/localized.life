import "server-only";

import { getSupabaseAdmin } from "./supabase";

type ReferralInput = {
  referredPersonId: string;
  referrerPersonId: string;
  sourceType: string;
  sourceReference: string;
  referralType?: "sponsored" | "assigned";
  assignedByPersonId?: string | null;
  assignmentReason?: string | null;
  metadata?: Record<string, unknown>;
};

async function currentReferral(referredPersonId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("person_referral_attributions")
    .select("id, referrer_person_id, referral_type, internal_sequence_number")
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

  const { data, error } = await getSupabaseAdmin()
    .from("person_referral_attributions")
    .insert({
      referred_person_id: input.referredPersonId,
      referrer_person_id: input.referrerPersonId,
      referral_type: input.referralType || "sponsored",
      assigned_by_person_id: input.assignedByPersonId || null,
      assignment_reason: input.assignmentReason || null,
      source_type: input.sourceType,
      source_reference: input.sourceReference,
      status: "captured",
      metadata: input.metadata || {},
    })
    .select("id, referral_type, internal_sequence_number")
    .single();
  if (error || !data) throw new Error(error?.message || "Referral could not be recorded.");
  return { captured: true, attribution: data };
}

export async function assignReferral(input: ReferralInput) {
  if (input.referredPersonId === input.referrerPersonId) {
    throw new Error("A person cannot be their own referrer.");
  }

  const current = await currentReferral(input.referredPersonId);
  if (current?.referrer_person_id === input.referrerPersonId) return { assigned: false };
  if (current) throw new Error("This person already has a referrer.");

  const result = await captureReferral({
    ...input,
    referralType: "assigned",
  });
  return { assigned: result.captured, attribution: "attribution" in result ? result.attribution : null };
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
