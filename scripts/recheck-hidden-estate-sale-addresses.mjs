import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
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

function isHiddenAddress(addressLine) {
  const normalized = String(addressLine || "").toLowerCase();
  return normalized.includes("hidden") || normalized.includes("available") || normalized.includes("unknown");
}

async function geocode(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "1",
    countrycodes: "us",
  });

  const response = await resilientFetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
    headers: {
      "User-Agent": `SaleTrail by Localized.life (${process.env.SALETRAIL_CONTACT_EMAIL || "claims@localized.life"})`,
      Referer: process.env.NEXT_PUBLIC_SITE_URL || "https://www.localized.life",
    },
  });

  if (!response.ok) return null;
  const data = await response.json();
  const first = data?.[0];
  const latitude = Number(first?.lat);
  const longitude = Number(first?.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
}

function extractAddressFromHtml(html) {
  // Prefer structured data. EstateSales.org exposes full addresses here once public.
  const street = html.match(/streetAddress"\s*:\s*"([^"]+)"/i)?.[1];
  const structuredCity = html.match(/addressLocality"\s*:\s*"([^"]+)"/i)?.[1];
  const region = html.match(/addressRegion"\s*:\s*"([^"]+)"/i)?.[1];
  const postal = html.match(/postalCode"\s*:\s*"([^"]+)"/i)?.[1];
  if (street && structuredCity && region && postal) {
    const state = region === "Illinois" ? "IL" : region;
    if (/^il$/i.test(state) || /^illinois$/i.test(state)) {
      return {
        addressLine: street.replace(/\s+/g, " ").trim(),
        city: structuredCity.replace(/\s+/g, " ").trim(),
        state: "IL",
        zip: String(postal).slice(0, 5),
      };
    }
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Try common "street, City, ST ZIP" pattern.
  const pattern =
    /\b(\d{1,6}\s+[A-Za-z0-9][A-Za-z0-9 .,'#-]{2,80}?)\s*,?\s+([A-Za-z .'-]{2,40}?)\s*,\s*(IL|Illinois)\s+(\d{5})(?:-\d{4})?\b/;
  const match = text.match(pattern);
  if (!match) return null;

  const addressLine = match[1].replace(/\s+/g, " ").trim();
  const city = match[2].replace(/\s+/g, " ").trim();
  const state = match[3] === "Illinois" ? "IL" : match[3];
  const zip = match[4];

   // Guardrail: avoid false positives like times (e.g. "00 AM CDT") or incomplete street lines.
  const hasStreetSuffix =
    /\b(st|street|ave|avenue|blvd|boulevard|dr|drive|rd|road|ln|lane|ct|court|cir|circle|pkwy|parkway|way|pl|place|ter|terrace|trl|trail|run)\b/i.test(
      addressLine,
    );
  const badCityTokens = /\b(am|pm|cst|cdt|est|edt|mst|mdt|pst|pdt)\b/i.test(city);
  if (!hasStreetSuffix || badCityTokens) return null;

  return { addressLine, city, state, zip };
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

const knownHiddenTitles = [
  "Noteworthy Naperville Estate Sale",
  "Beautiful Bolingbrook Estate Sale",
  "Tools/Tractors/ATVs/Boats Estate Sale in Zion",
  "A1 Chicago Heights Packed House Estate Sale",
  "CAIT'S Frankfort Estate Sale",
];

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

  const { data: candidates, error } = await supabase
    .from("sales")
    .select("id, slug, title, address_line, city, state, zip, latitude, longitude, location_precision, source_url, source_platform, source_notes, starts_at, ends_at")
    .or(
      [
        "address_line.ilike.%hidden%",
        "address_line.ilike.%available%",
        "address_line.ilike.%unknown%",
        ...knownHiddenTitles.map((t) => `title.eq.${t.replaceAll(",", "")}`),
      ].join(","),
    )
    .eq("visibility_status", "public")
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error) throw error;

  const hidden = (candidates || []).filter((sale) => isHiddenAddress(sale.address_line));
  console.log(`Found ${hidden.length} public sales with hidden addresses.`);

  const updates = [];
  const stillHidden = [];

  for (const sale of hidden) {
    const sourceUrl = String(sale.source_url || "").trim();
    if (!sourceUrl) {
      stillHidden.push({ id: sale.id, title: sale.title, reason: "missing source_url" });
      continue;
    }

    let html;
    try {
      html = await fetchHtml(sourceUrl);
    } catch (err) {
      stillHidden.push({ id: sale.id, title: sale.title, reason: `fetch failed: ${err.message}` });
      continue;
    }

    const extracted = extractAddressFromHtml(html);
    if (!extracted) {
      stillHidden.push({ id: sale.id, title: sale.title, reason: "no exact address found on source page" });
      continue;
    }

    const geo = await geocode(`${extracted.addressLine}, ${extracted.city}, ${extracted.state} ${extracted.zip}`);
    const next = {
      address_line: extracted.addressLine,
      city: extracted.city || sale.city,
      state: extracted.state || sale.state,
      zip: extracted.zip || sale.zip,
      latitude: geo?.latitude ?? sale.latitude ?? null,
      longitude: geo?.longitude ?? sale.longitude ?? null,
      location_precision: "address",
      source_notes: [sale.source_notes, `Address confirmed from source page on ${new Date().toISOString().slice(0, 10)}.`]
        .filter(Boolean)
        .join("\n"),
    };

    const { error: updateError } = await supabase.from("sales").update(next).eq("id", sale.id);
    if (updateError) {
      stillHidden.push({ id: sale.id, title: sale.title, reason: `supabase update failed: ${updateError.message}` });
      continue;
    }

    updates.push({ id: sale.id, title: sale.title, source_url: sourceUrl, address_line: next.address_line });
  }

  console.log("\nUpdated (address revealed):");
  for (const u of updates) console.log(`- ${u.title}: ${u.address_line}`);

  console.log("\nStill hidden / skipped:");
  for (const s of stillHidden) console.log(`- ${s.title}: ${s.reason}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
