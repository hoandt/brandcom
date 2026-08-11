import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

const CARRIER_NAMES: Record<string, string> = {
  spx: "SPX Express",
  jnt: "J&T Express",
  grab: "GrabExpress",
  ghtk: "Giao Hàng Tiết Kiệm (GHTK)",
  vtp: "Viettel Post",
  vnpost: "VNPost",
};

export async function GET() {
  try {
    const settings = await prisma.carrierSettings.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
      },
      select: {
        carrier: true,
        enabled: true,
        serviceType: true,
      },
      orderBy: { carrier: "asc" },
    });

    const settingsMap = new Map(settings.map((s) => [s.carrier.toLowerCase(), s]));

    const DEFAULT_ENABLED_CARRIERS = ["spx", "jnt", "grab"];

    const activeCarriers = Object.keys(CARRIER_NAMES)
      .filter((carrierKey) => {
        const s = settingsMap.get(carrierKey);
        return s ? s.enabled : DEFAULT_ENABLED_CARRIERS.includes(carrierKey);
      })
      .map((carrierKey) => {
        const s = settingsMap.get(carrierKey);
        return {
          id: carrierKey,
          name: CARRIER_NAMES[carrierKey],
          serviceType: s ? s.serviceType : 1,
        };
      });

    return NextResponse.json({
      carriers: activeCarriers,
    });
  } catch (error) {
    console.error("[SHIPPING_CARRIERS_GET]", error);
    return NextResponse.json({ error: "Failed to load shipping carriers" }, { status: 500 });
  }
}
