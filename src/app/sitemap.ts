import { prisma } from "@/lib/prisma";
import { homepageHeroImage } from "@/lib/homepage-hero-image";
import { explorerCollections } from "@/lib/collection-explorer";
import { auriaEditVideoDirectory } from "@/lib/auria-edit-videos";
import { getHomepageVideoContent } from "@/lib/homepage-video-feed";
import { storefrontCollectionSlugs } from "@/lib/storefront-collections";
import { storefrontAlternates, storefrontLocales, storefrontSiteUrl } from "@/lib/storefront-seo";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [videoContent, products, categories, pages] = await Promise.all([
    getHomepageVideoContent("vi"),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
    prisma.page.findMany({
      where: { isActive: true },
      select: { slug: true },
    }),
  ]);
  const videoPosters = videoContent?.items
    .map(({ posterUrl }) => posterUrl)
    .filter((posterUrl) => posterUrl.startsWith(auriaEditVideoDirectory + "/")) ?? [];
  const homeImagePaths = new Set([
    homepageHeroImage.src,
    homepageHeroImage.tabletSrc,
    homepageHeroImage.mobileSrc,
    ...explorerCollections.flatMap(({ campaign, detail }) => [campaign.src, detail.src]),
    ...videoPosters,
  ]);
  const homeImages = Array.from(homeImagePaths, (path) => new URL(path, storefrontSiteUrl).href);

  // Static Paths
  const staticPaths = ["", ...storefrontCollectionSlugs.map((slug) => `/collections/${slug}`)];
  const staticEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    staticPaths.map((path) => {
      const { canonical, languages } = storefrontAlternates(locale, path);
      return {
        url: canonical,
        alternates: { languages },
        images: path === "" ? homeImages : undefined,
      };
    }),
  );

  const productEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    products.map((p) => {
      const { canonical, languages } = storefrontAlternates(locale, `/products/${p.slug}`);
      return {
        url: canonical,
        alternates: { languages },
      };
    }),
  );

  const categoryEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    categories.map((c) => {
      const { canonical, languages } = storefrontAlternates(locale, `/categories/${c.slug}`);
      return {
        url: canonical,
        alternates: { languages },
      };
    }),
  );

  const pageEntries: MetadataRoute.Sitemap = storefrontLocales.flatMap((locale) =>
    pages.map((page) => {
      const { canonical, languages } = storefrontAlternates(locale, `/pages/${page.slug}`);
      return {
        url: canonical,
        alternates: { languages },
      };
    }),
  );

  return [...staticEntries, ...categoryEntries, ...productEntries, ...pageEntries];
}
