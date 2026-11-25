import type { Prisma } from "@/generated/prisma/client";
import { explorerCollections } from "@/lib/collection-explorer";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";
import { storefrontCache } from "@/lib/storefront-cache";

export const storefrontCollectionSlugs = ["new", "breathable", ...explorerCollections.map(({ slug }) => slug)];

export async function getCollectionProducts(slug: string) {
  const selection = explorerCollections.find((collection) => collection.slug === slug)?.products;
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

  if (selection) {
    where.categories = { some: { slug: selection.categorySlug, isActive: true } };
    if (selection.slugs) where.slug = { in: selection.slugs };
  }

  if (slug === "breathable") {
    where.OR = [
      { name: { contains: "breathable", mode: "insensitive" } },
      { description: { contains: "breathable", mode: "insensitive" } },
      { name: { contains: "thông hơi", mode: "insensitive" } },
      { name: { contains: "thoáng khí", mode: "insensitive" } },
    ];
  }

  const { currency, collectionCacheSeconds } = await getStoreSettings();
  const cacheKey = slug === "breathable" ? "collection:breathable:v2" : `collection:${slug}`;
  const products = await storefrontCache(cacheKey, collectionCacheSeconds, () =>
    prisma.product.findMany({
      where,
      include: {
        variants: { where: { isActive: true }, orderBy: { price: "asc" } },
        images: { orderBy: { position: "asc" }, take: 2 },
        categories: { where: { isActive: true }, orderBy: [{ position: "asc" }, { name: "asc" }], take: 1 },
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
      },
      orderBy: { createdAt: "desc" },
      ...(slug === "new" ? { take: 24 } : {}),
    }),
  );

  return { products, currency, cacheSeconds: collectionCacheSeconds };
}
