export type SaleSourceType = "seller_created" | "community_added" | "admin_added";
export type ClaimStatus = "unclaimed" | "claim_pending" | "claimed";
export type SaleStatus = "active" | "cancelled" | "ended";
export type VisibilityStatus = "public" | "hidden" | "removed";
export type ListingRequestType = "correction" | "removal";
export type ClaimVerificationMethod = "original_post_comment" | "localized_group_post";

export type Sale = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  address_line: string;
  city: string;
  state: string;
  zip: string;
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
  source_url: string | null;
  raw_source_text: string | null;
  manage_token_hash: string | null;
  claimed_at: string | null;
  claimed_by_name: string | null;
  claimed_by_contact: string | null;
  admin_notes: string | null;
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
