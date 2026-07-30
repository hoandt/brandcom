"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

type Product = {
  id: string;
  name: string;
  slug: string;
  variants: { price: string }[];
  images: { url: string }[];
};

export function CollectionClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useTranslations("Homepage"); // using Homepage for some shared labels like viewAll

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: Product[] }>({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${slug}`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
  });

  const products = data?.data || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-4 animate-pulse">
            <div className="aspect-[4/5] bg-secondary/50 rounded-sm"></div>
            <div className="flex flex-col items-center gap-2">
              <div className="h-4 w-3/4 bg-secondary/50 rounded"></div>
              <div className="h-4 w-1/4 bg-secondary/50 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-destructive">
        <p>Failed to load products.</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="col-span-full text-center py-32 text-muted-foreground border border-dashed">
        <span className="font-heading uppercase tracking-widest">
          {t("noProducts")}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
      {products.map((product) => {
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
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-secondary flex items-center justify-center transition-transform duration-700 group-hover:scale-105">
                  <span className="text-muted-foreground font-heading uppercase tracking-widest text-xs">
                    {t("imagePlaceholder")}
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
    </div>
  );
}
