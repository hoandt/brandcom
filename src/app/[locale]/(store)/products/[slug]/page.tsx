import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { ProductClient } from "./product-client";
import { createReviewPreview } from "./review-preview.server";
import type { Metadata } from "next";
import { brandConfig } from "@/lib/brand-config";
import { marked } from "marked";
import { getCategoryPath } from "@/lib/categories";
import { getTranslations } from "next-intl/server";
import { getStoreSettings } from "@/lib/store-settings";
import { storefrontCache } from "@/lib/storefront-cache";
import { getProductPromotion } from "@/lib/product-promotion.server";
import { hasLiveBundlePrices } from "@/lib/auria-product-offers";
import palette from "@/components/storefront/product-palette.module.css";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string | string[] }>;
};

async function markdownToPlainText(input?: string | null): Promise<string> {
  if (!input) return "";
  const html = await marked.parse(input);
  return html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateMetaDescription(text: string, maxLength = 160): string {
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

const getProduct = cache(async (slug: string) => {
  const settings = await getStoreSettings();
  // Render the current repriced bundle prices in the initial HTML and product metadata.
  const cacheSeconds = hasLiveBundlePrices(slug) ? 0 : settings.productCacheSeconds;
  return storefrontCache(`product:${slug}`, cacheSeconds, () =>
    prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        variants: {
          where: { isActive: true },
        },
        categories: { select: { id: true } },
        reviews: {
          where: { status: "APPROVED" },
          select: { rating: true },
        },
      },
    })
  );
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const product = await getProduct(slug);

  if (!product || product.status !== "ACTIVE") {
    return {
      title: "Product Not Found",
      robots: { index: false, follow: false },
    };
  }

  const siteUrl = brandConfig.siteUrl.replace(/\/$/, "");
  const canonicalUrl = `${siteUrl}/${locale}/products/${slug}`;
  const rawDescription =
    (await markdownToPlainText(product.overview)) ||
    (await markdownToPlainText(product.description));
  const metaDescription = truncateMetaDescription(rawDescription || product.name);
  const ogImages = product.images
    .filter((img) => Boolean(img.url))
    .map((img) => ({
      url: img.url,
      alt: img.alt || product.name,
    }));

  return {
    title: product.name,
    description: metaDescription,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        vi: `${siteUrl}/vi/products/${slug}`,
        en: `${siteUrl}/en/products/${slug}`,
        th: `${siteUrl}/th/products/${slug}`,
        "x-default": `${siteUrl}/vi/products/${slug}`,
      },
    },
    openGraph: {
      title: product.name,
      description: metaDescription,
      url: canonicalUrl,
      type: "website",
      locale: locale === "vi" ? "vi_VN" : locale === "th" ? "th_TH" : "en_US",
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: product.name,
      description: metaDescription,
      images: ogImages.map((img) => img.url),
    },
  };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const reviewPreview = process.env.NODE_ENV === "development" && (await searchParams).preview !== "off"
    ? createReviewPreview() : undefined;

  const product = await getProduct(slug);

  if (!product || product.status !== "ACTIVE") {
    notFound();
  }

  const [settings, allCategories, tProduct, tNavbar, promotion] = await Promise.all([
    getStoreSettings(),
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    getTranslations("Product"),
    getTranslations("Navbar"),
    getProductPromotion(slug),
  ]);
  const categoryPath = product.categories
    .map((category) => getCategoryPath(allCategories, category.id))
    .sort((a, b) => b.length - a.length)[0] ?? [];
  const breadcrumbs = [
    { label: tProduct("home"), href: `/${locale}` },
    { label: tNavbar("allProducts"), href: `/${locale}/collections/all` },
    ...categoryPath.map((category) => ({ label: category.name, href: `/${locale}/categories/${category.slug}` })),
    { label: product.name },
  ];

  // Compile markdown fields on the server
  const [compiledDescription, compiledOverview, compiledMaterials, compiledCare, plainOverview, plainDescription] =
    await Promise.all([
      product.description ? marked.parse(product.description) : Promise.resolve(""),
      product.overview ? marked.parse(product.overview) : Promise.resolve(""),
      product.materials ? marked.parse(product.materials) : Promise.resolve(""),
      product.care ? marked.parse(product.care) : Promise.resolve(""),
      markdownToPlainText(product.overview),
      markdownToPlainText(product.description),
    ]);

  const siteUrl = brandConfig.siteUrl.replace(/\/$/, "");
  const productUrl = `${siteUrl}/${locale}/products/${slug}`;
  const currency = settings.currency || "VND";
  const formatSchemaPrice = (value: number) =>
    currency === "VND" ? Math.round(value).toString() : value.toFixed(2);

  const variantPrices = product.variants.map((v) => Number(v.price)).filter((n) => Number.isFinite(n));
  const lowPrice = variantPrices.length > 0 ? Math.min(...variantPrices) : 0;
  const highPrice = variantPrices.length > 0 ? Math.max(...variantPrices) : 0;

  const reviewCount = product.reviews?.length ?? 0;
  const averageRating =
    reviewCount > 0
      ? Number(
          (
            product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
          ).toFixed(1)
        )
      : null;

  // Construct JSON-LD Structured Data for SEO and AI Bot Crawlers
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    url: productUrl,
    name: product.name,
    image: product.images.map((img) => img.url),
    description: plainOverview || plainDescription || product.name,
    sku: product.variants[0]?.sku || product.id,
    brand: {
      "@type": "Brand",
      name: settings.storeName || brandConfig.name,
    },
    ...(product.materials ? { material: await markdownToPlainText(product.materials) } : {}),
    ...(averageRating && reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: averageRating,
            reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(product.variants.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            url: productUrl,
            priceCurrency: currency,
            lowPrice: formatSchemaPrice(lowPrice),
            highPrice: formatSchemaPrice(highPrice),
            offerCount: product.variants.length.toString(),
            offers: product.variants.map((v) => ({
              "@type": "Offer",
              name: v.name,
              sku: v.sku,
              price: formatSchemaPrice(Number(v.price)),
              priceCurrency: currency,
              availability:
                v.stock > 0
                  ? "https://schema.org/InStock"
                  : "https://schema.org/OutOfStock",
              url: productUrl,
              itemCondition: "https://schema.org/NewCondition",
            })),
          },
        }
      : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `${siteUrl}${item.href}` : productUrl,
    })),
  };
  return (
    <div className={`${palette.theme} ${palette.quiet} min-h-screen bg-background selection:bg-border`}>
      <div className={`${palette.productContainer} pt-3 lg:pt-7`}>
        {/* Schema.org / JSON-LD for Search Engines & AI Bots */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbJsonLd]) }}
        />

        <ProductClient
          key={product.id}
          promotion={promotion}
          reviewPreview={reviewPreview}
          currency={currency}
          ratingSummary={{ total: reviewCount, average: averageRating ?? 0 }}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            images: product.images,
            cardHoverImageUrl: product.cardHoverImageUrl,
            variants: product.variants.map((v) => ({
              id: v.id,
              sku: v.sku,
              name: v.name,
              stock: v.stock,
              price: Number(v.price),
              comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
              imageUrl: v.imageUrl,
            })),
          }}
          details={{
            description: compiledDescription,
            overview: compiledOverview,
            materials: compiledMaterials,
            care: compiledCare,
          }}
        />
      </div>
    </div>
  );
}
