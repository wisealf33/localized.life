"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "./admin";
import { sendConnectorInviteEmail } from "./email";
import { getSupabaseAdmin } from "./supabase";
import type { NeedStatus } from "./connectorTypes";

const needStatuses = new Set<NeedStatus>(["new", "working", "scheduled", "completed", "closed"]);

function value(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function required(formData: FormData, key: string) {
  const next = value(formData, key);
  if (!next) throw new Error(`Missing ${key}`);
  return next;
}

function normalizedEmail(formData: FormData, key: string, requiredValue = false) {
  const email = value(formData, key).toLowerCase();
  if (!email && !requiredValue) return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Add a valid email address.");
  return email;
}

function siteUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life";
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

async function getConnector(slug: string) {
  const { data, error } = await getSupabaseAdmin()
    .from("connector_profiles")
    .select("person_id, slug, display_name")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) throw new Error("Connector is not available.");
  return data as { person_id: string; slug: string; display_name: string };
}

async function createInviteLink(email: string) {
  const supabase = getSupabaseAdmin();
  const options = { redirectTo: siteUrl("/connector") };
  let result = await supabase.auth.admin.generateLink({ type: "invite", email, options });

  if (result.error) {
    result = await supabase.auth.admin.generateLink({ type: "magiclink", email, options });
  }

  if (result.error || !result.data.properties?.action_link) {
    throw new Error(result.error?.message || "Could not create an account access link.");
  }

  return {
    inviteUrl: result.data.properties.action_link,
    authUserId: result.data.user?.id || null,
  };
}

async function sendInvite({
  personId,
  email,
  name,
  connectorName,
}: {
  personId: string;
  email: string;
  name: string;
  connectorName: string;
}) {
  const { inviteUrl, authUserId } = await createInviteLink(email);
  const supabase = getSupabaseAdmin();

  if (authUserId) {
    const { error } = await supabase
      .from("people")
      .update({ auth_user_id: authUserId, updated_at: new Date().toISOString() })
      .eq("id", personId)
      .or(`auth_user_id.is.null,auth_user_id.eq.${authUserId}`);
    if (error) throw new Error(error.message);
  }

  return sendConnectorInviteEmail({
    to: email,
    name,
    connectorName,
    inviteUrl,
  });
}

async function connectPerson({
  connectorSlug,
  displayName,
  email,
  phone,
  town,
  state,
  howMet,
  householdName,
  privateNotes,
  updateExistingDetails,
}: {
  connectorSlug: string;
  displayName: string;
  email: string;
  phone: string;
  town: string;
  state: string;
  howMet: string;
  householdName: string;
  privateNotes: string;
  updateExistingDetails: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const connector = await getConnector(connectorSlug);
  let personId = "";
  let created = false;

  if (email) {
    const { data, error } = await supabase
      .from("people")
      .select("id")
      .ilike("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    personId = data?.id || "";
  }

  if (!personId) {
    const { data, error } = await supabase
      .from("people")
      .insert({
        display_name: displayName,
        email: email || null,
        phone: phone || null,
        town: town || null,
        state: state ? state.toUpperCase() : null,
        how_met: howMet || null,
        private_notes: privateNotes || null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not create person.");
    personId = data.id;
    created = true;
  } else if (updateExistingDetails) {
    const { error } = await supabase
      .from("people")
      .update({
        phone: phone || undefined,
        town: town || undefined,
        state: state ? state.toUpperCase() : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", personId);
    if (error) throw new Error(error.message);
  }

  const { data: existingRelationship, error: relationshipLookupError } = await supabase
    .from("connector_relationships")
    .select("id")
    .eq("connector_person_id", connector.person_id)
    .eq("person_id", personId)
    .eq("status", "active")
    .maybeSingle();
  if (relationshipLookupError) throw new Error(relationshipLookupError.message);

  if (!existingRelationship) {
    const { error } = await supabase.from("connector_relationships").insert({
      connector_person_id: connector.person_id,
      person_id: personId,
      is_primary: true,
      status: "active",
      notes: howMet || null,
    });
    if (error) throw new Error(error.message);
  }

  if (householdName && created) {
    const { data: household, error: householdError } = await supabase
      .from("households")
      .insert({
        name: householdName,
        town: town || null,
        state: state ? state.toUpperCase() : null,
      })
      .select("id")
      .single();
    if (householdError || !household) throw new Error(householdError?.message || "Could not create household.");

    const [membershipResult, relationshipResult] = await Promise.all([
      supabase.from("household_memberships").insert({
        person_id: personId,
        household_id: household.id,
        role: "manager",
      }),
      supabase.from("connector_relationships").insert({
        connector_person_id: connector.person_id,
        household_id: household.id,
        is_primary: true,
        status: "active",
      }),
    ]);
    if (membershipResult.error) throw new Error(membershipResult.error.message);
    if (relationshipResult.error) throw new Error(relationshipResult.error.message);
  }

  return { connector, personId, created };
}

export async function startConnectorRelationship(formData: FormData) {
  const connectorSlug = value(formData, "connector_slug") || "garrett";
  let nextPath = `/connect/${encodeURIComponent(connectorSlug)}`;

  if (value(formData, "website")) redirect(`${nextPath}?connected=1`);

  try {
    const displayName = required(formData, "display_name");
    const email = normalizedEmail(formData, "email", true);
    const result = await connectPerson({
      connectorSlug,
      displayName,
      email,
      phone: value(formData, "phone"),
      town: value(formData, "town"),
      state: value(formData, "state"),
      howMet: value(formData, "how_met"),
      householdName: value(formData, "household_name"),
      privateNotes: "Connected through the public Connector page.",
      updateExistingDetails: false,
    });
    const emailResult = await sendInvite({
      personId: result.personId,
      email,
      name: displayName,
      connectorName: result.connector.display_name,
    });
    revalidatePath("/connector/admin");
    nextPath = `${nextPath}?connected=1&invite=${emailResult.sent ? "sent" : "setup"}`;
  } catch (error) {
    console.error("Public Connector connection failed", error);
    nextPath = `${nextPath}?error=1`;
  }

  redirect(nextPath);
}

export async function addConnectorPerson(formData: FormData) {
  await requireAdmin("/connector/admin");
  let nextPath = "/connector/admin#add-person";

  try {
    const displayName = required(formData, "display_name");
    const email = normalizedEmail(formData, "email");
    const result = await connectPerson({
      connectorSlug: "garrett",
      displayName,
      email,
      phone: value(formData, "phone"),
      town: value(formData, "town"),
      state: value(formData, "state"),
      howMet: value(formData, "how_met"),
      householdName: value(formData, "household_name"),
      privateNotes: value(formData, "private_notes"),
      updateExistingDetails: true,
    });
    let inviteStatus = "not-sent";
    if (email && formData.get("send_invite") === "on") {
      const emailResult = await sendInvite({
        personId: result.personId,
        email,
        name: displayName,
        connectorName: result.connector.display_name,
      });
      inviteStatus = emailResult.sent ? "sent" : "setup";
    }
    revalidatePath("/connector/admin");
    nextPath = `/connector/admin?added=1&invite=${inviteStatus}#my-people`;
  } catch (error) {
    console.error("Add Connector person failed", error);
    nextPath = "/connector/admin?error=add-person#add-person";
  }

  redirect(nextPath);
}

export async function resendConnectorInvite(formData: FormData) {
  await requireAdmin("/connector/admin");
  const personId = required(formData, "person_id");
  const supabase = getSupabaseAdmin();
  const [{ data: person, error: personError }, connector] = await Promise.all([
    supabase.from("people").select("id, display_name, email").eq("id", personId).maybeSingle(),
    getConnector("garrett"),
  ]);
  if (personError || !person?.email) redirect(`/connector/admin/people/${personId}?invite=missing`);

  const result = await sendInvite({
    personId,
    email: person.email,
    name: person.display_name,
    connectorName: connector.display_name,
  });
  revalidatePath(`/connector/admin/people/${personId}`);
  redirect(`/connector/admin/people/${personId}?invite=${result.sent ? "sent" : "setup"}`);
}

export async function addNeedAsConnector(formData: FormData) {
  await requireAdmin("/connector/admin");
  const personId = required(formData, "person_id");
  const connector = await getConnector("garrett");
  const scheduledValue = value(formData, "scheduled_for");
  const householdId = value(formData, "household_id");
  const { error } = await getSupabaseAdmin().from("needs").insert({
    requester_person_id: personId,
    household_id: householdId || null,
    connector_person_id: connector.person_id,
    title: required(formData, "title"),
    details: value(formData, "details"),
    status: scheduledValue ? "scheduled" : "new",
    scheduled_for: scheduledValue ? new Date(scheduledValue).toISOString() : null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/connector/admin");
  revalidatePath(`/connector/admin/people/${personId}`);
  redirect(`/connector/admin/people/${personId}?need=added#needs`);
}

export async function updateNeedAsConnector(formData: FormData) {
  await requireAdmin("/connector/admin");
  const needId = required(formData, "need_id");
  const personId = required(formData, "person_id");
  const status = required(formData, "status") as NeedStatus;
  if (!needStatuses.has(status)) throw new Error("Invalid need status.");
  const connector = await getConnector("garrett");
  const scheduledValue = value(formData, "scheduled_for");
  const now = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from("needs")
    .update({
      status,
      scheduled_for: scheduledValue ? new Date(scheduledValue).toISOString() : null,
      connector_notes: value(formData, "connector_notes") || null,
      completed_at: status === "completed" ? now : null,
      updated_at: now,
    })
    .eq("id", needId)
    .eq("requester_person_id", personId)
    .eq("connector_person_id", connector.person_id);
  if (error) throw new Error(error.message);
  revalidatePath("/connector/admin");
  revalidatePath(`/connector/admin/people/${personId}`);
  redirect(`/connector/admin/people/${personId}?need=updated#needs`);
}

export async function addConnectorInteraction(formData: FormData) {
  await requireAdmin("/connector/admin");
  const personId = required(formData, "person_id");
  const connector = await getConnector("garrett");
  const supabase = getSupabaseAdmin();
  const { data: relationship } = await supabase
    .from("connector_relationships")
    .select("id")
    .eq("connector_person_id", connector.person_id)
    .eq("person_id", personId)
    .eq("status", "active")
    .maybeSingle();
  if (!relationship) throw new Error("This person is not connected to this Connector.");

  const { error } = await supabase.from("connector_interactions").insert({
    person_id: personId,
    connector_person_id: connector.person_id,
    need_id: value(formData, "need_id") || null,
    note: required(formData, "note"),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/connector/admin");
  revalidatePath(`/connector/admin/people/${personId}`);
  redirect(`/connector/admin/people/${personId}?interaction=added#history`);
}

export async function updateConnectorPerson(formData: FormData) {
  await requireAdmin("/connector/admin");
  const personId = required(formData, "person_id");
  const email = normalizedEmail(formData, "email");
  const { error } = await getSupabaseAdmin()
    .from("people")
    .update({
      display_name: required(formData, "display_name"),
      email: email || null,
      phone: value(formData, "phone") || null,
      town: value(formData, "town") || null,
      state: value(formData, "state").toUpperCase() || null,
      how_met: value(formData, "how_met") || null,
      private_notes: value(formData, "private_notes") || null,
      abilities: value(formData, "abilities") || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", personId);
  if (error) throw new Error(error.message);
  revalidatePath("/connector/admin");
  revalidatePath(`/connector/admin/people/${personId}`);
  redirect(`/connector/admin/people/${personId}?person=updated`);
}
