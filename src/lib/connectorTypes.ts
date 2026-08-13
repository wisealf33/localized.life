export type Person = {
  id: string;
  auth_user_id: string | null;
  display_name: string;
  email: string | null;
  phone: string | null;
  town: string | null;
  state: string | null;
  how_met: string | null;
  private_notes: string | null;
  abilities: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectorProfile = {
  person_id: string;
  slug: string;
  display_name: string;
  headline: string;
  intro: string;
  active: boolean;
};

export type ConnectorRelationship = {
  id: string;
  connector_person_id: string;
  person_id: string | null;
  household_id: string | null;
  is_primary: boolean;
  status: "active" | "inactive";
  started_at: string;
};

export type Household = {
  id: string;
  name: string | null;
  address_line: string | null;
  town: string | null;
  state: string | null;
  zip: string | null;
};

export type HouseholdMembership = {
  person_id: string;
  household_id: string;
  role: "member" | "manager";
};

export type NeedStatus = "new" | "working" | "scheduled" | "completed" | "closed";

export type Need = {
  id: string;
  requester_person_id: string;
  household_id: string | null;
  connector_person_id: string;
  title: string;
  details: string;
  status: NeedStatus;
  scheduled_for: string | null;
  completed_at: string | null;
  assigned_person_id: string | null;
  connector_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ConnectorInteraction = {
  id: string;
  person_id: string;
  connector_person_id: string;
  need_id: string | null;
  note: string;
  occurred_at: string;
};
