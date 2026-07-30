import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getLocale } from "next-intl/server";

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      products: {
        include: {
          variants: true,
          images: {
            orderBy: { position: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!category) {
    notFound();
  }

  return (
    <div className="container mx-auto py-12 px-4 md:px-8">
      {/* Category Header */}
      <div className="mb-12 text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-3xl md:text-5xl font-heading uppercase tracking-widest">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-muted-foreground font-light text-sm md:text-base">
            {category.description}
          </p>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {category.products.map((product) => {
          const mainImage = product.images[0]?.url;
          return (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.slug}`}
              className="group flex flex-col gap-4"
            >
              <div className="aspect-[4/5] bg-secondary overflow-hidden relative border border-transparent hover:border-border transition-colors">
                {mainImage ? (
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 bg-secondary flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                    <span className="text-muted-foreground font-heading uppercase tracking-widest text-xs">
                      No Image
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <h3 className="font-heading uppercase tracking-wider text-sm">
                  {product.name}
                </h3>
                <p className="text-foreground mt-2 font-light text-sm">
                  ${product.variants[0]?.price?.toString() || "0.00"}
                </p>
              </div>
            </Link>
          );
        })}

        {category.products.length === 0 && (
          <div className="col-span-full text-center py-32 text-muted-foreground border border-dashed">
            <span className="font-heading uppercase tracking-widest">
              No products found in this category
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
