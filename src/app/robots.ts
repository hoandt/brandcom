import type { MetadataRoute } from "next";
import { brandConfig } from "@/lib/brand-config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = brandConfig.siteUrl.replace(/\/$/, "");
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/checkout/",
        "/account/",
        "/cart/",
        "/*/admin/",
        "/*/checkout/",
        "/*/account/",
        "/*/cart/",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
