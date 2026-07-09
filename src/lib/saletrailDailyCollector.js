const saleColumns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, categories, source_notes, source_platform, source_url, source_poster_name, raw_source_text, event_id";

const sourcePages = [
  "https://garagesalefinder.com/yard-sales/manteno-il/",
  "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  "https://www.southchicagoheights.com/m/newsflash/Home/Detail/161",
  "https://www.southchicagoheights.com/ImageRepository/Document?documentId=1673",
  "https://www.townplanner.com/event/571911",
];

const southChicagoHeightsEvent = {
  slug: "south-chicago-heights-village-wide-garage-sale-2026",
  title: "South Chicago Heights Village-Wide Garage Sale 2026",
  event_type: "city_wide_garage_sale",
  description:
    "Official village-wide garage sale with participating homes around South Chicago Heights. Some stops have day-specific notes from the village flyer.",
  address_line: "Participating homes around South Chicago Heights",
  city: "South Chicago Heights",
  state: "IL",
  zip: "60411",
  county: "Cook County",
  starts_at: "2026-07-09T13:00:00.000Z",
  ends_at: "2026-07-11T22:00:00.000Z",
  event_schedule:
    "Thursday, July 9-Saturday, July 11, 2026\n8 AM-5 PM. Some addresses are marked Thursday only, Friday/Saturday only, Saturday only, or Thursday/Friday only.",
  source_url: "https://www.southchicagoheights.com/m/newsflash/Home/Detail/161",
  source_platform: "Village of South Chicago Heights",
  source_notes:
    "Official village flyer posted July 8, 2026. Address list source image: https://www.southchicagoheights.com/ImageRepository/Document?documentId=1673",
};

const southChicagoHeightsStops = [
  ["3001 Cappelletti", ""],
  ["2922 Chicago Rd", "Friday-Saturday only."],
  ["3227 Commercial Ave", ""],
  ["3319 Commercial", ""],
  ["3029 Enterprise Park Ave", ""],
  ["3229 Enterprise Park Ave", ""],
  ["3037 Fairview", ""],
  ["3046 Fairview", ""],
  ["3121 Fairview", ""],
  ["3313 Fairview", ""],
  ["3129 Euclid", "Thursday only."],
  ["3100 Helfred", ""],
  ["2646 Jackson", ""],
  ["3328 Lynwood", ""],
  ["3332 Lynwood", ""],
  ["241 Magnolia", ""],
  ["2717 Miller Ave", ""],
  ["2725 Miller Ave", ""],
  ["3106 Miller Ave", ""],
  ["252 Park Terrace", ""],
  ["3137 Rosiclaire", ""],
  ["3148 Willow Rd", "Saturday only."],
  ["202 W. 26th St", "Saturday only."],
  ["194 W. 27th Pl", "Thursday-Friday only."],
  ["169 W. 28th St", ""],
  ["218 W. 28th St", ""],
  ["219 W. 28th St", ""],
  ["230 W. 29th St", ""],
  ["115 W. 29th Pl", ""],
  ["139 W. 29th Pl", ""],
  ["206 W. 31st St", ""],
];

const individualListings = [
  {
    title: "Annual Friends and Family Garage Sale",
    description: "Public garage sale listing in Homewood from regional garage-sale search results.",
    address_line: "18350 Center Ave",
    city: "Homewood",
    state: "IL",
    zip: "60430",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder / Yard Sale Search",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Christmas In July Garage Sale",
    description: "Public garage sale listing in Chicago Heights from regional garage-sale search results.",
    address_line: "320 Interurban Ave",
    city: "Chicago Heights",
    state: "IL",
    zip: "60411",
    days: ["2026-07-10", "2026-07-11", "2026-07-12"],
    categories: ["Garage sale", "Seasonal"],
    source_platform: "Yard Sale Search",
    source_url: "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  },
  {
    title: "Huge Multi-Family Garage Sale in Frankfort",
    description: "Multi-family garage sale in Frankfort from public regional sale listings.",
    address_line: "10865 Swallow Tail Ln",
    city: "Frankfort",
    state: "IL",
    zip: "60423",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Multi-family sale", "Home goods"],
    source_platform: "Yard Sale Search",
    source_url: "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  },
  {
    title: "Moving Sale in Tinley Park",
    description: "Moving sale in Tinley Park from public regional sale listings.",
    address_line: "6933 176th St",
    city: "Tinley Park",
    state: "IL",
    zip: "60477",
    days: ["2026-07-09", "2026-07-10", "2026-07-11"],
    categories: ["Moving sale", "Home goods"],
    source_platform: "Yard Sale Search",
    source_url: "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  },
  {
    title: "Tinley Park Garage Sale on 170th Place",
    description: "Garage sale in Tinley Park from public regional sale listings.",
    address_line: "7537 170th Pl",
    city: "Tinley Park",
    state: "IL",
    zip: "60477",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "Yard Sale Search",
    source_url: "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  },
  {
    title: "Garage Sale in Homewood",
    description: "Garage sale in Homewood from public regional sale listings.",
    address_line: "18149 Rockwell Ave",
    city: "Homewood",
    state: "IL",
    zip: "60430",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "Yard Sale Search",
    source_url: "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  },
  {
    title: "Nobil's Beecher Estate Sale",
    description: "Estate sale in Beecher from public regional sale listings.",
    address_line: "29246 S State Line Rd",
    city: "Beecher",
    state: "IL",
    zip: "60401",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Estate sale", "Home goods", "Collectibles"],
    source_platform: "Yard Sale Search",
    source_url: "https://www.yardsalesearch.com/garage-sales-manteno-il.html",
  },
  {
    title: "Orland Park Estate Sale",
    description: "Estate sale in Orland Park from public regional sale listings.",
    address_line: "15417 Aster Ln",
    city: "Orland Park",
    state: "IL",
    zip: "60462",
    days: ["2026-07-11", "2026-07-12"],
    categories: ["Estate sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "CAIT'S Orland Park Estate Sale",
    description: "Estate sale in Orland Park from public regional sale listings.",
    address_line: "14020 Blackhawk Ln",
    city: "Orland Park",
    state: "IL",
    zip: "60462",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Estate sale", "Home goods", "Collectibles"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Multi-Family Community Garage Sale in Orland Park",
    description: "Multi-family/community garage sale in Orland Park from public regional sale listings.",
    address_line: "9333 Montgomery Dr",
    city: "Orland Park",
    state: "IL",
    zip: "60462",
    days: ["2026-07-10", "2026-07-11"],
    start: "09:00",
    end: "15:00",
    categories: ["Garage sale", "Multi-family sale", "Community sale"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Huge Multi-Family Garage Sale in Orland Park",
    description: "Huge multi-family garage sale in Orland Park from public regional sale listings.",
    address_line: "9126 Carlisle Ln",
    city: "Orland Park",
    state: "IL",
    zip: "60462",
    days: ["2026-07-10", "2026-07-11"],
    start: "09:00",
    end: "16:00",
    categories: ["Garage sale", "Multi-family sale"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Pinewood North Subdivision Garage Sale",
    description: "Subdivision garage sale listing in Orland Park from public regional sale listings.",
    address_line: "13540 Kristoffer Ln",
    city: "Orland Park",
    state: "IL",
    zip: "60467",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Community sale", "Garage sale"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Orland Park Garage Sale on Irving Avenue",
    description: "Garage sale in Orland Park from public regional sale listings.",
    address_line: "14400 Irving Ave",
    city: "Orland Park",
    state: "IL",
    zip: "60462",
    days: ["2026-07-09", "2026-07-10"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Estate Sale: Mid Century and Beyond",
    description: "Estate sale in Crown Point from public regional sale listings.",
    address_line: "985 Cedar Dr",
    city: "Crown Point",
    state: "IN",
    zip: "46307",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Estate sale", "Collectibles", "Furniture"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Hammond Garage Sale on Lindberg Avenue",
    description: "Garage sale in Hammond from public regional sale listings.",
    address_line: "6915 Lindberg Ave",
    city: "Hammond",
    state: "IN",
    zip: "46323",
    days: ["2026-07-09", "2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Summer Bike Sale with 60+ Bikes",
    description: "Bike-focused sale in Oak Lawn from public regional sale listings.",
    address_line: "10629 S Kilbourn Ave",
    city: "Oak Lawn",
    state: "IL",
    zip: "60453",
    days: ["2026-07-10", "2026-07-11"],
    start: "10:00",
    end: "17:00",
    categories: ["Garage sale", "Bikes"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Church Parking Lot Sale in Oak Lawn",
    description: "One-day church parking lot sale in Oak Lawn from public regional sale listings.",
    address_line: "10000 S Central Ave",
    city: "Oak Lawn",
    state: "IL",
    zip: "60453",
    days: ["2026-07-11"],
    categories: ["Rummage sale", "Community sale"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Oak Lawn Moving and Downsizing Sale",
    description: "Moving and downsizing sale in Oak Lawn from public regional sale listings.",
    address_line: "10025 S 53rd Ave",
    city: "Oak Lawn",
    state: "IL",
    zip: "60453",
    days: ["2026-07-11", "2026-07-12"],
    categories: ["Moving sale", "Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "One-Day Oak Lawn Garage Sale",
    description: "One-day garage sale in Oak Lawn from public regional sale listings.",
    address_line: "9820 S Kenneth Ave",
    city: "Oak Lawn",
    state: "IL",
    zip: "60453",
    days: ["2026-07-09"],
    start: "09:00",
    end: "17:00",
    categories: ["Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Oak Lawn Garage Sale on South Knox Avenue",
    description:
      "Garage sale in Oak Lawn from public regional sale listings. Source text had inconsistent title/date wording, so shoppers should verify details on the source page.",
    address_line: "9521 S Knox Ave",
    city: "Oak Lawn",
    state: "IL",
    zip: "60453",
    days: ["2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
    source_notes: "Source result had inconsistent title/date wording; verify before making a special trip.",
  },
  {
    title: "Chicago Clothing and Thrift-Style Sale",
    description: "Public Chicago sale listing focused on clothing/thrift-style finds.",
    address_line: "6152 S Kolin Ave",
    city: "Chicago",
    state: "IL",
    zip: "60629",
    days: ["2026-07-11", "2026-07-12"],
    categories: ["Garage sale", "Clothing"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Multi-Family Garage Sale in Chicago",
    description: "Multi-family garage sale in Chicago from public regional sale listings.",
    address_line: "5155 S Meade Ave",
    city: "Chicago",
    state: "IL",
    zip: "60638",
    days: ["2026-07-09", "2026-07-10", "2026-07-11"],
    categories: ["Garage sale", "Multi-family sale"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Palos Heights Garage Sale This Weekend",
    description: "Weekend garage sale in Palos Heights from public regional sale listings.",
    address_line: "12548 S Parkside Ave",
    city: "Palos Heights",
    state: "IL",
    zip: "60463",
    days: ["2026-07-11", "2026-07-12"],
    categories: ["Garage sale", "Home goods"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
  {
    title: "Alsip Moving and Garage Sale",
    description: "Moving/garage sale in Alsip from public regional sale listings.",
    address_line: "11942 S Lawler Ave",
    city: "Alsip",
    state: "IL",
    zip: "60803",
    days: ["2026-07-11", "2026-07-12"],
    categories: ["Moving sale", "Garage sale"],
    source_platform: "GarageSaleFinder",
    source_url: "https://garagesalefinder.com/yard-sales/manteno-il/",
  },
];

function slugifyTitle(title) {
  const suffix = Math.random().toString(16).slice(2, 8);
  const clean = String(title || "sale")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 62);
  return `${clean || "sale"}-${suffix}`;
}

function formatScheduleDate(dateValue) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${dateValue}T12:00:00`));
}

function formatScheduleTime(timeValue) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: timeValue.endsWith(":00") ? undefined : "2-digit",
  }).format(new Date(`2026-01-01T${timeValue}:00`));
}

function buildSchedule(days, start = "08:00", end = "15:00", extraNote = "") {
  const rows = [...days].sort().map((date) => ({
    date,
    startsAt: new Date(`${date}T${start}:00-05:00`).toISOString(),
    endsAt: new Date(`${date}T${end}:00-05:00`).toISOString(),
    line: `${formatScheduleDate(date)} ${formatScheduleTime(start)}-${formatScheduleTime(end)}`,
  }));

  return {
    starts_at: rows[0].startsAt,
    ends_at: rows[rows.length - 1].endsAt,
    sale_schedule: [...rows.map((row) => row.line), extraNote].filter(Boolean).join("\n"),
  };
}

function scheduleForStop(note) {
  const normalized = String(note || "").toLowerCase();
  if (normalized.includes("friday-saturday")) return buildSchedule(["2026-07-10", "2026-07-11"], "08:00", "17:00", note);
  if (normalized.includes("thursday-friday")) return buildSchedule(["2026-07-09", "2026-07-10"], "08:00", "17:00", note);
  if (normalized.includes("thursday only")) return buildSchedule(["2026-07-09"], "08:00", "17:00", note);
  if (normalized.includes("saturday only")) return buildSchedule(["2026-07-11"], "08:00", "17:00", note);
  return buildSchedule(["2026-07-09", "2026-07-10", "2026-07-11"], "08:00", "17:00", note);
}

function titleForStop(addressLine) {
  const street = String(addressLine).replace(/^\d+\s+/, "").replace(/\.$/, "").trim();
  return `South Chicago Heights Garage Sale on ${street}`;
}

async function geocodeAddress(listing) {
  const query = `${listing.address_line}, ${listing.city}, ${listing.state} ${listing.zip}`;
  const params = new URLSearchParams({
    address: query,
    benchmark: "Public_AR_Current",
    format: "json",
  });

  try {
    const response = await fetch(`https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params.toString()}`, {
      headers: { "User-Agent": "SaleTrail by Localized.life (claims@localized.life)" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    const first = data?.result?.addressMatches?.[0]?.coordinates;
    const latitude = Number(first?.y);
    const longitude = Number(first?.x);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude, precision: "address" };
  } catch {
    return null;
  }
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mergeText(existing, next, label) {
  const cleanExisting = String(existing || "").trim();
  const cleanNext = String(next || "").trim();
  if (!cleanNext) return cleanExisting;
  if (!cleanExisting) return cleanNext;
  if (normalize(cleanExisting).includes(normalize(cleanNext))) return cleanExisting;
  return `${cleanExisting}\n\n${label}:\n${cleanNext}`;
}

function mergeCategories(existing, next) {
  return Array.from(new Set([...(existing || []), ...(next || [])]));
}

async function findExistingSale(supabase, listing) {
  const { data: addressMatches, error: addressError } = await supabase
    .from("sales")
    .select(saleColumns)
    .ilike("address_line", listing.address_line)
    .eq("city", listing.city)
    .eq("state", listing.state)
    .eq("zip", listing.zip)
    .lte("starts_at", listing.ends_at)
    .gte("ends_at", listing.starts_at)
    .limit(10);
  if (addressError) throw addressError;
  if (addressMatches?.[0]) return addressMatches[0];

  const { data, error } = await supabase
    .from("sales")
    .select(saleColumns)
    .eq("city", listing.city)
    .eq("state", listing.state)
    .eq("zip", listing.zip)
    .lte("starts_at", listing.ends_at)
    .gte("ends_at", listing.starts_at)
    .limit(20);
  if (error) throw error;

  return (data || []).find((sale) => normalize(sale.title) === normalize(listing.title)) || null;
}

async function upsertSale(supabase, listing, counters, dryRun) {
  const existing = await findExistingSale(supabase, listing);
  const coordinates =
    existing?.latitude && existing?.longitude && existing?.location_precision === "address" ? null : await geocodeAddress(listing);

  if (existing) {
    const updatePayload = {
      description: listing.description || existing.description,
      starts_at: listing.starts_at < existing.starts_at ? listing.starts_at : existing.starts_at,
      ends_at: listing.ends_at > existing.ends_at ? listing.ends_at : existing.ends_at,
      sale_schedule: mergeText(existing.sale_schedule, listing.sale_schedule, "Additional schedule source"),
      categories: mergeCategories(existing.categories, listing.categories),
      source_notes: mergeText(existing.source_notes, listing.source_notes, "Daily source note"),
      raw_source_text: mergeText(existing.raw_source_text, listing.raw_source_text, "Daily source text"),
      event_id: existing.event_id || listing.event_id || null,
      updated_at: new Date().toISOString(),
    };
    if (!existing.source_platform && listing.source_platform) updatePayload.source_platform = listing.source_platform;
    if (!existing.source_url && listing.source_url) updatePayload.source_url = listing.source_url;
    if ((existing.latitude === null || existing.longitude === null) && coordinates) {
      updatePayload.latitude = coordinates.latitude;
      updatePayload.longitude = coordinates.longitude;
      updatePayload.location_precision = coordinates.precision;
    }

    if (!dryRun) {
      const { error } = await supabase.from("sales").update(updatePayload).eq("id", existing.id);
      if (error) throw error;
    }
    counters.updated += 1;
    return;
  }

  const insertPayload = {
    slug: slugifyTitle(listing.title),
    ...listing,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    location_precision: coordinates?.precision ?? null,
    status: "active",
    source_type: "community_added",
    claim_status: "unclaimed",
    visibility_status: "public",
    outreach_status: "not_contacted",
    outreach_private_done: false,
    outreach_group_done: false,
    photo_urls: [],
  };

  if (!dryRun) {
    const { error } = await supabase.from("sales").insert(insertPayload);
    if (error) throw error;
  }
  counters.inserted += 1;
}

async function upsertEvent(supabase, dryRun) {
  const { data: existing, error: findError } = await supabase
    .from("local_events")
    .select("id, slug")
    .eq("slug", southChicagoHeightsEvent.slug)
    .limit(1)
    .maybeSingle();
  if (findError) throw findError;

  const coordinates = await geocodeAddress(southChicagoHeightsEvent);
  const payload = {
    ...southChicagoHeightsEvent,
    latitude: coordinates?.latitude ?? null,
    longitude: coordinates?.longitude ?? null,
    status: "active",
    visibility_status: "public",
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    if (!dryRun) {
      const { error } = await supabase.from("local_events").update(payload).eq("id", existing.id);
      if (error) throw error;
    }
    return existing.id;
  }

  if (dryRun) return "dry-run-event";

  const { data, error } = await supabase.from("local_events").insert(payload).select("id").single();
  if (error) throw error;
  return data.id;
}

function buildSouthChicagoHeightsListings(eventId) {
  return southChicagoHeightsStops.map(([address_line, note]) => {
    const schedule = scheduleForStop(note);
    return {
      title: titleForStop(address_line),
      description: `Participating stop in the South Chicago Heights Village-Wide Garage Sale. ${note || "Listed on the official village flyer."}`.trim(),
      address_line,
      city: "South Chicago Heights",
      state: "IL",
      zip: "60411",
      ...schedule,
      categories: ["City-wide sale", "Garage sale"],
      source_notes: `Imported from the official South Chicago Heights village-wide flyer. ${note}`.trim(),
      source_platform: "Village of South Chicago Heights",
      source_url: "https://www.southchicagoheights.com/ImageRepository/Document?documentId=1673",
      raw_source_text: `${address_line} ${note}`.trim(),
      event_id: eventId,
    };
  });
}

function buildIndividualListings() {
  return individualListings.map((listing) => {
    const schedule = buildSchedule(listing.days, listing.start || "08:00", listing.end || "15:00");
    return {
      ...listing,
      ...schedule,
      source_notes: [
        `Imported from public garage-sale search result during daily SaleTrail sweep on ${new Date().toISOString().slice(0, 10)}.`,
        listing.source_notes,
      ]
        .filter(Boolean)
        .join(" "),
      raw_source_text: `${listing.title} ${listing.address_line}, ${listing.city}, ${listing.state} ${listing.zip}`,
    };
  });
}

export function buildSaleTrailDailySeedListings(eventId = null) {
  return [...buildSouthChicagoHeightsListings(eventId), ...buildIndividualListings()];
}

async function scanSources() {
  const results = [];
  for (const url of sourcePages) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
          Accept: "text/html,image/*,*/*",
        },
      });
      results.push({ url, ok: response.ok, status: response.status });
    } catch (error) {
      results.push({ url, ok: false, status: 0, error: error instanceof Error ? error.message : "Fetch failed" });
    }
  }
  return results;
}

export async function runSaleTrailDailyCollector({ supabase, dryRun = false, scan = true }) {
  const counters = { inserted: 0, updated: 0 };
  const sourceResults = scan ? await scanSources() : [];
  const eventId = await upsertEvent(supabase, dryRun);
  const listings = [...buildSouthChicagoHeightsListings(eventId), ...buildIndividualListings()];

  for (const listing of listings) {
    await upsertSale(supabase, listing, counters, dryRun);
  }

  return {
    ...counters,
    considered: listings.length,
    sourcesScanned: sourceResults,
  };
}
