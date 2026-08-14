const clean = (value: string | undefined) => value?.trim() || undefined;

export const brandConfig = {
  name: clean(process.env.NEXT_PUBLIC_STORE_NAME) || clean(process.env.DEFAULT_STORE_NAME) || "AURIA",
  tagline:
    clean(process.env.NEXT_PUBLIC_STORE_TAGLINE) ||
    clean(process.env.DEFAULT_STORE_TAGLINE) ||
    "Premium quality products for modern living.",
  logoUrl: clean(process.env.NEXT_PUBLIC_STORE_LOGO_URL),
  siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL) || clean(process.env.FRONTEND_URL) || "https://auria.fit",
  cartStorageKey: clean(process.env.NEXT_PUBLIC_CART_STORAGE_KEY) || "auria-cart-storage",
} as const;

export const isDefaultAuriaBrand = brandConfig.name.toLocaleLowerCase() === "auria" && !brandConfig.logoUrl;
