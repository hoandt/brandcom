import { prisma } from "@/lib/prisma";
import { brandConfig } from "@/lib/brand-config";

export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default-tenant";

export const DEFAULT_STORE_SETTINGS = {
  tenantId: DEFAULT_TENANT_ID,
  storeName: process.env.DEFAULT_STORE_NAME || brandConfig.name,
  legalName: process.env.DEFAULT_LEGAL_NAME || "AURIA VN",
  tagline: process.env.DEFAULT_STORE_TAGLINE || brandConfig.tagline,
  supportEmail: process.env.DEFAULT_SUPPORT_EMAIL || "support@auria.vn",
  supportPhone: process.env.DEFAULT_SUPPORT_PHONE || "",
  defaultLocale: process.env.DEFAULT_LOCALE || "vi",
  currency: process.env.DEFAULT_CURRENCY || "VND",
  timezone: process.env.DEFAULT_TIMEZONE || "Asia/Ho_Chi_Minh",
  orderPrefix: process.env.DEFAULT_ORDER_PREFIX || "ORD",
  fallbackShippingFee: Number(process.env.DEFAULT_SHIPPING_FEE || 30000),
  lowStockThreshold: Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD || 5),
  productCacheSeconds: Number(process.env.DEFAULT_PRODUCT_CACHE_SECONDS || 900),
  collectionCacheSeconds: Number(process.env.DEFAULT_COLLECTION_CACHE_SECONDS || 300),
  categoryCacheSeconds: Number(process.env.DEFAULT_CATEGORY_CACHE_SECONDS || 300),
  storeSettingsCacheSeconds: Number(process.env.DEFAULT_STORE_SETTINGS_CACHE_SECONDS || 300),
  nonCodDiscountEnabled: true,
  nonCodDiscountType: "percentage",
  nonCodDiscountValue: 5,
  marketplaceShopId: process.env.DEFAULT_MARKETPLACE_SHOP_ID || null,
  marketplaceShops: process.env.DEFAULT_MARKETPLACE_SHOP_ID
    ? [{ marketplace: "shopee", shopId: process.env.DEFAULT_MARKETPLACE_SHOP_ID }]
    : [],
  orderNotificationEnabled: true,
  orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_USER || null,
  orderNotificationEmails: process.env.ORDER_NOTIFICATION_EMAIL
    ? process.env.ORDER_NOTIFICATION_EMAIL.split(",").map((email) => email.trim()).filter(Boolean)
    : process.env.SMTP_USER ? [process.env.SMTP_USER] : [],
};

let cachedSettings: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 5 * 60_000; // 5 minutes in-memory cache

export function invalidateStoreSettingsCache() {
  cachedSettings = null;
}

export async function getStoreSettings(tenantId = DEFAULT_TENANT_ID) {
  const now = Date.now();
  if (cachedSettings && cachedSettings.expiresAt > now && cachedSettings.data.tenantId === tenantId) {
    return cachedSettings.data;
  }

  let settings = await prisma.storeSettings.findUnique({
    where: { tenantId },
  });

  if (!settings) {
    settings = await prisma.storeSettings.upsert({
      where: { tenantId },
      update: {},
      create: { ...DEFAULT_STORE_SETTINGS, tenantId },
    });
  }

  cachedSettings = { data: settings, expiresAt: now + CACHE_TTL_MS };
  return settings;
}

export type PublicStoreSettings = Pick<
  Awaited<ReturnType<typeof getStoreSettings>>,
  "tenantId" | "storeName" | "legalName" | "tagline" | "supportEmail" | "supportPhone" |
  "defaultLocale" | "currency" | "timezone" | "orderPrefix" | "fallbackShippingFee" | "lowStockThreshold" |
  "productCacheSeconds" | "collectionCacheSeconds" | "categoryCacheSeconds" | "storeSettingsCacheSeconds" |
  "nonCodDiscountEnabled" | "nonCodDiscountType" | "nonCodDiscountValue"
>;
