"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

export type ProductGroup = "ao-dan" | "mieng-dan-nguc";

export type SelectionProduct = {
  id: string;
  slug: string;
  title: string;
  price: string;
  image?: string;
  imageFit?: "contain" | "top";
  groups: ProductGroup[];
};

export function ProductSelectionGrid({
  locale,
  products,
  unavailable = false,
}: {
  locale: string;
  products: SelectionProduct[];
  unavailable?: boolean;
}) {
  const t = useTranslations("Homepage.productSelection");
  const tHome = useTranslations("Homepage");
  const [filter, setFilter] = useState<"all" | ProductGroup>("all");
  const filters = [
    { id: "all", label: t("all") },
    { id: "ao-dan", label: t("bras") },
    { id: "mieng-dan-nguc", label: t("covers") },
  ] as const;
  const visibleProducts = filter === "all" ? products : products.filter((product) => product.groups.includes(filter));

  return (
    <section id="san-pham-auria" aria-labelledby="auria-products-title" className="storefront-container scroll-mt-6 py-10 lg:py-14">
      <h2 id="auria-products-title" className="m-0 text-[2rem] leading-tight text-[#472132] lg:text-[2.75rem]">
        {t("title")}
      </h2>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 border-b border-[#e3d9d5]">
        <div role="group" aria-label={t("filterLabel")} className="flex flex-wrap gap-x-4 sm:gap-x-6">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              aria-controls="auria-product-grid"
              onClick={() => setFilter(id)}
              className="min-h-11 border-b-2 border-transparent text-sm font-medium text-[#58464b] hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 aria-pressed:border-primary aria-pressed:text-primary"
            >
              {label}
            </button>
          ))}
        </div>
        <Link href={`/${locale}/collections/all`} className="inline-flex min-h-11 shrink-0 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-4">
          {tHome("viewAll")}
        </Link>
      </div>

      <div id="auria-product-grid" className="mt-6">
        {visibleProducts.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-9">
            {visibleProducts.map((product) => (
              <li key={product.id} className="min-w-0">
                <Link href={`/${locale}/products/${product.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4">
                  <div className={`relative aspect-square overflow-hidden ${product.imageFit === "contain" ? "bg-[#dcdcdc]" : "bg-[#f1e9e6]"}`}>
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(min-width: 90rem) 320px, (min-width: 64rem) 25vw, 50vw"
                        className={product.imageFit === "contain" ? "object-contain" : `object-cover ${product.imageFit === "top" ? "object-top" : "object-center"}`}
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center px-3 text-center text-sm text-muted-foreground">{tHome("imagePlaceholder")}</span>
                    )}
                  </div>
                  <h3 className="m-0 mt-3 break-words text-pretty font-sans text-base font-medium leading-[1.45] tracking-normal text-[#392a30] group-hover:text-primary">
                    {product.title}
                  </h3>
                  <p className="mt-1.5 font-sans text-base font-medium tabular-nums text-primary">{product.price}</p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p role="status" className="py-8 text-base text-[#58464b]">{t(unavailable ? "unavailable" : "empty")}</p>
        )}
      </div>
    </section>
  );
}
