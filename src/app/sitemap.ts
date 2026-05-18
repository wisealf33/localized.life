import type { MetadataRoute } from "next";
import { salePath } from "@/lib/format";
import { absoluteUrl } from "@/lib/seo";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase";
import type { Sale } from "@/lib/types";

const sitemapSaleColumns = "slug, city, state, updated_at";

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
      url: absoluteUrl("/saletrail/map"),
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

  const { data, error } = await getSupabaseAdmin()
    .from("sales")
    .select(sitemapSaleColumns)
    .eq("visibility_status", "public")
    .eq("status", "active")
    .gte("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(500);

  if (error || !data) return staticPages;

  const salePages = (data as Pick<Sale, "slug" | "city" | "state" | "updated_at">[]).map((sale) => ({
    url: absoluteUrl(salePath(sale)),
    lastModified: sale.updated_at,
    changeFrequency: "daily" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...salePages];
}
