export type SaleSourceType = "seller_created" | "community_added" | "admin_added";
export type ClaimStatus = "unclaimed" | "claim_pending" | "claimed";
export type SaleStatus = "active" | "cancelled" | "ended";
export type VisibilityStatus = "public" | "hidden" | "removed";
export type ListingRequestType = "correction" | "removal";
export type FeedbackRequestType = "feature" | "bug" | "general";
export type LocalSubmissionArea = "market" | "event" | "service" | "mentor";
export type LocalSubmissionStatus = "pending" | "reviewed" | "approved" | "rejected";
export type EventLeadStatus = "needs_source" | "verified" | "added" | "ignored";
export type BacklogLeadType = "local_goods" | "services" | "tools" | "gardens" | "food" | "local_exchange" | "other";
export type MonetizationLeadCategory =
  | "local_sponsor"
  | "print_partner"
  | "estate_sale_company"
  | "citywide_partner"
  | "affiliate"
  | "local_business"
  | "grant"
  | "other";
export type MonetizationLeadStatus = "idea" | "researching" | "contacted" | "interested" | "not_fit" | "active";
export type MonetizationLeadPriority = "low" | "medium" | "high";
export type LocalEventType =
  | "city_wide_garage_sale"
  | "community_sale"
  | "festival"
  | "vendor_market"
  | "craft_fair"
  | "flea_market"
  | "swap_meet"
  | "farmers_market"
  | "local_market"
  | "workshop_class"
  | "plant_swap"
  | "community_day";
export type ClaimVerificationMethod = "original_post_comment" | "localized_group_post";
export type OutreachStatus =
  | "not_contacted"
  | "message_sent"
  | "comment_posted"
  | "localized_group_posted"
  | "follow_up_needed"
  | "outreach_complete"
  | "claimed"
  | "do_not_contact"
  | "removed";

export type Sale = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  address_line: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  location_precision: "address" | "area" | null;
  starts_at: string;
  ends_at: string;
  sale_schedule: string | null;
  photo_urls: string[] | null;
  categories: string[] | null;
  status: SaleStatus;
  source_type: SaleSourceType;
  claim_status: ClaimStatus;
  visibility_status: VisibilityStatus;
  source_notes: string | null;
  source_platform: string | null;
  source_url: string | null;
  source_poster_name: string | null;
  raw_source_text: string | null;
  outreach_status: OutreachStatus | null;
  outreach_last_at: string | null;
  outreach_notes: string | null;
  outreach_private_done: boolean | null;
  outreach_private_done_at: string | null;
  outreach_group_done: boolean | null;
  outreach_group_done_at: string | null;
  event_id: string | null;
  manage_token_hash: string | null;
  claimed_at: string | null;
  claimed_by_name: string | null;
  claimed_by_contact: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type LocalEvent = {
  id: string;
  slug: string;
  title: string;
  event_type: LocalEventType;
  description: string | null;
  address_line: string | null;
  city: string;
  state: string;
  zip: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  starts_at: string;
  ends_at: string;
  event_schedule: string | null;
  source_url: string | null;
  source_platform: string | null;
  source_notes: string | null;
  status: SaleStatus;
  visibility_status: VisibilityStatus;
  created_at: string;
  updated_at: string;
};

export type ClaimRequest = {
  id: string;
  sale_id: string;
  name: string;
  contact: string;
  claimant_email: string | null;
  facebook_profile_name: string | null;
  relationship: string;
  message: string | null;
  claim_code: string;
  verification_method: ClaimVerificationMethod | null;
  wants_updates: boolean | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  sales?: Pick<Sale, "title" | "slug" | "city" | "state"> | null;
};

export type ListingRequest = {
  id: string;
  sale_id: string;
  request_type: ListingRequestType;
  name: string | null;
  contact: string | null;
  message: string;
  status: "pending" | "resolved" | "rejected";
  created_at: string;
  sales?: Pick<Sale, "title" | "slug" | "city" | "state"> | null;
};

export type FeedbackRequest = {
  id: string;
  request_type: FeedbackRequestType;
  name: string | null;
  contact: string | null;
  page_url: string | null;
  message: string;
  status: "pending" | "reviewed" | "resolved" | "rejected";
  created_at: string;
};

export type LocalSubmission = {
  id: string;
  submission_area: LocalSubmissionArea;
  title: string;
  category: string | null;
  name: string | null;
  contact: string | null;
  submitter_email: string | null;
  city: string | null;
  state: string | null;
  website_url: string | null;
  description: string;
  status: LocalSubmissionStatus;
  admin_notes: string | null;
  manage_token_hash: string | null;
  manage_email_sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventLead = {
  id: string;
  slug: string;
  title: string;
  city: string;
  state: string;
  date_text: string;
  event_type: LocalEventType;
  source_label: string | null;
  source_notes: string | null;
  status: EventLeadStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BacklogLead = {
  id: string;
  title: string;
  lead_type: BacklogLeadType;
  area: string;
  source_label: string | null;
  source_url: string | null;
  source_poster_name: string | null;
  summary: string;
  notes: string;
  created_at: string;
};

export type MonetizationLead = {
  id: string;
  title: string;
  category: MonetizationLeadCategory;
  status: MonetizationLeadStatus;
  priority: MonetizationLeadPriority;
  area: string | null;
  company_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_url: string | null;
  estimated_value: string | null;
  fit_notes: string | null;
  next_step: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};
