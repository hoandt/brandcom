export const AURIA_ROUND_PRODUCT_SLUG = "mieng-dan-nhu-hoa-tron";

export const AURIA_THERMAL_PRODUCT_SLUG = "mieng-dan-nhu-hoa-nhiet-tu-than";

export const AURIA_REPRICED_PRODUCT_SLUGS = [AURIA_ROUND_PRODUCT_SLUG, AURIA_THERMAL_PRODUCT_SLUG] as const;

const bundleSkus = {
  [AURIA_ROUND_PRODUCT_SLUG]: ["MNHTN0DA1", "MNHTN0DA2", "MNH00TDA3"],
  [AURIA_THERMAL_PRODUCT_SLUG]: ["MNH00NDA1", "MNH00NDA2", "MNH00NDA3"],
};

export function hasLiveBundlePrices(slug?: string | null) {
  return AURIA_REPRICED_PRODUCT_SLUGS.some((bundleSlug) => bundleSlug === slug);
}

export function getAuriaRepricedProductSlug(item: { productSlug?: string; sku: string }) {
  return AURIA_REPRICED_PRODUCT_SLUGS.find((slug) => item.productSlug === slug || bundleSkus[slug].includes(item.sku));
}
