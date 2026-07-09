import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { runSaleTrailDailyCollector } from "../src/lib/saletrailDailyCollector.js";

function loadDotEnvLocal() {
  const explicitEnvPath = process.env.SALETRAIL_ENV_FILE;
  const envPath = path.resolve(process.cwd(), explicitEnvPath || ".env.local");
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const result = await runSaleTrailDailyCollector({ supabase, dryRun });
console.log(JSON.stringify({ dryRun, ...result }, null, 2));
