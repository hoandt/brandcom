import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

const CARRIER_NAMES: Record<string, string> = {
  spx: "SPX Express",
};

export async function GET() {
  try {
    const settings = await prisma.carrierSettings.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        enabled: true,
      },
      select: {
        carrier: true,
        serviceType: true,
      },
      orderBy: { carrier: "asc" },
    });

    return NextResponse.json({
      carriers: settings.map((setting) => ({
        id: setting.carrier,
        name: CARRIER_NAMES[setting.carrier] ?? setting.carrier.toUpperCase(),
        serviceType: setting.serviceType,
      })),
    });
  } catch (error) {
    console.error("[SHIPPING_CARRIERS_GET]", error);
    return NextResponse.json({ error: "Failed to load shipping carriers" }, { status: 500 });
  }
}
