import { existsSync } from "fs";
import path from "path";
import type { LocalEvent, LocalEventType } from "./types";
import { urlSegment } from "./format";

export const eventTypeOptions: { value: LocalEventType; label: string }[] = [
  { value: "city_wide_garage_sale", label: "City-wide garage sale" },
  { value: "festival", label: "Festival" },
  { value: "vendor_market", label: "Vendor market" },
  { value: "craft_fair", label: "Craft fair" },
  { value: "flea_market", label: "Flea market" },
  { value: "swap_meet", label: "Swap meet" },
  { value: "farmers_market", label: "Farmers market" },
  { value: "local_market", label: "Local market" },
  { value: "workshop_class", label: "Workshop or class" },
  { value: "plant_swap", label: "Plant swap" },
  { value: "community_day", label: "Community day" },
  { value: "community_sale", label: "Community sale" },
];

export function eventTypeLabel(type: LocalEventType) {
  return eventTypeOptions.find((option) => option.value === type)?.label || "Local event";
}

const saleTrailEventTypes = new Set<LocalEventType>(["city_wide_garage_sale", "community_sale"]);

export function eventSupportsSaleStops(type: LocalEventType) {
  return saleTrailEventTypes.has(type);
}

export function eventUsesSaleTrailFeatures(type: LocalEventType) {
  return saleTrailEventTypes.has(type);
}

export function eventPath(event: Pick<LocalEvent, "slug" | "city" | "state">) {
  return `/local-events/${urlSegment(event.state)}/${urlSegment(event.city)}/${event.slug}`;
}

export function formatEventHours(event: Pick<LocalEvent, "starts_at" | "ends_at" | "event_schedule">) {
  if (event.event_schedule?.trim()) return event.event_schedule.trim();
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${formatter.format(new Date(event.starts_at))} to ${formatter.format(new Date(event.ends_at))}`;
}

function publicFileExists(publicPath: string) {
  return existsSync(path.join(process.cwd(), "public", publicPath.replace(/^\//, "")));
}

function firstExistingPublicPath(paths: Array<string | null | undefined>) {
  return paths.find((publicPath) => publicPath && publicFileExists(publicPath)) || null;
}

type EventPreviewImageEvent = Pick<
  LocalEvent,
  "city" | "state" | "title" | "description" | "event_type" | "event_schedule"
>;

const eventTypeImagePaths: Partial<Record<LocalEventType, string>> = {
  city_wide_garage_sale: "/og/city-wide-sale.jpg",
  community_sale: "/og/city-wide-sale.jpg",
  festival: "/og/community-festival.jpg",
  vendor_market: "/og/local-market-event.jpg",
  craft_fair: "/og/craft-festival.jpg",
  flea_market: "/og/flea-market.jpg",
  swap_meet: "/og/flea-market.jpg",
  farmers_market: "/og/farmers-market.jpg",
  local_market: "/og/local-market-event.jpg",
  workshop_class: "/og/local-event.jpg",
  plant_swap: "/og/garden-festival.jpg",
  community_day: "/og/community-festival.jpg",
};

const eventImageKeywordRules: Array<{ publicPath: string; keywords: string[] }> = [
  { publicPath: "/og/oktoberfest.jpg", keywords: ["oktoberfest"] },
  {
    publicPath: "/og/music-festival.jpg",
    keywords: [
      "music festival",
      "live music",
      "rockin' on the square",
      "rockin on the square",
      "concert",
      "performing",
      "band",
      "bluegrass",
      "folk",
    ],
  },
  {
    publicPath: "/og/carnival-festival.jpg",
    keywords: ["carnival", "midway", "ride special", "county fair", "fairgrounds", "fair "],
  },
  {
    publicPath: "/og/food-festival.jpg",
    keywords: ["food festival", "blueberry", "sweetcorn", "sweet corn", "rib", "bbq", "pancake", "taste of", "food truck", "food vendors"],
  },
  { publicPath: "/og/flea-market.jpg", keywords: ["flea market", "swap meet", "animal swap", "treasures"] },
  {
    publicPath: "/og/farmers-market.jpg",
    keywords: ["farmers market", "farmer's market", "market @ the square", "market at the square"],
  },
  { publicPath: "/og/craft-festival.jpg", keywords: ["craft", "vendor market", "vendors", "art fair", "maker"] },
  { publicPath: "/og/kids-festival.jpg", keywords: ["kids carnival", "children", "family fun", "back to school"] },
  { publicPath: "/og/garden-festival.jpg", keywords: ["garden", "plant swap", "plants", "flowers"] },
  { publicPath: "/og/heritage-festival.jpg", keywords: ["heritage", "history", "historic", "250th", "usa fest"] },
  { publicPath: "/og/car-show-festival.jpg", keywords: ["car show", "hot rods", "cruise night", "cruise nights"] },
  { publicPath: "/og/community-festival.jpg", keywords: ["community day", "festival", "celebration", "walk to end"] },
];

function eventSearchText(event: EventPreviewImageEvent) {
  return `${event.title} ${event.description || ""} ${event.event_schedule || ""} ${event.event_type}`.toLowerCase();
}

function themedEventImagePath(event: EventPreviewImageEvent) {
  const searchText = eventSearchText(event);
  const matchingRule = eventImageKeywordRules.find((rule) => rule.keywords.some((keyword) => searchText.includes(keyword)));

  return firstExistingPublicPath([matchingRule?.publicPath, eventTypeImagePaths[event.event_type], "/og/local-event.jpg"]);
}

export function eventPreviewImagePath(event: EventPreviewImageEvent) {
  const cityStatePath = `/og/${urlSegment(event.city)}-${urlSegment(event.state)}.jpg`;
  const legacyCityPath = `/og/${urlSegment(event.city)}.jpg`;

  if (eventUsesSaleTrailFeatures(event.event_type)) {
    return firstExistingPublicPath([cityStatePath, legacyCityPath, eventTypeImagePaths[event.event_type], "/og/city-wide-sale.jpg", "/og/default-saletrail.jpg"]);
  }

  return firstExistingPublicPath([themedEventImagePath(event), "/og/default-saletrail.jpg"]);
}
