import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { ProductClient } from "./product-client";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";
import { marked } from "marked";

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
    <div className="container mx-auto px-0 md:px-4 pt-0 md:pt-12 pb-40 max-w-7xl">
      {/* Schema.org / JSON-LD for Search Engines & AI Bots */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
        {/* Left Column: Image Gallery + Product Details */}
        <div className="lg:col-span-7 flex flex-col space-y-8">
          {/* Images (Edge-to-Edge on Mobile) */}
          <div className="flex flex-col space-y-4">
            {product.images.map((img, idx) => (
              <div key={img.id} className="relative aspect-[3/4] w-full bg-secondary overflow-hidden">
                <Image
                  src={img.url}
                  alt={img.alt || `${product.name} - Image ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  priority={idx === 0}
                />
                {idx === 0 && (
                  <div className="absolute bottom-4 left-4 bg-black/75 text-white text-[10px] tracking-wider px-3 py-1.5 font-light">
                    Model is 170 cm / Wearing size: M
                  </div>
                )}
              </div>
            ))}
            {product.images.length === 0 && (
              <div className="relative aspect-[3/4] w-full bg-secondary overflow-hidden flex items-center justify-center">
                <span className="text-muted-foreground font-heading uppercase tracking-widest text-xs">No Image Available</span>
              </div>
            )}
          </div>

          {/* Mobile-Only Title & Price Header (With Padding) */}
          <div className="lg:hidden px-4 border-b border-border pb-6">
            <div className="flex items-center gap-1 mb-2">
              <div className="flex text-amber-500">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i} className="text-sm">★</span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-light hover:underline cursor-pointer">(3 reviews)</span>
            </div>
            <h1 className="text-2xl font-heading uppercase tracking-widest mb-2">
              {product.name}
            </h1>
            <div className="text-2xl font-bold tracking-wide text-primary">
              ${product.variants[0]?.price.toString() || "0.00"}
            </div>
          </div>

          {/* Product Details: Stacked below images inside left column (With Padding) */}
          <div className="border-t lg:border-t-0 border-border pt-12 lg:pt-0 px-4 lg:px-0">
            <h2 className="text-lg uppercase tracking-widest font-heading mb-8 pb-2 border-b border-border w-fit">
              Product Details
            </h2>
            
            <div className="flex flex-col space-y-10 font-light text-sm text-foreground/90">
              {/* Overview */}
              {compiledOverview && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-semibold mb-3 text-foreground">Overview</h3>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground font-light leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: compiledOverview }} 
                  />
                </div>
              )}

              {/* Description */}
              {compiledDescription && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-semibold mb-3 text-foreground">Description</h3>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground font-light leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: compiledDescription }} 
                  />
                </div>
              )}

              {/* Materials */}
              {compiledMaterials && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-semibold mb-3 text-foreground">Materials</h3>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground font-light leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: compiledMaterials }} 
                  />
                </div>
              )}

              {/* Care Instructions */}
              {compiledCare && (
                <div>
                  <h3 className="text-xs uppercase tracking-widest font-semibold mb-3 text-foreground">Care Instructions</h3>
                  <div 
                    className="prose prose-sm max-w-none text-muted-foreground font-light leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: compiledCare }} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sticky Side Panel (With Padding on Mobile) */}
        <div className="lg:col-span-5 lg:sticky lg:top-28 h-fit flex flex-col space-y-6 px-4 lg:px-0">
          {/* Desktop-Only Title & Price Header */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-1 mb-2">
              <div className="flex text-amber-500">
                {"★★★★★".split("").map((star, i) => (
                  <span key={i} className="text-sm">★</span>
                ))}
              </div>
              <span className="text-xs text-muted-foreground font-light hover:underline cursor-pointer">(3 reviews)</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-heading uppercase tracking-widest mb-3">
              {product.name}
            </h1>
            <div className="text-2xl font-bold tracking-wide text-primary">
              ${product.variants[0]?.price.toString() || "0.00"}
            </div>
          </div>

          {/* Client component for interactive variant selection and add to cart */}
          <ProductClient
            product={{
              id: product.id,
              name: product.name,
              images: product.images,
              variants: product.variants.map((v) => ({
                id: v.id,
                sku: v.sku,
                name: v.name,
                stock: v.stock,
                isActive: v.isActive,
                price: Number(v.price),
                comparePrice: v.comparePrice ? Number(v.comparePrice) : null,
              })),
            }}
          />

          <div className="border-t border-border pt-8 space-y-4 font-light text-sm">
            <div className="flex justify-between">
              <span className="uppercase tracking-widest font-heading text-xs">Shipping</span>
              <span>Free standard shipping on orders over $100</span>
            </div>
            <div className="flex justify-between">
              <span className="uppercase tracking-widest font-heading text-xs">Returns</span>
              <span>30-day return policy</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
