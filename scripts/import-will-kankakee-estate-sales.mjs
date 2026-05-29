import crypto from "node:crypto";
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (check .env.local).");
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableNetworkError(err) {
  const code = err?.cause?.code || err?.code;
  return ["ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED"].includes(code);
}

async function resilientFetch(url, init) {
  const maxAttempts = 4;
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      if (!isRetryableNetworkError(err) || attempt === maxAttempts) throw err;
      await sleep(250 * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
  global: { fetch: resilientFetch },
});

const targetCitySlugs = new Set([
  "beecher",
  "bolingbrook",
  "bourbonnais",
  "bradley",
  "channahon",
  "crest-hill",
  "essex",
  "frankfort",
  "joliet",
  "kankakee",
  "lemont",
  "lockport",
  "manhattan",
  "manteno",
  "minooka",
  "mokena",
  "new-lenox",
  "peotone",
  "plainfield",
  "romeoville",
  "shorewood",
  "shorewood-",
  "wilmington",
]);

const searchPages = [
  "https://estatesales.org/estate-sales/il/joliet",
  "https://estatesales.org/estate-sales/il/kankakee",
];

const extraListingUrls = [
  "https://estatesales.org/estate-sales/il/shorewood-/60404/caits-shorewood-estate-sale-2442672",
  "https://estatesales.org/estate-sales/il/peotone-/60468/caits-peotone-estate-sale-2433738",
  "https://estatesales.org/estate-sales/il/frankfort/60423/caits-frankfort-estate-sale-2434845",
];

const columns =
  "id, slug, title, description, address_line, city, state, zip, latitude, longitude, location_precision, starts_at, ends_at, sale_schedule, categories, source_notes, source_platform, source_url, source_poster_name, raw_source_text";

function decodeHtml(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripTags(text) {
  return decodeHtml(text)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(text) {
  return stripTags(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(text) {
  const stop = new Set(["a", "an", "and", "at", "by", "for", "in", "of", "on", "sale", "the", "with"]);
  return normalizeText(text)
    .split(" ")
    .filter((token) => token.length > 2 && !stop.has(token));
}

function titleLooksSimilar(a, b) {
  const left = meaningfulTokens(a);
  const right = new Set(meaningfulTokens(b));
  if (left.length === 0 || right.size === 0) return false;
  const overlap = left.filter((token) => right.has(token)).length;
  return overlap / Math.min(left.length, right.size) >= 0.7;
}

function normalizedMatch(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  return Boolean(left && right && left === right);
}

function isHiddenAddress(address) {
  const normalized = normalizeText(address);
  return normalized.includes("hidden") || normalized.includes("available") || normalized.includes("unknown");
}

function mergeText(existing, next, label) {
  const cleanNext = String(next || "").trim();
  const cleanExisting = String(existing || "").trim();
  if (!cleanNext) return cleanExisting;
  if (!cleanExisting) return cleanNext;
  if (normalizeText(cleanExisting).includes(normalizeText(cleanNext))) return cleanExisting;
  return `${cleanExisting}\n\n${label}:\n${cleanNext}`;
}

function betterDescription(existing, next) {
  const cleanExisting = String(existing || "").trim();
  const cleanNext = String(next || "").trim();
  if (!cleanNext) return cleanExisting;
  if (!cleanExisting) return cleanNext;
  return cleanNext.length > cleanExisting.length ? cleanNext : cleanExisting;
}

function slugifyTitle(title) {
  const clean = String(title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return `${clean || "sale"}-${crypto.randomBytes(3).toString("hex")}`;
}

function fullAddress(address) {
  return `${address.address_line}, ${address.city}, ${address.state} ${address.zip}`;
}

async function geocodeAddress(address) {
  async function lookupCensus(oneLineAddress) {
    const params = new URLSearchParams({
      address: oneLineAddress,
      benchmark: "Public_AR_Current",
      format: "json",
    });

    try {
      const response = await resilientFetch(
        `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params.toString()}`,
        {
          headers: {
            "User-Agent": `SaleTrail by Localized.life (${process.env.SALETRAIL_CONTACT_EMAIL || "claims@localized.life"})`,
          },
        },
      );
      if (!response.ok) return null;
      const data = await response.json();
      const first = data?.result?.addressMatches?.[0]?.coordinates;
      const latitude = Number(first?.y);
      const longitude = Number(first?.x);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude, longitude };
    } catch {
      return null;
    }
  }

  const exactCensus = !isHiddenAddress(address.address_line) ? await lookupCensus(fullAddress(address)) : null;
  if (exactCensus) return { ...exactCensus, precision: "address" };

  async function lookup(query) {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      limit: "1",
      countrycodes: "us",
    });

    try {
      const response = await resilientFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
        headers: {
          "User-Agent": `SaleTrail by Localized.life (${process.env.SALETRAIL_CONTACT_EMAIL || "claims@localized.life"})`,
          Referer: process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life",
        },
      });
      if (!response.ok) return null;
      const results = await response.json();
      const first = results?.[0];
      const latitude = Number(first?.lat);
      const longitude = Number(first?.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
      return { latitude, longitude };
    } catch {
      return null;
    }
  }

  const exact = !isHiddenAddress(address.address_line) ? await lookup(fullAddress(address)) : null;
  if (exact) return { ...exact, precision: "address" };

  const simplifiedAddressLine = String(address.address_line || "")
    .replace(/\s+#\S+\s*$/i, "")
    .replace(/\s+\b(?:apt|unit|suite|ste)\b\.?\s+\S+\s*$/i, "")
    .trim();
  if (simplifiedAddressLine && simplifiedAddressLine !== address.address_line && !isHiddenAddress(simplifiedAddressLine)) {
    const simplifiedCensus = await lookupCensus(fullAddress({ ...address, address_line: simplifiedAddressLine }));
    if (simplifiedCensus) return { ...simplifiedCensus, precision: "address" };
    const simplified = await lookup(fullAddress({ ...address, address_line: simplifiedAddressLine }));
    if (simplified) return { ...simplified, precision: "address" };
  }

  const area = await lookup(`${address.city}, ${address.state} ${address.zip}`);
  if (area) return { ...area, precision: "area" };

  const city = await lookup(`${address.city}, ${address.state}`);
  if (city) return { ...city, precision: "area" };

  return null;
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
  }).format(new Date(`2026-01-01T${timeValue}`));
}

function inferCategories(text) {
  const normalized = normalizeText(text);
  const categories = ["Estate sale"];
  const map = [
    ["furniture", "Furniture"],
    ["tool", "Tools"],
    ["kid", "Kids"],
    ["toy", "Kids"],
    ["cloth", "Clothing"],
    ["book", "Books"],
    ["kitchen", "Home goods"],
    ["decor", "Home goods"],
    ["home", "Home goods"],
    ["electronic", "Electronics"],
    ["collectible", "Collectibles"],
    ["vintage", "Collectibles"],
    ["moving", "Moving sale"],
  ];
  for (const [needle, category] of map) {
    if (normalized.includes(needle) && !categories.includes(category)) categories.push(category);
  }
  return categories;
}

function cleanDescription(text) {
  const plain = stripTags(text).replace(/\s*\.\.\.\s*$/, "").trim();
  return plain.length > 320 ? `${plain.slice(0, 317).trimEnd()}...` : plain;
}

function rewriteDescription(title, sourceDescription) {
  const clean = cleanDescription(sourceDescription);
  if (!clean) return `${title} sourced from a public estate-sale listing.`;
  return clean
    .replace(/^calling all [^.?!]+[.?!]\s*/i, "")
    .replace(/^you never know what you'll find[^.?!]*[.?!]\s*/i, "")
    .replace(/^our\s+/i, "This ")
    .replace(/^cait's®?\s+/i, "This ")
    .trim();
}

function parseScheduleRows(html) {
  const scheduleBlockMatch = html.match(/listingDetail__dates[\s\S]*?<ul class="no-bullets mb-10">([\s\S]*?)<\/ul>/i);
  const block = scheduleBlockMatch?.[1] || "";
  const rows = [...block.matchAll(/<li[^>]*>\s*<span>([^<]+)<\/span>\s*([0-9:AMPMapm\s-]+)\s*<\/li>/g)];
  return rows.map((row) => {
    const rawDate = stripTags(row[1]).replace(/\.$/, "").trim();
    const timeRange = stripTags(row[2]).replace(/\s+/g, " ").trim();
    const [, startRaw = "", endRaw = ""] = timeRange.match(/([0-9:]+\s*[AP]M)\s*-\s*([0-9:]+\s*[AP]M)/i) || [];
    const date = new Date(`${rawDate} 12:00 PM`);
    if (Number.isNaN(date.getTime()) || !startRaw || !endRaw) return null;
    const isoDate = date.toISOString().slice(0, 10);
    return {
      date: isoDate,
      start: toTwentyFourHour(startRaw),
      end: toTwentyFourHour(endRaw),
      line: `${formatScheduleDate(isoDate)} ${startRaw.toUpperCase().replace(/\s+/g, "")}-${endRaw.toUpperCase().replace(/\s+/g, "")}`,
    };
  }).filter(Boolean);
}

function toTwentyFourHour(timeText) {
  const match = String(timeText || "").trim().match(/^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i);
  if (!match) return "09:00";
  let hour = Number(match[1]);
  const minute = match[2] || "00";
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

function scheduleFromRows(rows, startDate, endDate) {
  if (rows.length > 0) {
    const sorted = rows
      .map((row) => ({
        ...row,
        startsAt: new Date(`${row.date}T${row.start}:00`),
        endsAt: new Date(`${row.date}T${row.end}:00`),
      }))
      .sort((a, b) => a.startsAt - b.startsAt);
    return {
      starts_at: sorted[0].startsAt.toISOString(),
      ends_at: sorted[sorted.length - 1].endsAt.toISOString(),
      sale_schedule: rows.map((row) => row.line).join("\n"),
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  return {
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    sale_schedule: `${formatScheduleDate(start.toISOString().slice(0, 10))} ${formatScheduleTime(toTwentyFourHour(start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "")))}`,
  };
}

async function fetchHtml(url) {
  const response = await resilientFetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!response.ok) throw new Error(`Fetch failed ${response.status} for ${url}`);
  return response.text();
}

async function collectListingUrls() {
  const urls = new Set(extraListingUrls);
  for (const pageUrl of searchPages) {
    const html = await fetchHtml(pageUrl);
    const matches = [...html.matchAll(/href="(\/estate-sales\/il\/([^/]+)\/\d+\/[^"]+-\d+)"/g)];
    for (const match of matches) {
      const citySlug = match[2];
      if (!targetCitySlugs.has(citySlug)) continue;
      urls.add(`https://estatesales.org${match[1]}`);
    }
  }
  return [...urls];
}

function parseHiddenAddressNote(html) {
  const match = html.match(/Full address will be shown on ([^.]+)\./i);
  if (!match) return "";
  return `Exact address hidden by source until ${stripTags(match[1])}.`;
}

function parseJsonLd(html) {
  const match = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
  if (!match) return null;
  return JSON.parse(decodeHtml(match[1]));
}

function citySlugFromUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  return parts[2] || "";
}

async function fetchListing(url) {
  const html = await fetchHtml(url);
  const json = parseJsonLd(html);
  if (!json?.startDate || !json?.endDate || !json?.name) return null;

  const address = json.location?.address || {};
  const city = stripTags(address.addressLocality || "").replace(/\s+/g, " ").trim() || citySlugFromUrl(url).replace(/-/g, " ");
  const zip = stripTags(address.postalCode || "").trim();
  const state = stripTags(address.addressRegion || "IL").trim().toUpperCase();
  if (!city || !zip || state !== "IL") return null;

  const hiddenAddressNote = parseHiddenAddressNote(html);
  const exactStreet = stripTags(address.streetAddress || "").trim();
  const addressLine = exactStreet || hiddenAddressNote || `Exact address hidden - check source page for release timing.`;
  const scheduleRows = parseScheduleRows(html);
  const schedule = scheduleFromRows(scheduleRows, json.startDate, json.endDate);
  const title = stripTags(json.name).trim();
  const organizer = stripTags(json.organizer?.name || "").trim();
  const sourceDescription = stripTags(json.description || "").trim();
  const description = rewriteDescription(title, sourceDescription);
  const categories = inferCategories(`${title} ${sourceDescription}`);
  const noteParts = [
    `Imported from public EstateSales.org listing on ${new Date().toISOString().slice(0, 10)}.`,
    hiddenAddressNote,
    "Do not use source photos without permission.",
  ].filter(Boolean);

  return {
    title,
    description,
    address_line: addressLine,
    city,
    state,
    zip,
    starts_at: schedule.starts_at,
    ends_at: schedule.ends_at,
    sale_schedule: schedule.sale_schedule,
    categories,
    source_notes: noteParts.join(" "),
    source_platform: "EstateSales.org",
    source_url: url,
    source_poster_name: organizer,
    raw_source_text: sourceDescription,
  };
}

async function findExistingSale(listing) {
  const sourceUrl = String(listing.source_url || "").trim();
  if (sourceUrl) {
    const { data, error } = await supabase.from("sales").select(columns).eq("source_url", sourceUrl).limit(1);
    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  if (!isHiddenAddress(listing.address_line)) {
    const { data, error } = await supabase
      .from("sales")
      .select(columns)
      .eq("address_line", listing.address_line)
      .eq("city", listing.city)
      .eq("state", listing.state)
      .eq("zip", listing.zip)
      .limit(1);
    if (error) throw error;
    if (data?.[0]) return data[0];
  }

  const { data, error } = await supabase
    .from("sales")
    .select(columns)
    .eq("city", listing.city)
    .eq("state", listing.state)
    .eq("zip", listing.zip)
    .lte("starts_at", listing.ends_at)
    .gte("ends_at", listing.starts_at)
    .limit(12);
  if (error) throw error;

  return (
    (data || []).find((sale) => {
      if (normalizedMatch(sale.source_poster_name, listing.source_poster_name) && titleLooksSimilar(sale.title, listing.title)) return true;
      return titleLooksSimilar(sale.title, listing.title);
    }) || null
  );
}

function mergedUpdate(existing, listing, coordinates) {
  const shouldReplaceAddress =
    isHiddenAddress(existing.address_line) && listing.address_line && !isHiddenAddress(listing.address_line);
  const updatePayload = {
    description: betterDescription(existing.description, listing.description),
    starts_at: listing.starts_at < existing.starts_at ? listing.starts_at : existing.starts_at,
    ends_at: listing.ends_at > existing.ends_at ? listing.ends_at : existing.ends_at,
    sale_schedule: mergeText(existing.sale_schedule, listing.sale_schedule, "Additional schedule source"),
    categories: Array.from(new Set([...(existing.categories || []), ...(listing.categories || [])])),
    source_notes: mergeText(existing.source_notes, listing.source_notes, "Additional source note"),
    raw_source_text: mergeText(existing.raw_source_text, listing.raw_source_text, "Additional raw source text"),
    updated_at: new Date().toISOString(),
  };

  if (!existing.source_platform && listing.source_platform) updatePayload.source_platform = listing.source_platform;
  if (!existing.source_poster_name && listing.source_poster_name) updatePayload.source_poster_name = listing.source_poster_name;
  if (!existing.source_url && listing.source_url) {
    updatePayload.source_url = listing.source_url;
  } else if (existing.source_url && listing.source_url && existing.source_url !== listing.source_url) {
    updatePayload.source_notes = mergeText(String(updatePayload.source_notes || ""), listing.source_url, "Additional source URL");
  }

  const shouldUpgradePrecision =
    coordinates?.precision === "address" &&
    !isHiddenAddress(listing.address_line) &&
    existing.location_precision !== "address";

  if (shouldReplaceAddress) {
    updatePayload.address_line = listing.address_line;
    updatePayload.city = listing.city;
    updatePayload.state = listing.state;
    updatePayload.zip = listing.zip;
    updatePayload.latitude = coordinates?.latitude ?? null;
    updatePayload.longitude = coordinates?.longitude ?? null;
    updatePayload.location_precision = coordinates?.precision ?? null;
  } else if (shouldUpgradePrecision) {
    updatePayload.latitude = coordinates.latitude;
    updatePayload.longitude = coordinates.longitude;
    updatePayload.location_precision = coordinates.precision;
  } else if ((existing.latitude === null || existing.longitude === null) && coordinates) {
    updatePayload.latitude = coordinates.latitude;
    updatePayload.longitude = coordinates.longitude;
    updatePayload.location_precision = coordinates.precision;
  }

  if (listing.title && String(listing.title).length > String(existing.title).length + 12) {
    updatePayload.title = listing.title;
  }

  return updatePayload;
}

async function insertOrUpdate(listing) {
  const existing = await findExistingSale(listing);
  const coordinates = await geocodeAddress(listing);
  if (existing) {
    const updatePayload = mergedUpdate(existing, listing, coordinates);
    const { error } = await supabase.from("sales").update(updatePayload).eq("id", existing.id);
    if (error?.message?.includes("location_precision")) {
      const retryPayload = { ...updatePayload };
      delete retryPayload.location_precision;
      const retry = await supabase.from("sales").update(retryPayload).eq("id", existing.id);
      if (retry.error) throw retry.error;
    } else if (error) {
      throw error;
    }
    return { action: "updated", id: existing.id, title: existing.title };
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
    photo_urls: [],
  };

  const { error } = await supabase.from("sales").insert(insertPayload);
  if (error?.message?.includes("location_precision")) {
    const retryPayload = { ...insertPayload };
    delete retryPayload.location_precision;
    const retry = await supabase.from("sales").insert(retryPayload);
    if (retry.error) throw retry.error;
  } else if (error) {
    throw error;
  }

  return { action: "inserted", title: listing.title };
}

async function main() {
  const supabaseHostname = new URL(supabaseUrl).hostname;
  try {
    await dns.promises.lookup(supabaseHostname);
  } catch (err) {
    const code = err?.code || err?.cause?.code || "UNKNOWN";
    throw new Error(
      `Supabase hostname did not resolve (${supabaseHostname}, ${code}). Fix DNS/network and rerun this script.`,
    );
  }

  const urls = await collectListingUrls();
  const now = new Date();
  const listings = [];
  for (const url of urls) {
    const listing = await fetchListing(url);
    if (!listing) continue;
    if (new Date(listing.ends_at) < now) continue;
    listings.push(listing);
  }

  const uniqueListings = [];
  const seen = new Set();
  for (const listing of listings.sort((a, b) => a.starts_at.localeCompare(b.starts_at))) {
    const key = `${listing.source_url}|${listing.title}|${listing.city}|${listing.starts_at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueListings.push(listing);
  }

  const results = [];
  for (const listing of uniqueListings) {
    results.push(await insertOrUpdate(listing));
  }

  console.log(JSON.stringify({ scanned: uniqueListings.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
