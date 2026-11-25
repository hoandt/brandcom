import { prisma } from "@/lib/prisma";
import { homepageHeroImage } from "@/lib/homepage-hero-image";
import { explorerCollections } from "@/lib/collection-explorer";
import { storefrontCollectionSlugs } from "@/lib/storefront-collections";
import { storefrontAlternates, storefrontLocales, storefrontSiteUrl } from "@/lib/storefront-seo";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const homeImagePaths = new Set([
    homepageHeroImage.src,
    homepageHeroImage.tabletSrc,
    homepageHeroImage.mobileSrc,
    ...explorerCollections.flatMap(({ campaign, detail }) => [campaign.src, detail.src]),
  ]);
  const homeImages = Array.from(homeImagePaths, (path) => new URL(path, storefrontSiteUrl).href);

  // Static Paths
  const staticPaths = ["", ...storefrontCollectionSlugs.map((slug) => `/collections/${slug}`)];
  const staticEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    staticPaths.map((path) => {
      const { canonical, languages } = storefrontAlternates(locale, path);
      return {
        url: canonical,
        changeFrequency: "daily" as const,
        priority: path === "" ? 1.0 : 0.8,
        alternates: { languages },
        images: path === "" ? homeImages : undefined,
      };
    }),
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

  const productEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    products.map((p) => {
      const { canonical, languages } = storefrontAlternates(locale, `/products/${p.slug}`);
      return {
        url: canonical,
        lastModified: p.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.9,
        alternates: { languages },
      };
    }),
  );

  const categoryEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    categories.map((c) => {
      const { canonical, languages } = storefrontAlternates(locale, `/categories/${c.slug}`);
      return {
        url: canonical,
        lastModified: c.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.85,
        alternates: { languages },
      };
    }),
  );

  const pageEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    pages.map((page) => {
      const { canonical, languages } = storefrontAlternates(locale, `/pages/${page.slug}`);
      return {
        url: canonical,
        lastModified: page.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages },
      };
    }),
  );

  return [...staticEntries, ...categoryEntries, ...productEntries, ...pageEntries];
}
