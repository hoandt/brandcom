import type { Metadata, ResolvingMetadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { CollectionCategoryNavigation } from "@/components/storefront/category-navigation";
import { explorerCollections } from "@/lib/collection-explorer";
import { homepageHeroImage } from "@/lib/homepage-hero-image";
import { storefrontCollectionSlugs } from "@/lib/storefront-collections";
import { storefrontAlternates, storefrontSiteUrl } from "@/lib/storefront-seo";
import { CollectionProducts, CollectionProductsSkeleton } from "./collection-products";

type Props = { params: Promise<{ slug: string; locale: string }> };

const collectionCopy: Record<string, readonly [string, string]> = {
  all: ["allProducts", "allCollectionDescription"],
  new: ["newArrivals", "newCollectionDescription"],
  breathable: ["breathableCollection", "breathableCollectionDescription"],
  "adhesive-bras": ["adhesiveBrasCollection", "adhesiveBrasCollectionDescription"],
  "bra-inserts": ["braInsertsCollection", "braInsertsCollectionDescription"],
  "nipple-covers": ["nippleCoversCollection", "nippleCoversCollectionDescription"],
};

async function getCollectionDetails(slug: string, locale: string) {
  if (!storefrontCollectionSlugs.includes(slug)) {
    notFound();
  }

  const t = await getTranslations({ locale, namespace: "Navbar" });
  const entry = explorerCollections.find((collection) => collection.slug === slug);
  const copy = collectionCopy[slug];
  const title = copy ? t(copy[0]) : entry?.label ?? "";
  const description = copy ? t(copy[1]) : title;
  const image = entry?.campaign.src ?? (slug === "breathable" ? "/banners/auria-nipple-cover.jpg" : homepageHeroImage.src);

  return { title, description, image };
}

export async function generateMetadata({ params }: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug, locale } = await params;
  const [{ title, description, image }, { openGraph }] = await Promise.all([
    getCollectionDetails(slug, locale),
    parent,
  ]);
  const alternates = storefrontAlternates(locale, `/collections/${slug}`);
  const images = [{ url: new URL(image, storefrontSiteUrl).href, alt: title }];
  const pageTitle = openGraph?.siteName ? `${title} | ${openGraph.siteName}` : title;

  return {
    title: { absolute: pageTitle },
    description,
    alternates,
    openGraph: { ...openGraph, title: pageTitle, description, url: alternates.canonical, images },
    twitter: { card: "summary_large_image", title: pageTitle, description, images },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug, locale } = await params;
  const { title, description } = await getCollectionDetails(slug, locale);

  return (
    <div className="storefront-container min-h-[60vh] py-12">
      {/* Collection Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading tracking-tight capitalize">
          {title}.
        </h1>
        {description && (
          <p className="text-muted-foreground font-light text-sm md:text-base max-w-md">
            {description}
          </p>
        )}
      </div>

      <CollectionCategoryNavigation />

      <Suspense fallback={<CollectionProductsSkeleton />}>
        <CollectionProducts slug={slug} locale={locale} />
      </Suspense>
    </div>
  );
}
