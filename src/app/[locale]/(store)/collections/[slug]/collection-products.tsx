import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/storefront/product-card";
import { getCollectionProducts } from "@/lib/storefront-collections";

const grid = "grid grid-cols-2 gap-x-4 gap-y-10 md:gap-x-6 md:gap-y-12 lg:grid-cols-4";

export function CollectionProductsSkeleton() {
  return (
    <div aria-hidden="true" className={grid}>
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="motion-safe:animate-pulse">
          <div className="aspect-[4/5] rounded-sm bg-secondary/50" />
          <div className="mt-3 h-4 w-3/4 rounded bg-secondary/50" />
          <div className="mt-1.5 h-4 w-1/3 rounded bg-secondary/50" />
        </div>
      ))}
    </div>
  );
}

export async function CollectionProducts({ slug, locale }: { slug: string; locale: string }) {
  const t = await getTranslations({ locale, namespace: "Homepage" });

  try {
    const { products, currency } = await getCollectionProducts(slug);

    if (products.length === 0) {
      return (
        <p className="border border-dashed py-32 text-center font-heading tracking-wide text-muted-foreground">
          {t("productSelection.empty")}
        </p>
      );
    }

    return (
      <>
        <p className="mb-6 text-sm text-muted-foreground">{t("collectionProductCount", { count: products.length })}</p>
        <div className={grid}>
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              locale={locale}
              currency={currency}
              imagePlaceholder={t("imagePlaceholder")}
            />
          ))}
        </div>
      </>
    );
  } catch (error) {
    console.error("[COLLECTION_PRODUCTS_ERROR]", error);
    return <p className="py-20 text-center text-destructive">{t("productSelection.unavailable")}</p>;
  }
}
