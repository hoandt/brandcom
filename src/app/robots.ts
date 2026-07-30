import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.FRONTEND_URL || "https://swifthub-storefront.vercel.app";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/admin/", "/checkout/", "/account/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
