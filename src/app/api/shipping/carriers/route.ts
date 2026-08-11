import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

export async function GET() {
  try {
    const settings = await prisma.carrierSettings.findMany({
      where: {
        tenantId: DEFAULT_TENANT_ID,
        enabled: true,
      },
      select: {
        carrier: true,
        senderName: true,
        serviceType: true,
        defaultCodAmount: true,
        defaultDeliverInstruction: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const activeCarriers = settings.map((s) => {
      let sla = "1-3 business days";
      if (s.defaultDeliverInstruction) {
        try {
          const meta = JSON.parse(s.defaultDeliverInstruction);
          if (meta.sla) sla = meta.sla;
        } catch {
          sla = s.defaultDeliverInstruction;
        }
      }

      return {
        id: s.carrier,
        name: s.senderName || s.carrier.toUpperCase(),
        serviceType: s.serviceType,
        baseFee: s.defaultCodAmount || 25000,
        estimatedDelivery: sla,
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
