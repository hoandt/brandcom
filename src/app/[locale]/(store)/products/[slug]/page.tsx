import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductClient } from "./product-client";
import type { Metadata } from "next";
import { brandConfig } from "@/lib/brand-config";
import { marked } from "marked";
import { getCategoryPath } from "@/lib/categories";
import { getTranslations } from "next-intl/server";
import { getStoreSettings } from "@/lib/store-settings";
import { storefrontCache } from "@/lib/storefront-cache";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

async function getProduct(slug: string) {
  const settings = await getStoreSettings();
  return storefrontCache(`product:${slug}`, settings.productCacheSeconds, () =>
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
      },
    })
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    return { title: "Product Not Found" };
  }

  // Strip HTML tags for meta description if it contains any
  const strippedDescription = product.description?.replace(/<[^>]*>?/gm, '') || "";

  return {
    title: product.name,
    description: product.overview || strippedDescription,
    openGraph: {
      images: product.images[0]?.url ? [product.images[0].url] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, slug } = await params;

  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const [allCategories, tProduct, tNavbar] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, parentId: true },
    }),
    getTranslations("Product"),
    getTranslations("Navbar"),
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
  const compiledDescription = product.description ? await marked.parse(product.description) : "";
  const compiledOverview = product.overview ? await marked.parse(product.overview) : "";
  const compiledMaterials = product.materials ? await marked.parse(product.materials) : "";
  const compiledCare = product.care ? await marked.parse(product.care) : "";

  // Strip HTML for plain text schema description
  const strippedDescription = product.description?.replace(/<[^>]*>?/gm, '') || "";

  // Construct JSON-LD Structured Data for SEO and AI Bot Crawlers
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images.map((img) => img.url),
    "description": product.overview || strippedDescription,
    "sku": product.variants[0]?.sku || product.id,
    "material": product.materials || undefined,
    "offers": {
      "@type": "AggregateOffer",
      "priceCurrency": "USD",
      "lowPrice": Math.min(...product.variants.map((v) => Number(v.price))).toFixed(2),
      "highPrice": Math.max(...product.variants.map((v) => Number(v.price))).toFixed(2),
      "offerCount": product.variants.length.toString(),
      "offers": product.variants.map((v) => ({
        "@type": "Offer",
        "name": v.name,
        "sku": v.sku,
        "price": Number(v.price).toFixed(2),
        "priceCurrency": "USD",
        "availability": v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "url": `${process.env.FRONTEND_URL || "https://swifthub-storefront.vercel.app"}/${locale}/products/${slug}`,
        "itemCondition": "https://schema.org/NewCondition"
      }))
    }
  };
  const siteUrl = brandConfig.siteUrl.replace(/\/$/, "");
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `${siteUrl}${item.href}` : `${siteUrl}/${locale}/products/${slug}`,
    })),
  };

  return (
    <div className="min-h-screen bg-background selection:bg-primary/20">
      <div className="w-full lg:container lg:mx-auto lg:max-w-[1440px] lg:px-8 lg:pt-6">
      {/* Schema.org / JSON-LD for Search Engines & AI Bots */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([jsonLd, breadcrumbJsonLd]) }}
      />

      <ProductClient
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
            isActive: v.isActive,
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
