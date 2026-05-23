import type { Sale } from "./types";

type RegionSale = Pick<Sale, "city" | "state">;

type FacebookDestination = {
  county: string;
  state: string;
  name: string;
  url: string;
  isDedicated: boolean;
};

type OpenRegion = FacebookDestination & {
  cities: string[];
};

const cityCounty: Record<string, string> = {
  aurora: "Kane County",
  batavia: "Kane County",
  beecher: "Will County",
  bolingbrook: "Will County",
  bradley: "Kankakee County",
  bourbonnais: "Kankakee County",
  "buffalo grove": "Lake County",
  chicago: "Cook County",
  "chicago heights": "Cook County",
  channahon: "Will County",
  crete: "Will County",
  "crest hill": "Will County",
  elwood: "Will County",
  "elk grove village": "Cook County",
  frankfort: "Will County",
  glenwood: "Cook County",
  "grant park": "Kankakee County",
  henry: "Marshall County",
  hinsdale: "DuPage County",
  "homer glen": "Will County",
  joliet: "Will County",
  kankakee: "Kankakee County",
  lemont: "Cook County",
  lockport: "Will County",
  manhattan: "Will County",
  manteno: "Kankakee County",
  minooka: "Grundy County",
  mokena: "Will County",
  momence: "Kankakee County",
  monee: "Will County",
  naperville: "DuPage County",
  "new lenox": "Will County",
  "oak lawn": "Cook County",
  "orland park": "Cook County",
  peotone: "Will County",
  plainfield: "Will County",
  raymond: "Montgomery County",
  riverside: "Cook County",
  romeoville: "Will County",
  sandwich: "DeKalb County",
  shorewood: "Will County",
  "st anne": "Kankakee County",
  "sugar grove": "Kane County",
  waukegan: "Lake County",
  "western springs": "Cook County",
  wilmington: "Will County",
  zion: "Lake County",
};

const defaultWillCountyGroupUrl = "https://www.facebook.com/groups/955521984061525";
const defaultGeneralFacebookUrl = "https://www.facebook.com/groups/1480489626874863";

const openRegions: OpenRegion[] = [
  {
    county: "Will County",
    state: "IL",
    name: "Localized Will County Garage Sales & SaleTrail",
    url: process.env.NEXT_PUBLIC_WILL_COUNTY_FACEBOOK_GROUP_URL ||
      process.env.NEXT_PUBLIC_LOCALIZED_FACEBOOK_GROUP_URL ||
      defaultWillCountyGroupUrl,
    isDedicated: true,
    cities: [
      "beecher",
      "bolingbrook",
      "channahon",
      "crete",
      "crest hill",
      "elwood",
      "frankfort",
      "homer glen",
      "joliet",
      "lockport",
      "manhattan",
      "minooka",
      "mokena",
      "monee",
      "naperville",
      "new lenox",
      "peotone",
      "plainfield",
      "romeoville",
      "shorewood",
      "wilmington",
    ],
  },
  {
    county: "Kankakee County",
    state: "IL",
    name: "Localized Kankakee County Garage Sales & SaleTrail",
    url: process.env.NEXT_PUBLIC_KANKAKEE_COUNTY_FACEBOOK_GROUP_URL ||
      process.env.NEXT_PUBLIC_GENERAL_LOCALIZED_FACEBOOK_URL ||
      defaultGeneralFacebookUrl,
    isDedicated: true,
    cities: [
      "bradley",
      "bourbonnais",
      "grant park",
      "kankakee",
      "manteno",
      "momence",
      "st anne",
    ],
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function countyForSale(sale: RegionSale) {
  return cityCounty[normalize(sale.city)] || null;
}

export function regionDestinationForSale(sale: RegionSale): FacebookDestination {
  const city = normalize(sale.city);
  const state = normalize(sale.state);
  const county = countyForSale(sale);
  const region = openRegions.find(
    (item) => normalize(item.state) === state && county === item.county && item.cities.includes(city),
  );

  if (region) return region;

  return {
    county: county || `${sale.city} area`,
    state: sale.state,
    name: "Localized.life",
    url: process.env.NEXT_PUBLIC_GENERAL_LOCALIZED_FACEBOOK_URL || defaultGeneralFacebookUrl,
    isDedicated: false,
  };
}

export function dedicatedAreaShareNote(sale: RegionSale) {
  const destination = regionDestinationForSale(sale);
  if (destination.isDedicated) return "";

  return `\n\nHelp grow SaleTrail in the ${destination.county} — if more local sales get listed, a dedicated Localized group can be opened for this area.`;
}

export function facebookDestinationInstruction(sale: RegionSale) {
  const destination = regionDestinationForSale(sale);
  if (destination.isDedicated) {
    return `Post in ${destination.name}.`;
  }

  return `Post in ${destination.name}. This area does not have a dedicated Localized SaleTrail group yet, so help grow SaleTrail in the ${destination.county}.`;
}
