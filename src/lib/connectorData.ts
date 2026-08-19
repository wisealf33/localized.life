import "server-only";

import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";
import type {
  ConnectorInteraction,
  ConnectorProfile,
  ConnectorRelationship,
  Household,
  HouseholdMembership,
  Need,
  Person,
} from "./connectorTypes";

const connectorProfileFields = "person_id, slug, display_name, headline, intro, active";
const personFields =
  "id, auth_user_id, display_name, email, phone, town, state, how_met, private_notes, created_at, updated_at";
const relationshipFields =
  "id, connector_person_id, person_id, household_id, is_primary, status, started_at";
const needFields =
  "id, requester_person_id, household_id, connector_person_id, title, details, status, scheduled_for, completed_at, assigned_person_id, connector_notes, created_at, updated_at";

export async function getConnectorProfileBySlug(slug: string) {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("connector_profiles")
    .select(connectorProfileFields)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error("Connector profile lookup failed", error);
    return null;
  }
  return data as ConnectorProfile | null;
}

export async function getActiveConnectorProfiles() {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("connector_profiles")
    .select(connectorProfileFields)
    .eq("active", true)
    .order("display_name");
  if (error) {
    console.error("Connector profile list failed", error);
    return [];
  }
  return (data || []) as ConnectorProfile[];
}

export type ConnectorPersonSummary = Person & {
  household: Household | null;
  openNeeds: number;
  lastInteraction: string | null;
};

export async function getConnectorAdminOverview(slug: string) {
  const connector = await getConnectorProfileBySlug(slug);
  if (!connector || !isSupabaseConfigured) return null;

  const supabase = getSupabaseAdmin();
  const [relationshipsResult, needsResult] = await Promise.all([
    supabase
      .from("connector_relationships")
      .select(relationshipFields)
      .eq("connector_person_id", connector.person_id)
      .eq("status", "active")
      .order("started_at", { ascending: false }),
    supabase
      .from("needs")
      .select(needFields)
      .eq("connector_person_id", connector.person_id)
      .order("updated_at", { ascending: false }),
  ]);

  if (relationshipsResult.error) throw new Error(relationshipsResult.error.message);
  if (needsResult.error) throw new Error(needsResult.error.message);

  const relationships = (relationshipsResult.data || []) as ConnectorRelationship[];
  const needs = (needsResult.data || []) as Need[];
  const personIds = Array.from(
    new Set(relationships.flatMap((relationship) => (relationship.person_id ? [relationship.person_id] : []))),
  );

  if (personIds.length === 0) {
    return { connector, people: [] as ConnectorPersonSummary[], needs };
  }

  const [peopleResult, membershipsResult, interactionsResult] = await Promise.all([
    supabase.from("people").select(personFields).in("id", personIds),
    supabase
      .from("household_memberships")
      .select("person_id, household_id, role")
      .in("person_id", personIds),
    supabase
      .from("connector_interactions")
      .select("id, person_id, connector_person_id, need_id, note, occurred_at")
      .eq("connector_person_id", connector.person_id)
      .in("person_id", personIds)
      .order("occurred_at", { ascending: false }),
  ]);

  if (peopleResult.error) throw new Error(peopleResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (interactionsResult.error) throw new Error(interactionsResult.error.message);

  const people = (peopleResult.data || []) as Person[];
  const memberships = (membershipsResult.data || []) as HouseholdMembership[];
  const interactions = (interactionsResult.data || []) as ConnectorInteraction[];
  const householdIds = Array.from(new Set(memberships.map((membership) => membership.household_id)));
  const householdsResult = householdIds.length
    ? await supabase
        .from("households")
        .select("id, name, address_line, town, state, zip")
        .in("id", householdIds)
    : { data: [], error: null };
  if (householdsResult.error) throw new Error(householdsResult.error.message);

  const households = (householdsResult.data || []) as Household[];
  const householdById = new Map(households.map((household) => [household.id, household]));
  const membershipByPerson = new Map(memberships.map((membership) => [membership.person_id, membership]));
  const openStatuses = new Set(["new", "working", "scheduled"]);

  const summaries = people
    .map((person) => {
      const membership = membershipByPerson.get(person.id);
      const latestInteraction = interactions.find((interaction) => interaction.person_id === person.id);
      return {
        ...person,
        household: membership ? householdById.get(membership.household_id) || null : null,
        openNeeds: needs.filter(
          (need) => need.requester_person_id === person.id && openStatuses.has(need.status),
        ).length,
        lastInteraction: latestInteraction?.occurred_at || null,
      };
    })
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return { connector, people: summaries, needs };
}

export async function getConnectorPersonDetail(slug: string, personId: string) {
  if (!isSupabaseConfigured) return null;
  const [connector, personResult] = await Promise.all([
    getConnectorProfileBySlug(slug),
    getSupabaseAdmin().from("people").select(personFields).eq("id", personId).maybeSingle(),
  ]);
  if (!connector || personResult.error || !personResult.data) return null;

  const supabase = getSupabaseAdmin();
  const [relationshipResult, needsResult, membershipsResult, interactionsResult] = await Promise.all([
    supabase
      .from("connector_relationships")
      .select(relationshipFields)
      .eq("connector_person_id", connector.person_id)
      .eq("person_id", personId)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("needs")
      .select(needFields)
      .eq("connector_person_id", connector.person_id)
      .eq("requester_person_id", personId)
      .order("created_at", { ascending: false }),
    supabase
      .from("household_memberships")
      .select("person_id, household_id, role")
      .eq("person_id", personId),
    supabase
      .from("connector_interactions")
      .select("id, person_id, connector_person_id, need_id, note, occurred_at")
      .eq("connector_person_id", connector.person_id)
      .eq("person_id", personId)
      .order("occurred_at", { ascending: false }),
  ]);

  if (relationshipResult.error || !relationshipResult.data) return null;
  if (needsResult.error) throw new Error(needsResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (interactionsResult.error) throw new Error(interactionsResult.error.message);

  const memberships = (membershipsResult.data || []) as HouseholdMembership[];
  const householdIds = memberships.map((membership) => membership.household_id);
  const householdsResult = householdIds.length
    ? await supabase
        .from("households")
        .select("id, name, address_line, town, state, zip")
        .in("id", householdIds)
    : { data: [], error: null };
  if (householdsResult.error) throw new Error(householdsResult.error.message);

  return {
    connector,
    person: personResult.data as Person,
    relationship: relationshipResult.data as ConnectorRelationship,
    needs: (needsResult.data || []) as Need[],
    memberships,
    households: (householdsResult.data || []) as Household[],
    interactions: (interactionsResult.data || []) as ConnectorInteraction[],
  };
}
