import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.FRONTEND_URL || "https://swifthub-storefront.vercel.app";
  const locales = ["en", "vi"];

  // Static Paths
  const staticPaths = ["", "/pages/about-us", "/collections/new", "/collections/all"];
  const staticEntries = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: path === "" ? 1.0 : 0.8,
    }))
  );

  // Dynamic Product Paths
  const products = await prisma.product.findMany({
    select: { slug: true, updatedAt: true },
  });

  const productEntries = locales.flatMap((locale) =>
    products.map((p) => ({
      url: `${baseUrl}/${locale}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }))
  );

  return [...staticEntries, ...productEntries];
}
