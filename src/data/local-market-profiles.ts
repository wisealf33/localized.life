export type LocalMarketProduct = {
  name: string;
  category: string;
  price: string | null;
  details: string;
};

export type LocalMarketProfile = {
  slug: string;
  sourceLeadId: string;
  profileName: string;
  protectedOwnerName: string | null;
  area: string;
  claimStatus: "unclaimed" | "claimed";
  summary: string;
  privacyNote: string;
  products: LocalMarketProduct[];
  sourceLabel: string | null;
  sourceUrl: string | null;
};

export const localMarketProfiles: LocalMarketProfile[] = [
  {
    slug: "covenant-creek-farm",
    sourceLeadId: "covenant-creek-farm-eggs-honey-peotone-2026-05-22",
    profileName: "Covenant Creek Farm",
    protectedOwnerName: "Michele C.",
    area: "Peotone / Will County, IL",
    claimStatus: "unclaimed",
    summary:
      "A local farm-style profile for porch-pickup goods. The original post mentioned fresh eggs and wildflower honey.",
    privacyNote:
      "Exact address and full personal name are not shown publicly. The owner can claim this profile to update products, contact details, pickup rules, and privacy preferences.",
    products: [
      {
        name: "Farm fresh eggs",
        category: "Eggs",
        price: "$4 per dozen",
        details: "Cage-free eggs listed as ready for porch pickup.",
      },
      {
        name: "Wildflower honey",
        category: "Honey",
        price: "$12 per jar",
        details: "Local wildflower honey listed with porch pickup.",
      },
    ],
    sourceLabel: "Community post",
    sourceUrl: null,
  },
];

export function marketProfilePath(profile: LocalMarketProfile) {
  return `/local-market/${profile.slug}`;
}
