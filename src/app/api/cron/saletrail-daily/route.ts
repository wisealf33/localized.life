import { runSaleTrailDailyCollector } from "@/lib/saletrailDailyCollector";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!expectedSecret || authorization !== `Bearer ${expectedSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const result = await runSaleTrailDailyCollector({ supabase });

  return Response.json({
    ok: true,
    ranAt: new Date().toISOString(),
    ...result,
  });
}

