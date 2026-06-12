import type { EventLead, LocalEventType } from "@/lib/types";

const sourceLabel = "2026 Central Illinois Area Town Wide Rummage Sale Schedule screenshot";
const sourceNotes =
  "Admin-only lead from a photographed printed schedule. Verify with an official town page, organizer post, or reliable public source before publishing.";
const createdAt = "2026-05-21T17:40:00.000Z";
const internetResearchCreatedAt = "2026-06-11T18:00:00.000Z";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function lead(
  city: string,
  dateText: string,
  eventType: LocalEventType = "city_wide_garage_sale",
  overrides: Partial<EventLead> = {},
): EventLead {
  const defaultSlug = `${slugify(city)}-${slugify(dateText)}`;

  return {
    id: defaultSlug,
    slug: defaultSlug,
    title: `${city} City-Wide Sale Lead`,
    city,
    state: "IL",
    date_text: dateText,
    event_type: eventType,
    source_label: sourceLabel,
    source_notes: sourceNotes,
    status: "needs_source",
    admin_notes: null,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

function researchLead(
  city: string,
  state: string,
  dateText: string,
  source: string,
  notes: string,
  eventType: LocalEventType = "city_wide_garage_sale",
  status: EventLead["status"] = "needs_source",
): EventLead {
  return lead(city, dateText, eventType, {
    state,
    source_label: source,
    source_notes: notes,
    status,
    created_at: internetResearchCreatedAt,
    updated_at: internetResearchCreatedAt,
  });
}

export const centralIllinoisEventLeads: EventLead[] = [
  lead("Findlay", "May 22-23, 2026"),
  lead("Jacksonville", "May 22-24, 2026"),
  lead("Lovington", "May 28-30, 2026"),
  lead("Mt. Zion", "May 30-June 2, 2026"),
  lead("Marshall", "May 30, 2026"),
  lead("Rt 40 Sales", "May 27-31, 2026", "community_sale", {
    source_label: "National Road Heritage Foundation",
    source_notes:
      "Official 23rd Annual Historic National Road Yard Sale Festival source: https://nationalrdfoundation.org/event/yardsale-2026/. Maryland sales/stores PDF saved as source material: https://nationalrdfoundation.org/wp-content/uploads/MD_SalesStores-NationalRoadYardSale26_revisedMay04.pdf. Treat as a multi-state route sale, not a normal city-wide event.",
    status: "added",
    admin_notes: "Added as a Route sale hub. Add individual stops later by state/area after deciding coverage.",
  }),
  lead("Strasburg", "June 5-6, 2026"),
  lead("Rt 111 Sales", "June 5-6, 2026", "community_sale"),
  lead("Arthur", "June 5-6, 2026"),
  lead("Watseka", "June 5-6, 2026"),
  lead("Farmer City", "June 4-6, 2026"),
  lead("Hoopeston", "June 4-6, 2026"),
  lead("Stewardson", "June 13, 2026"),
  lead("Clinton", "June 12-13, 2026"),
  lead("Cerro Gordo", "June 12-13, 2026"),
  lead("Loda", "June 20, 2026"),
  lead("Rt. 66 Lincoln/Logan County", "June 19-21, 2026", "community_sale"),
  lead("Shelbyville", "June 26-27, 2026"),
  lead("Kansas", "June 26-27, 2026"),
  lead("Mt. Pulaski", "July 3-4, 2026"),
  lead("Cerro Gordo", "July 24-25, 2026"),
  lead("Arcola", "August 7-8, 2026"),
  lead("Greenville", "August 7-8, 2026"),
  lead("Rt 127 Yard Sales", "August 6-9, 2026", "community_sale"),
  lead("Kenney", "August 15, 2026"),
  lead("Oakland/Hindsboro", "August 29, 2026"),
  lead("Arthur", "September 11-12, 2026"),
  lead("Sesser", "September 11-12, 2026"),
  lead("Illiopolis", "September 12, 2026"),
  lead("Monticello", "September 17-20, 2026"),
  lead("Atwood", "September 18-19, 2026"),
  lead("Tuscola", "September 18-19, 2026"),
  lead("Gibson City", "September 18-19, 2026"),
  lead("Tolono", "September 18-19, 2026"),
  lead("Virginia", "October 3, 2026"),
  researchLead(
    "Sycamore",
    "IL",
    "June 11-13, 2026",
    "Discover Sycamore",
    "Source-backed admin lead: https://discoversycamore.com/events/community-wide-garage-sale/. Verify participating addresses before publishing stops.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Peru",
    "IL",
    "June 12-13, 2026",
    "City of Peru",
    "Source-backed admin lead: https://www.peru.il.us/newsflash/787-city-wide-garage-sales. City page references 2026 city-wide garage sales.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Crown Point",
    "IN",
    "June 11-14, 2026",
    "City of Crown Point / GreatNews.Life",
    "Source-backed admin lead. City page has 2026 sale list/map: https://www.crownpoint.in.gov/550/City-Wide-Garage-Sale. Event listing also says June 11-14: https://greatnews.life/event/city-of-crown-point-city-wide-garage-sale/.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Pingree Grove",
    "IL",
    "June 18-20, 2026",
    "Village of Pingree Grove",
    "Official village page lists 2026 community-wide garage sale dates as June 18, 19, and 20 from 8 AM to 6 PM: https://www.villageofpingreegrove.org/589/Community-Wide-Garage-Sale.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Winfield",
    "IN",
    "June 18-20, 2026",
    "Town of Winfield",
    "Source-backed admin lead from town event page: https://www.winfield.in.gov/events/page/winfield-garage-sale-days-3. Verify sale list or address map before publishing stops.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "North Manchester",
    "IN",
    "June 19-20, 2026",
    "Town social/search lead",
    "Potential town-wide garage sale lead from search/social result. Needs an official town, chamber, organizer, or public event source before publishing.",
  ),
  researchLead(
    "Harwood Heights",
    "IL",
    "June 26-28, 2026",
    "Village of Harwood Heights",
    "Official village event page lists Village-Wide Garage Sale from 9 AM to 5 PM: https://www.harwoodheights.org/event/village-wide-garage-sale-900am-500pm-8/2026-06-27/.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Lombard",
    "IL",
    "June 26-27, 2026",
    "Public social/search lead",
    "Potential community-wide garage sale lead from public search/social result. Needs official village, organizer, or reliable public source before publishing.",
  ),
  researchLead(
    "Monee",
    "IL",
    "July 24-25, 2026",
    "Village of Monee",
    "Official village page lists a second 2026 Town-Wide Garage Sale on July 24-25 from 8 AM to 5 PM: https://www.villageofmonee.org/447/Garage-Sale.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Mokena",
    "IL",
    "August 13-16, 2026",
    "Mokena Community Garage Sale event listing",
    "Potential August community-wide sale lead: https://allevents.in/org/mokena-community-garage-sale/12032759. Verify with organizer or local page before publishing.",
  ),
  researchLead(
    "Park Ridge",
    "IL",
    "September 12, 2026",
    "Park Ridge Community Wide Garage Sale",
    "Source-backed lead from dedicated event site: https://parkridgecommunitywidegaragesale.com/. Registration deadline listed as August 15, 2026.",
    "community_sale",
    "verified",
  ),
  researchLead(
    "Wapella",
    "IL",
    "June 12-13, 2026",
    "Public social/search lead",
    "Potential community-wide sale lead from public search/social result. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Woodland",
    "IL",
    "June 12-13, 2026",
    "Public social/search lead",
    "Potential community-wide sale lead from public search/social result. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Lacon",
    "IL",
    "June 12-13, 2026",
    "Regional event roundup lead",
    "Potential city-wide/community-wide sale lead from regional roundup/search result. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "South Pekin",
    "IL",
    "June 12-13, 2026",
    "Regional event roundup lead",
    "Potential city-wide/community-wide sale lead from regional roundup/search result. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Morton",
    "IL",
    "June 13, 2026",
    "Regional event roundup lead",
    "Potential city-wide/community-wide sale lead from regional roundup/search result. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Okawville",
    "IL",
    "June 11-13, 2026",
    "Public search lead",
    "Potential town-wide sale lead found during summer scan. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Onarga",
    "IL",
    "June 19-20, 2026",
    "Public search lead",
    "Potential town-wide sale lead found during summer scan. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Mt. Vernon / Jefferson County",
    "IL",
    "June 26-27, 2026",
    "Public search lead",
    "Potential county/community sale lead found during summer scan. Needs official organizer or reliable public source before publishing.",
  ),
  researchLead(
    "Trail Creek",
    "IN",
    "June 12-14, 2026",
    "Public search lead",
    "Potential town-wide sale lead found during summer scan. Needs official organizer or reliable public source before publishing.",
  ),
];
