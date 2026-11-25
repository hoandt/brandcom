"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProductSelectionCard, type ProductGroup, type SelectionProduct } from "./product-selection-card";
import { StorefrontArrowLink } from "./storefront-arrow-link";

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
      <div role="group" aria-label={t("filterLabel")} className="mt-3 flex flex-wrap gap-x-4 border-b border-[#e3d9d5] sm:gap-x-6">
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
      <div id="auria-product-grid" className="mt-6">
        {visibleProducts.length > 0 ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-9">
            {visibleProducts.map((product) => (
              <ProductSelectionCard key={product.id} product={product} locale={locale} />
            ))}
          </ul>
        ) : (
          <p role="status" className="py-8 text-base text-[#58464b]">{t(unavailable ? "unavailable" : "empty")}</p>
        )}
      </div>

      <div className="mt-8 flex justify-center lg:mt-10">
        <StorefrontArrowLink href={`/${locale}/collections/all`}>
          {t("viewAllProducts")}
        </StorefrontArrowLink>
      </div>
    </section>
  );
}
