"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ProductCard } from "@/components/storefront/product-card";

type Product = {
  id: string;
  name: string;
  slug: string;
  variants: { price: string; comparePrice?: string | null; stock: number }[];
  images: { url: string }[];
  categories: { name: string }[];
  reviews: { rating: number }[];
  cardHoverVideoUrl?: string | null;
  cardHoverImageUrl?: string | null;
};

export function CollectionClient({ slug }: { slug: string }) {
  const locale = useLocale();
  const t = useTranslations("Homepage"); // using Homepage for some shared labels like viewAll

  const { data, isLoading, isError } = useQuery<{ success: boolean; data: Product[]; currency?: string; cacheSeconds?: number }>({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const res = await fetch(`/api/collections/${slug}`);
      if (!res.ok) throw new Error("Network response was not ok");
      return res.json();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const products = data?.data || [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 animate-pulse">
            <div className="aspect-[4/5] bg-secondary/50 rounded-sm"></div>
            <div className="flex flex-col gap-2 mt-1">
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
    <>
      <div className="mb-6 text-sm text-muted-foreground">
        {products.length} styles
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            locale={locale}
            currency={data?.currency}
            imagePlaceholder={t("imagePlaceholder")}
          />
        ))}
      </div>
    </>
  );
}
