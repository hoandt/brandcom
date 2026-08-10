import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID, getStoreSettings } from "@/lib/store-settings";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminEmail } from "@/lib/admin-access";

const schema = z.object({
  storeName: z.string().trim().min(1).max(100),
  legalName: z.string().trim().max(160).nullable().optional(),
  tagline: z.string().trim().max(240).nullable().optional(),
  supportEmail: z.string().email().nullable().optional().or(z.literal("")),
  supportPhone: z.string().trim().max(30).nullable().optional(),
  defaultLocale: z.enum(["vi", "en", "th"]),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(80),
  orderPrefix: z.string().trim().min(1).max(12).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  fallbackShippingFee: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  marketplaceShopId: z.union([
    z.string().trim().regex(/^\d+$/, "Marketplace Shop ID must contain digits only").max(30),
    z.literal(""),
    z.null(),
  ]).optional().transform((value) => value || null),
  marketplaceShops: z.array(z.object({
    marketplace: z.enum(["shopee", "lazada", "tiktok_shop"]),
    shopId: z.string().trim().min(1, "Shop ID is required").max(64),
  })).max(20).default([]),
  orderNotificationEnabled: z.boolean().default(true),
  orderNotificationEmail: z.union([z.string().trim().email().max(320), z.literal(""), z.null()]).optional().transform((value) => value || null),
  orderNotificationEmails: z.array(z.string().trim().email().max(320)).max(20).default([]).transform((emails) => [...new Set(emails.map((email) => email.toLowerCase()))]),
});

async function authorize() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getStoreSettings();
  const storedEmails = Array.isArray(settings.orderNotificationEmails) ? settings.orderNotificationEmails.filter((email): email is string => typeof email === "string") : [];
  const fallbackEmail = settings.orderNotificationEmail || process.env.ORDER_NOTIFICATION_EMAIL || process.env.SMTP_USER || null;
  return NextResponse.json({ settings: { ...settings, orderNotificationEmail: fallbackEmail, orderNotificationEmails: storedEmails.length > 0 ? storedEmails : fallbackEmail ? [fallbackEmail] : [] } });
}

export async function PUT(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = schema.parse(await request.json());
    const marketplaceShopId = data.marketplaceShops.find((shop) => shop.marketplace === "shopee")?.shopId
      ?? data.marketplaceShopId;
    const orderNotificationEmail = data.orderNotificationEmails[0] ?? data.orderNotificationEmail;
    const settings = await prisma.storeSettings.upsert({
      where: { tenantId: DEFAULT_TENANT_ID },
      update: { ...data, marketplaceShopId, orderNotificationEmail },
      create: { ...data, marketplaceShopId, orderNotificationEmail, tenantId: DEFAULT_TENANT_ID },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid settings", issues: error.errors }, { status: 400 });
    console.error("[ADMIN_SETTINGS_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
