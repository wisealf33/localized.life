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

function isMusicEvent(event: Pick<LocalEvent, "title" | "description" | "event_type">) {
  if (event.event_type !== "festival" && event.event_type !== "community_day") return false;

  const text = `${event.title} ${event.description || ""}`.toLowerCase();
  return [
    "music festival",
    "live music",
    "rockin' on the square",
    "rockin on the square",
    "concert",
    "performing",
  ].some((term) => text.includes(term));
}

export function eventPreviewImagePath(event: Pick<LocalEvent, "city" | "state" | "title" | "description" | "event_type">) {
  const musicFestivalPath = "/og/music-festival.jpg";
  if (isMusicEvent(event) && publicFileExists(musicFestivalPath)) return musicFestivalPath;

  const cityStatePath = `/og/${urlSegment(event.city)}-${urlSegment(event.state)}.jpg`;
  if (publicFileExists(cityStatePath)) return cityStatePath;

  const legacyCityPath = `/og/${urlSegment(event.city)}.jpg`;
  if (publicFileExists(legacyCityPath)) return legacyCityPath;

  const cityWidePath = "/og/city-wide-sale.jpg";
  if (publicFileExists(cityWidePath)) return cityWidePath;

  const defaultPath = "/og/default-saletrail.jpg";
  if (publicFileExists(defaultPath)) return defaultPath;

  return null;
}
