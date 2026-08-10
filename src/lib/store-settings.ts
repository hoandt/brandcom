import { prisma } from "@/lib/prisma";

export const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "default-tenant";

export const DEFAULT_STORE_SETTINGS = {
  tenantId: DEFAULT_TENANT_ID,
  storeName: process.env.DEFAULT_STORE_NAME || "AURIA",
  legalName: process.env.DEFAULT_LEGAL_NAME || "AURIA VN",
  tagline: process.env.DEFAULT_STORE_TAGLINE || "Premium quality products for modern living.",
  supportEmail: process.env.DEFAULT_SUPPORT_EMAIL || "support@auria.vn",
  supportPhone: process.env.DEFAULT_SUPPORT_PHONE || "",
  defaultLocale: process.env.DEFAULT_LOCALE || "vi",
  currency: process.env.DEFAULT_CURRENCY || "VND",
  timezone: process.env.DEFAULT_TIMEZONE || "Asia/Ho_Chi_Minh",
  orderPrefix: process.env.DEFAULT_ORDER_PREFIX || "ORD",
  fallbackShippingFee: Number(process.env.DEFAULT_SHIPPING_FEE || 30000),
  lowStockThreshold: Number(process.env.DEFAULT_LOW_STOCK_THRESHOLD || 5),
  marketplaceShopId: process.env.DEFAULT_MARKETPLACE_SHOP_ID || null,
  marketplaceShops: process.env.DEFAULT_MARKETPLACE_SHOP_ID
    ? [{ marketplace: "shopee", shopId: process.env.DEFAULT_MARKETPLACE_SHOP_ID }]
    : [],
};

export async function getStoreSettings(tenantId = DEFAULT_TENANT_ID) {
  return prisma.storeSettings.upsert({
    where: { tenantId },
    update: {},
    create: { ...DEFAULT_STORE_SETTINGS, tenantId },
  });
}

export type PublicStoreSettings = Pick<
  Awaited<ReturnType<typeof getStoreSettings>>,
  "tenantId" | "storeName" | "legalName" | "tagline" | "supportEmail" | "supportPhone" |
  "defaultLocale" | "currency" | "timezone" | "orderPrefix" | "fallbackShippingFee" | "lowStockThreshold"
>;
