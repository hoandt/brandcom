import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import { ProductClient } from "./product-client";
import { unstable_cache } from "next/cache";
import type { Metadata } from "next";

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
    description: strippedDescription,
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

  // Ensure there's at least one main image
  const mainImage = product.images[0]?.url || "https://placehold.co/600x750/png?text=No+Image";

  return (
    <div className="container mx-auto px-4 pt-12 pb-40 max-w-7xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-24">
        {/* Image Gallery */}
        <div className="flex flex-col space-y-4">
          <div className="relative aspect-[3/4] w-full bg-secondary overflow-hidden">
            <Image
              src={mainImage}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {product.images.slice(1).map((img) => (
              <div key={img.id} className="relative aspect-[3/4] w-full bg-secondary overflow-hidden">
                <Image
                  src={img.url}
                  alt={img.alt || product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 25vw, 15vw"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Product Info & Actions */}
        <div className="flex flex-col space-y-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-heading uppercase tracking-widest mb-4">
              {product.name}
            </h1>
            <div className="text-xl font-medium tracking-wide">
              ${product.variants[0]?.price.toString() || "0.00"}
            </div>
          </div>

          <div
            className="prose prose-sm max-w-none font-light leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.description || "" }}
          />

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
