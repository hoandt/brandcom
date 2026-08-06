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
});

async function authorize() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getStoreSettings();
  return NextResponse.json({ settings });
}

export async function PUT(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const data = schema.parse(await request.json());
    const settings = await prisma.storeSettings.upsert({
      where: { tenantId: DEFAULT_TENANT_ID },
      update: data,
      create: { ...data, tenantId: DEFAULT_TENANT_ID },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid settings", issues: error.errors }, { status: 400 });
    console.error("[ADMIN_SETTINGS_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
