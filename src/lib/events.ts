import type { LocalEvent, LocalEventType } from "./types";
import { urlSegment } from "./format";

export const eventTypeOptions: { value: LocalEventType; label: string }[] = [
  { value: "city_wide_garage_sale", label: "City-wide garage sale" },
  { value: "community_sale", label: "Community sale" },
  { value: "flea_market", label: "Flea market" },
  { value: "swap_meet", label: "Swap meet" },
  { value: "farmers_market", label: "Farmers market" },
  { value: "local_market", label: "Local market" },
];

export function eventTypeLabel(type: LocalEventType) {
  return eventTypeOptions.find((option) => option.value === type)?.label || "Local event";
}

export function eventPath(event: Pick<LocalEvent, "slug" | "city" | "state">) {
  return `/saletrail/events/${urlSegment(event.state)}/${urlSegment(event.city)}/${event.slug}`;
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
