import { prisma } from "@/lib/prisma";
import { brandConfig } from "@/lib/brand-config";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = brandConfig.siteUrl.replace(/\/$/, "");
  const locales = ["vi", "en", "th"] as const;

  const buildAlternates = (pathSuffix: string) => ({
    languages: {
      vi: `${baseUrl}/vi${pathSuffix}`,
      en: `${baseUrl}/en${pathSuffix}`,
      th: `${baseUrl}/th${pathSuffix}`,
      "x-default": `${baseUrl}/vi${pathSuffix}`,
    },
  });

  // Static Paths
  const staticPaths = ["", "/collections/new", "/collections/all"];
  const staticEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    staticPaths.map((path) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: path === "" ? 1.0 : 0.8,
      alternates: buildAlternates(path),
    }))
  );

  // Dynamic Active Product Paths
  const [products, categories, pages] = await Promise.all([
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { isActive: true },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const productEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    products.map((p) => ({
      url: `${baseUrl}/${locale}/products/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: buildAlternates(`/products/${p.slug}`),
    }))
  );

  const categoryEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    categories.map((c) => ({
      url: `${baseUrl}/${locale}/categories/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.85,
      alternates: buildAlternates(`/categories/${c.slug}`),
    }))
  );

  const pageEntries: MetadataRoute.Sitemap = locales.flatMap((locale) =>
    pages.map((page) => ({
      url: `${baseUrl}/${locale}/pages/${page.slug}`,
      lastModified: page.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: buildAlternates(`/pages/${page.slug}`),
    }))
  );

  return [...staticEntries, ...categoryEntries, ...productEntries, ...pageEntries];
}
