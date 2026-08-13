import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/harvest", "/saletrail", "/saletrail/map", "/saletrail/new"],
        disallow: ["/saletrail/admin", "/saletrail/manage", "/saletrail/claim", "/manage", "/connector"],
      },
    ],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
