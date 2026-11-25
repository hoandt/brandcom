import { getTranslations } from "next-intl/server";
import { getCategoryPath } from "@/lib/categories";
import { getDynamicComponentsByType, type FeaturedProductsComponent } from "@/lib/dynamic-components";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";
import { storefrontCache } from "@/lib/storefront-cache";
import { formatPrice } from "@/lib/utils";
import { ProductSelectionGrid, type ProductGroup, type SelectionProduct } from "./product-selection-grid";

const productGroups: ProductGroup[] = ["ao-dan", "mieng-dan-nguc"];
const letterSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

const packshots: Record<string, { filename: string; fit?: SelectionProduct["imageFit"] }> = {
  "ao-dan-nguc-giot-nuoc": {
    filename: "1793004060797-1793003954671_282073252119084964_8384377736422963477_75ea760d008fe97b36408e8739c0560e.jpg",
    fit: "contain",
  },
  "mieng-dan-nhu-hoa-thong-hoi-loc-xoay": {
    filename: "1789610662602-thumbnail-(1080-x-1080-px)-(45).png",
  },
  "mieng-dan-nhu-hoa-tron": {
    filename: "1787823560866-Chống-nước,-bám-chắc-khi-ra-mồ-hôi.-(12).png",
  },
  "ao-dan-tron-su-don-5cm": {
    filename: "1788939077120-1788938975831_282073252119084964_8384377736422963477_34de28106d344568589d0a1458191e81.jpg",
  },
  "mieng-dan-nhu-hoa-nhiet-tu-than": {
    filename: "1787313333449-mieng-dan-tu-than.png",
  },
  "combo-2-mieng-dan-nhu-hoa-tron-10cm": {
    filename: "1791787217730-1791778537441_282073252119084964_8384377736422963477_467ad73096ec199b0d041c644e80994e.jpg",
    fit: "top",
  },
  "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay": {
    filename: "1791170492197-1791170336882_282073252119084964_8384377736422963477_5b8cd30ac0475ae3123cabce3dbf5d87.jpg",
  },
};

async function loadFeaturedProducts(cacheSeconds: number, config?: FeaturedProductsComponent) {
  const manual = config?.displayType === "manual";
  const ids = config?.productIds ?? [];
  if (manual && ids.length === 0) return [];

  const key = manual ? "products:homepage:manual:" + ids.join(",") : "products:homepage:latest";
  const products = await storefrontCache(key, cacheSeconds, () =>
    prisma.product.findMany({
      where: { status: "ACTIVE", ...(manual ? { id: { in: ids } } : {}) },
      take: manual ? ids.length : 4,
      orderBy: manual ? undefined : [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        overview: true,
        images: { select: { url: true }, orderBy: { position: "asc" } },
        variants: {
          where: { isActive: true },
          orderBy: { price: "asc" },
          select: { name: true, price: true, imageUrl: true },
        },
        categories: { where: { isActive: true }, select: { id: true } },
      },
    }),
  );

  return manual ? [...products].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) : products;
}

function sentenceCase(name: string, locale: string) {
  const words = name.trim().replace(/\s+/g, " ").toLocaleLowerCase(locale)
    .replace(/(\d)\s*(cm|mm)\b/g, "$1 $2")
    .replace(/\bauria\b/g, "Auria")
    .replace(/\bbare\b/g, "Bare");
  return words.charAt(0).toLocaleUpperCase(locale) + words.slice(1);
}

export async function FeaturedProducts({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "Homepage.productSelection" });

  try {
    const [settings, configs] = await Promise.all([
      getStoreSettings(),
      getDynamicComponentsByType<FeaturedProductsComponent>("featured-products"),
    ]);
    const selections = configs.length > 0
      ? configs.sort((a, b) => (a.data?.order ?? 0) - (b.data?.order ?? 0)).map(({ data }) => data)
      : [undefined];
    const [groups, lists] = await Promise.all([
      storefrontCache("categories:homepage-product-groups", settings.categoryCacheSeconds, () =>
        prisma.category.findMany({
          where: { isActive: true },
          select: { id: true, slug: true, parentId: true },
        }),
      ),
      Promise.all(selections.map((config) => loadFeaturedProducts(settings.collectionCacheSeconds, config))),
    ]);
    const uniqueProducts = new Map(lists.flat().map((product) => [product.id, product]));

    const products: SelectionProduct[] = Array.from(uniqueProducts.values(), (product) => {
      const options = product.variants.flatMap(({ name }) => name.toUpperCase().split("/").map((option) => option.trim()));
      const counts = [...new Set(options.flatMap((option) => {
        const pair = /^(\d+)\s*cặp$/iu.exec(option);
        return pair ? [Number(pair[1])] : [];
      }))].sort((a, b) => a - b);
      const firstCount = counts[0];
      const lastCount = counts.at(-1);
      const pairLabel = firstCount === undefined || lastCount === undefined
        ? ""
        : firstCount === lastCount
          ? t("pairs", { count: firstCount })
          : t("pairRange", { min: firstCount, max: lastCount });
      const sizes = letterSizes.filter((size) => options.includes(size));
      const specifications = [product.overview, product.description].filter(Boolean).join(" ")
        .replaceAll("**", "").replace(/<[^>]*>/g, " ");
      const diameter = /đường kính\s*:?\s*(\d+(?:[.,]\d+)?)\s*cm/iu.exec(specifications)?.[1];
      const name = sentenceCase(product.name, locale);
      // Use the actual pair option when a legacy bundle name counts individual pieces.
      const namedBundle = counts.length === 1 && /^Combo \d+ miếng dán/iu.test(name);
      const title = namedBundle ? name.replace(/^Combo \d+/iu, "Combo " + firstCount + " cặp") : name;
      const details = [
        namedBundle ? "" : pairLabel,
        sizes.length ? t("sizes", { sizes: sizes.join("/") }) : "",
        diameter && !name.includes(diameter + " cm") ? diameter + " cm" : "",
      ].filter(Boolean);
      const firstVariant = product.variants[0];
      const lastVariant = product.variants.at(-1);
      const amount = firstVariant ? formatPrice(Number(firstVariant.price), locale, settings.currency || undefined) : "";
      const price = amount && Number(firstVariant.price) < Number(lastVariant?.price)
        ? t("fromPrice", { price: amount })
        : amount || t("contact");

      const preferences = packshots[product.slug];
      const photos = [
        ...product.images.map(({ url }) => url),
        ...product.variants.flatMap(({ imageUrl }) => imageUrl ? [imageUrl] : []),
      ];
      const preferredPhoto = preferences && photos.find((url) => url.endsWith("/" + preferences.filename));
      const categoryPaths = product.categories.flatMap(({ id }) => getCategoryPath(groups, id));

      return {
        id: product.id,
        slug: product.slug,
        title: details.length ? title + " · " + details.join(", ") : title,
        price,
        image: preferredPhoto || photos[0],
        imageFit: preferredPhoto ? preferences.fit : undefined,
        groups: productGroups.filter((slug) => categoryPaths.some((category) => category.slug === slug)),
      };
    });

    return <ProductSelectionGrid locale={locale} products={products} />;
  } catch (error) {
    console.error("[HOMEPAGE_PRODUCTS]", error);
    return <ProductSelectionGrid locale={locale} products={[]} unavailable />;
  }
}

export async function FeaturedProductsSkeleton() {
  const t = await getTranslations("Homepage.productSelection");

  return (
    <section id="san-pham-auria" aria-labelledby="auria-products-title" aria-busy="true" className="storefront-container scroll-mt-6 py-10 lg:py-14">
      <h2 id="auria-products-title" className="m-0 text-[2rem] leading-tight text-[#472132] lg:text-[2.75rem]">{t("title")}</h2>
      <span role="status" className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className="mt-3 h-11 border-b border-[#e3d9d5]" />
      <div aria-hidden="true" className="mt-6 grid grid-cols-2 gap-x-4 gap-y-7 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-8">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="motion-safe:animate-pulse">
            <div className="aspect-square bg-[#f1e9e6]" />
            <div className="mt-3 h-5 w-4/5 bg-[#f1e9e6]" />
            <div className="mt-1.5 h-5 w-1/3 bg-[#f1e9e6]" />
          </div>
        ))}
      </div>
    </section>
  );
}
