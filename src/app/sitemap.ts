import type { MetadataRoute } from "next";
import { eventPath } from "@/lib/events";
import { salePath } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { LocalEvent, Sale } from "@/lib/types";

const sitemapSaleColumns = "slug, city, state, updated_at";
const sitemapEventColumns = "slug, city, state, updated_at";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/saletrail"),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl("/local-market"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/local-events"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/harvest"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/local-services"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: absoluteUrl("/saletrail/map"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/saletrail/events"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: absoluteUrl("/saletrail/new"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  if (!isSupabaseConfigured) return staticPages;

  const supabase = getSupabaseAdmin();
  const [{ data, error }, eventsResult] = await Promise.all([
    supabase
    .from("sales")
    .select(sitemapSaleColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
      .limit(500),
    supabase
      .from("local_events")
      .select(sitemapEventColumns)
      .eq("visibility_status", "public")
      .eq("status", "active")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(200),
  ]);

  if (error || !data) return staticPages;

  const salePages = (data as Pick<Sale, "slug" | "city" | "state" | "updated_at">[]).map((sale) => ({
    url: absoluteUrl(salePath(sale)),
    lastModified: sale.updated_at,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  const eventPages = eventsResult.error
    ? []
    : ((eventsResult.data || []) as Pick<LocalEvent, "slug" | "city" | "state" | "updated_at">[]).map((event) => ({
        url: absoluteUrl(eventPath(event)),
        lastModified: event.updated_at,
        changeFrequency: "daily" as const,
        priority: 0.85,
      }));

  return [...staticPages, ...salePages, ...eventPages];
}
