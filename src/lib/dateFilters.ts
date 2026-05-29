export const rangeOptions = [
  { value: "today", label: "Today" },
  { value: "next3", label: "Next 3 days" },
  { value: "week", label: "Next 7 days" },
  { value: "weekend", label: "This weekend" },
] as const;

export type DateRangeOption = (typeof rangeOptions)[number]["value"];

export function rangeParam(value: string | undefined) {
  return rangeOptions.some((option) => option.value === value) ? value : "";
}

function chicagoDate(offsetDays = 0) {
  const date = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function chicagoDayOfWeek() {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
  }).format(new Date());
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
}

export function rangeDates(range: string) {
  if (range === "today") return { from: chicagoDate(), to: chicagoDate() };
  if (range === "next3") return { from: chicagoDate(), to: chicagoDate(3) };
  if (range === "week") return { from: chicagoDate(), to: chicagoDate(7) };
  if (range === "weekend") {
    const day = chicagoDayOfWeek();
    if (day === 0) return { from: chicagoDate(), to: chicagoDate() };
    if (day >= 4 && day <= 6) return { from: chicagoDate(), to: chicagoDate(7 - day) };

    const daysToThursday = 4 - day;
    return { from: chicagoDate(daysToThursday), to: chicagoDate(daysToThursday + 3) };
  }
  return null;
}
