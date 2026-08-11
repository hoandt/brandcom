import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";
import { getSPXCredentialStatus, SPX_CARRIER } from "@/lib/shipping/settings";
import { NextResponse } from "next/server";
import { z } from "zod";

export interface CarrierItem {
  id: string;
  code: string;
  name: string;
  enabled: boolean;
  serviceType: string;
  serviceTypeId: number;
  estimatedDelivery: string;
  baseFee: number;
  isApiIntegrated: boolean;
  isApiConfigured: boolean;
  trackingUrlTemplate: string;
  logoBadge: string;
}

const BUILTIN_CARRIERS: Record<string, Omit<CarrierItem, "enabled" | "serviceTypeId">> = {
  spx: {
    id: "spx",
    code: "spx",
    name: "SPX Express (Shopee Xpress)",
    serviceType: "Standard & Express",
    estimatedDelivery: "1 - 3 business days",
    baseFee: 25000,
    isApiIntegrated: true,
    isApiConfigured: false,
    trackingUrlTemplate: "https://spx.vn/track/{trackingNumber}",
    logoBadge: "SPX",
  },
  jnt: {
    id: "jnt",
    code: "jnt",
    name: "J&T Express",
    serviceType: "Express Delivery",
    estimatedDelivery: "1 - 2 business days",
    baseFee: 22000,
    isApiIntegrated: false,
    isApiConfigured: false,
    trackingUrlTemplate: "https://jtexpress.vn/track?billcode={trackingNumber}",
    logoBadge: "J&T",
  },
  grab: {
    id: "grab",
    code: "grab",
    name: "GrabExpress (Instant Delivery)",
    serviceType: "Same-day Instant (2H)",
    estimatedDelivery: "Same day (2 Hours)",
    baseFee: 35000,
    isApiIntegrated: false,
    isApiConfigured: false,
    trackingUrlTemplate: "https://www.grab.com/vn/express/",
    logoBadge: "GRAB",
  },
  ghtk: {
    id: "ghtk",
    code: "ghtk",
    name: "Giao Hàng Tiết Kiệm (GHTK)",
    serviceType: "Standard Delivery",
    estimatedDelivery: "2 - 3 business days",
    baseFee: 20000,
    isApiIntegrated: false,
    isApiConfigured: false,
    trackingUrlTemplate: "https://ghtk.vn/tra-cuu-don-hang/?code={trackingNumber}",
    logoBadge: "GHTK",
  },
  vtp: {
    id: "vtp",
    code: "vtp",
    name: "Viettel Post",
    serviceType: "Express & Economy",
    estimatedDelivery: "2 - 4 business days",
    baseFee: 18000,
    isApiIntegrated: false,
    isApiConfigured: false,
    trackingUrlTemplate: "https://viettelpost.com.vn/tra-cuu-hanh-trinh-don-hang?code={trackingNumber}",
    logoBadge: "VTP",
  },
  vnpost: {
    id: "vnpost",
    code: "vnpost",
    name: "VNPost (Bưu Điện Việt Nam)",
    serviceType: "Standard EMS",
    estimatedDelivery: "3 - 5 business days",
    baseFee: 16000,
    isApiIntegrated: false,
    isApiConfigured: false,
    trackingUrlTemplate: "https://www.vnpost.vn/vi-vn/dich-vu/tra-cuu-hinh-thuc-van-chuyen?code={trackingNumber}",
    logoBadge: "VNPOST",
  },
};

async function authorize() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const spxCreds = getSPXCredentialStatus();
    const dbSettings = await prisma.carrierSettings.findMany({
      where: { tenantId: DEFAULT_TENANT_ID },
    });

    const settingsMap = new Map(dbSettings.map((item) => [item.carrier.toLowerCase(), item]));

    const carriers: CarrierItem[] = Object.keys(BUILTIN_CARRIERS).map((key) => {
      const builtin = BUILTIN_CARRIERS[key];
      const dbSetting = settingsMap.get(key);

      const isConfigured = key === "spx" ? spxCreds.configured : true;

      return {
        ...builtin,
        enabled: dbSetting ? dbSetting.enabled : key === "spx" || key === "jnt" || key === "grab",
        serviceTypeId: dbSetting ? dbSetting.serviceType : 1,
        baseFee: dbSetting && dbSetting.defaultCodAmount > 0 ? dbSetting.defaultCodAmount : builtin.baseFee,
        isApiConfigured: isConfigured,
      };
    });

    return NextResponse.json({ carriers });
  } catch (error) {
    console.error("[ADMIN_CARRIERS_GET]", error);
    return NextResponse.json({ error: "Failed to load carriers" }, { status: 500 });
  }
}

const updateSchema = z.object({
  carrier: z.string().trim().min(1),
  enabled: z.boolean(),
  serviceType: z.number().int().optional().default(1),
  baseFee: z.number().int().min(0).optional().default(25000),
});

export async function PUT(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { carrier, enabled, serviceType, baseFee } = updateSchema.parse(body);

    const updated = await prisma.carrierSettings.upsert({
      where: { tenantId_carrier: { tenantId: DEFAULT_TENANT_ID, carrier: carrier.toLowerCase() } },
      update: {
        enabled,
        serviceType,
        defaultCodAmount: baseFee,
      },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        carrier: carrier.toLowerCase(),
        enabled,
        serviceType,
        defaultCodAmount: baseFee,
      },
    });

    return NextResponse.json({ success: true, carrier: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: error.errors }, { status: 400 });
    }
    console.error("[ADMIN_CARRIERS_PUT]", error);
    return NextResponse.json({ error: "Failed to update carrier" }, { status: 500 });
  }
}
