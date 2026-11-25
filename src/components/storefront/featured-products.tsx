import { getTranslations } from "next-intl/server";
import { getCategoryPath } from "@/lib/categories";
import { getDynamicComponentsByType, type FeaturedProductsComponent } from "@/lib/dynamic-components";
import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/store-settings";
import { storefrontCache } from "@/lib/storefront-cache";
import { formatPrice, formatStorefrontProductName } from "@/lib/utils";
import type { ProductGroup, SelectionProduct } from "./product-selection-card";
import { ProductSelectionGrid } from "./product-selection-grid";

const productGroups: ProductGroup[] = ["ao-dan", "mieng-dan-nguc"];
const letterSizes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
const cupSizes = ["A", "B", "C", "D", "E", "F"];
const newProductAge = 30 * 24 * 60 * 60 * 1000;

const packshots: Record<string, { filename: string; framing: NonNullable<SelectionProduct["framing"]> }> = {
  "ao-dan-nguc-giot-nuoc": {
    filename: "1791780102684-1791778509538_282073252119084964_8384377736422963477_6a0c10326f6316b38ce8f3d88aa58f47.jpg",
    framing: { width: 100, centerY: 46 },
  },
  "mieng-dan-nhu-hoa-thong-hoi-loc-xoay": {
    filename: "1791780178056-1791778533905_282073252119084964_8384377736422963477_ea7db6d27db5bec84a605b3807cccc9c.jpg",
    framing: { width: 88, centerX: 53, centerY: 46, shadowTop: 69 },
  },
  "mieng-dan-nhu-hoa-tron": {
    filename: "1791780249750-1791778537441_282073252119084964_8384377736422963477_467ad73096ec199b0d041c644e80994e.jpg",
    framing: { width: 82 },
  },
  "ao-dan-tron-su-don-5cm": {
    filename: "1791780796210-1791780754275_282073252119084964_8384377736422963477_327b8f71344a2af7c5c3be8847180065.jpg",
    framing: { width: 90, centerX: 49, centerY: 49 },
  },
  "mieng-dan-nhu-hoa-nhiet-tu-than": {
    filename: "1791787252659-1791778537441_282073252119084964_8384377736422963477_467ad73096ec199b0d041c644e80994e.jpg",
    framing: { width: 82 },
  },
  "combo-2-mieng-dan-nhu-hoa-tron-10cm": {
    filename: "1791787217730-1791778537441_282073252119084964_8384377736422963477_467ad73096ec199b0d041c644e80994e.jpg",
    framing: { width: 82 },
  },
  "mieng-dan-keo-giot-nuoc-thong-hoi-loc-xoay": {
    filename: "1791787134753-1791779901447_282073252119084964_8384377736422963477_88808261b9d95007a3be6f0f7bab4ec9.jpg",
    framing: { width: 100, centerX: 54, centerY: 48, shadowTop: 77 },
  },
};

const swatchPalette = {
  nude: "#d8ad90",
  black: "#282426",
  clear: "#f7ede6",
  cream: "#ecddc9",
  brown: "#926752",
};

const colorNames: Record<string, keyof typeof swatchPalette> = {
  da: "nude", "mau da": "nude", nude: "nude",
  den: "black", black: "black",
  trong: "clear", "trong suot": "clear", clear: "clear", transparent: "clear",
  kem: "cream", beige: "cream", cream: "cream",
  nau: "brown", brown: "brown",
};

const splitVariantName = (name: string) => name.split(/\/|\s+-\s+/).map((part) => part.trim());

function variantColor(name: string) {
  for (const part of splitVariantName(name)) {
    const key = part.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replaceAll("đ", "d");
    if (Object.hasOwn(colorNames, key)) return colorNames[key];
  }
}

async function loadFeaturedProducts(cacheSeconds: number, config?: FeaturedProductsComponent) {
  const manual = config?.displayType === "manual";
  const ids = config?.productIds ?? [];
  if (manual && ids.length === 0) return [];

  const key = manual ? "products:homepage:cards:manual:" + ids.join(",") : "products:homepage:cards:latest";
  const products = await storefrontCache(key, cacheSeconds, () =>
    prisma.product.findMany({
      where: { status: "ACTIVE", ...(manual ? { id: { in: ids } } : {}) },
      take: manual ? ids.length : 4,
      orderBy: manual ? undefined : [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        createdAt: true,
        description: true,
        overview: true,
        images: { select: { url: true }, orderBy: { position: "asc" } },
        variants: {
          where: { isActive: true },
          orderBy: [{ price: "asc" }, { name: "asc" }],
          select: { id: true, name: true, sku: true, stock: true, price: true, imageUrl: true },
        },
        categories: { where: { isActive: true }, select: { id: true } },
      },
    }),
  );

  return manual ? [...products].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)) : products;
}

async function getBestseller(products: { id: string; variants: { id: string }[] }[], cacheSeconds: number) {
  const owners = new Map(products.flatMap((product) => product.variants.map(({ id }) => [id, product.id] as const)));
  const variantIds = Array.from(owners.keys()).sort();
  if (variantIds.length === 0) return;

  const sales = await storefrontCache("products:homepage:sales:" + variantIds.join(","), cacheSeconds, () =>
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: {
        variantId: { in: variantIds },
        order: { orderStatus: { in: ["DELIVERED", "COMPLETED"] } },
      },
      _sum: { quantity: true },
    }),
  );

  const totals = new Map<string, number>();
  for (const sale of sales) {
    const productId = owners.get(sale.variantId);
    if (productId) totals.set(productId, (totals.get(productId) ?? 0) + (sale._sum.quantity ?? 0));
  }
  return products.reduce<{ id?: string; units: number }>((best, { id }) => {
    const units = totals.get(id) ?? 0;
    return units > best.units ? { id, units } : best;
  }, { units: 0 }).id;
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
    const uniqueProducts = Array.from(new Map(lists.flat().map((product) => [product.id, product])).values());
    const bestseller = await getBestseller(uniqueProducts, settings.collectionCacheSeconds).catch((error) => {
      console.error("[HOMEPAGE_BESTSELLER]", error);
      return undefined;
    });
    const newest = Date.now() - newProductAge;
    const currency = settings.currency || undefined;

    const products: SelectionProduct[] = uniqueProducts.map((product) => {
      const options = product.variants.flatMap(({ name }) => splitVariantName(name.toUpperCase()));
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
      const cups = cupSizes.filter((size) => options.includes(size) || options.includes("CUP " + size));
      const specifications = [product.overview, product.description].filter(Boolean).join(" ")
        .replaceAll("**", "").replace(/<[^>]*>/g, " ");
      const diameter = /đường kính\s*:?\s*(\d+(?:[.,]\d+)?)\s*cm/iu.exec(specifications)?.[1];
      const name = formatStorefrontProductName(product.name, locale);
      const namedBundle = firstCount !== undefined && counts.length === 1 && /^Combo \d+ miếng dán/iu.test(name);
      const swirl = product.slug === "mieng-dan-nhu-hoa-thong-hoi-loc-xoay";
      const roundBundle = namedBundle && product.slug === "combo-2-mieng-dan-nhu-hoa-tron-10cm";
      const bundleSize = roundBundle ? /\d+(?:[.,]\d+)?\s*cm\b/iu.exec(name)?.[0] : undefined;
      let title = name;
      if (swirl) title = t("swirlTitle");
      else if (roundBundle) title = t("roundBundleTitle", { count: firstCount });
      else if (namedBundle) title = name.replace(/^Combo \d+/iu, "Combo " + pairLabel);
      const details = [
        swirl ? t("breathableDetail") : "",
        bundleSize ?? (diameter && !title.includes(diameter + " cm") ? diameter + " cm" : ""),
        namedBundle ? "" : pairLabel,
        cups.length ? t("cups", { sizes: cups.join("/") }) : "",
        sizes.length ? t("sizes", { sizes: sizes.join("/") }) : "",
      ].filter(Boolean).join(" · ");
      const variants = product.variants.map(({ id, name, sku, stock, price, imageUrl }) => ({
        id, name, sku, stock,
        amount: Number(price),
        price: formatPrice(Number(price), locale, currency),
        image: imageUrl || undefined,
        color: variantColor(name),
      }));
      const firstVariant = variants[0];
      const lastVariant = variants.at(-1);
      const price = firstVariant && lastVariant && firstVariant.amount < lastVariant.amount
        ? t("fromPrice", { price: firstVariant.price })
        : firstVariant?.price || t("contact");
      const colors = new Set(variants.flatMap(({ color }) => color ? [color] : []));
      const swatches = Array.from(colors, (id) => ({ id, label: t(`colors.${id}`), hex: swatchPalette[id] }));

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
        name: product.name,
        title,
        details,
        price,
        image: preferredPhoto || photos[0],
        framing: preferredPhoto ? preferences.framing : undefined,
        badge: product.createdAt.getTime() >= newest ? "new" : product.id === bestseller ? "bestseller" : undefined,
        swatches,
        variants,
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
            <div className="aspect-square rounded-md bg-[#fef2f2]" />
            <div className="mt-4 h-5 w-4/5 bg-[#f1e9e6] lg:mt-5" />
            <div className="mt-1.5 h-4 w-1/2 bg-[#f1e9e6]" />
            <div className="mt-3 h-5 w-1/3 bg-[#f1e9e6]" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="mt-8 flex h-11 items-center justify-center lg:mt-10">
        <div className="h-4 w-36 bg-[#f1e9e6]" />
      </div>
    </section>
  );
}
