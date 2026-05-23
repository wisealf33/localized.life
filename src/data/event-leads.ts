import type { EventLead, LocalEventType } from "@/lib/types";

const sourceLabel = "2026 Central Illinois Area Town Wide Rummage Sale Schedule screenshot";
const sourceNotes =
  "Admin-only lead from a photographed printed schedule. Verify with an official town page, organizer post, or reliable public source before publishing.";
const createdAt = "2026-05-21T17:40:00.000Z";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function lead(city: string, dateText: string, eventType: LocalEventType = "city_wide_garage_sale"): EventLead {
  return {
    id: `${slugify(city)}-${slugify(dateText)}`,
    slug: `${slugify(city)}-${slugify(dateText)}`,
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
  };
}

export const centralIllinoisEventLeads: EventLead[] = [
  lead("Findlay", "May 22-23, 2026"),
  lead("Jacksonville", "May 22-24, 2026"),
  lead("Lovington", "May 28-30, 2026"),
  lead("Mt. Zion", "May 30-June 2, 2026"),
  lead("Marshall", "May 30, 2026"),
  lead("Rt 40 Sales", "May 27-31, 2026", "community_sale"),
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
];
