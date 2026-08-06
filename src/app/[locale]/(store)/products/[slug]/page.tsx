import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { ProductClient } from "./product-client";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { marked } from "marked";
import { formatPrice } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

// Use unstable_cache to persistently cache the product details across requests!
const getProduct = unstable_cache(
  async (slug: string) => {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        images: {
          orderBy: { position: "asc" },
        },
        variants: {
          where: { isActive: true },
        },
      },
    });
  },
  ['product-details-cache'], // cache key
  { revalidate: 3600, tags: ['products'] } // cache for 1 hour
);

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

  return (
    <div className="min-h-screen selection:bg-primary/20 bg-[#faf9f7] dark:bg-neutral-950">
      <div className="container mx-auto px-4 sm:px-6 lg:px-10 pt-8 lg:pt-16 max-w-7xl">
      {/* Schema.org / JSON-LD for Search Engines & AI Bots */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <ProductClient
        product={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          images: product.images,
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
