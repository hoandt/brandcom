import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";
import { getSPXCredentialStatus } from "@/lib/shipping/settings";
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
      orderBy: { createdAt: "asc" },
    });

    const carriers: CarrierItem[] = dbSettings.map((setting) => {
      let meta = {
        sla: "1-3 business days",
        trackingUrl: "",
        badge: setting.carrier.substring(0, 4).toUpperCase(),
      };

      if (setting.defaultDeliverInstruction) {
        try {
          const parsed = JSON.parse(setting.defaultDeliverInstruction);
          meta = { ...meta, ...parsed };
        } catch {
          meta.sla = setting.defaultDeliverInstruction;
        }
      }

      const codeLower = setting.carrier.toLowerCase();
      const isSpx = codeLower === "spx";
      const serviceTypeLabel =
        setting.serviceType === 2
          ? "Express / Instant (2H)"
          : setting.serviceType === 3
          ? "Economy"
          : "Standard Delivery";

      return {
        id: setting.id,
        code: setting.carrier,
        name: setting.senderName || setting.carrier.toUpperCase(),
        enabled: setting.enabled,
        serviceType: serviceTypeLabel,
        serviceTypeId: setting.serviceType,
        estimatedDelivery: meta.sla || "1-3 business days",
        baseFee: setting.defaultCodAmount || 25000,
        isApiIntegrated: isSpx,
        isApiConfigured: isSpx ? spxCreds.configured : true,
        trackingUrlTemplate: meta.trackingUrl || "",
        logoBadge: meta.badge || setting.carrier.substring(0, 4).toUpperCase(),
      };
    });

    return NextResponse.json({ carriers });
  } catch (error) {
    console.error("[ADMIN_CARRIERS_GET]", error);
    return NextResponse.json({ error: "Failed to load carriers" }, { status: 500 });
  }
}

const createSchema = z.object({
  code: z.string().trim().min(1).max(30).transform((val) => val.toLowerCase()),
  name: z.string().trim().min(1).max(100),
  serviceType: z.number().int().min(1).max(3).default(1),
  baseFee: z.number().int().min(0).default(25000),
  estimatedDelivery: z.string().trim().max(100).optional().default("1-3 business days"),
  trackingUrlTemplate: z.string().trim().max(500).optional().default(""),
  enabled: z.boolean().default(true),
});

export async function POST(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = createSchema.parse(body);

    const badge = data.code.substring(0, 4).toUpperCase();
    const metaJson = JSON.stringify({
      sla: data.estimatedDelivery,
      trackingUrl: data.trackingUrlTemplate,
      badge,
    });

    const carrier = await prisma.carrierSettings.upsert({
      where: { tenantId_carrier: { tenantId: DEFAULT_TENANT_ID, carrier: data.code } },
      update: {
        senderName: data.name,
        enabled: data.enabled,
        serviceType: data.serviceType,
        defaultCodAmount: data.baseFee,
        defaultDeliverInstruction: metaJson,
      },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        carrier: data.code,
        senderName: data.name,
        enabled: data.enabled,
        serviceType: data.serviceType,
        defaultCodAmount: data.baseFee,
        defaultDeliverInstruction: metaJson,
      },
    });

    return NextResponse.json({ success: true, carrier });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", issues: error.errors }, { status: 400 });
    }
    console.error("[ADMIN_CARRIERS_POST]", error);
    return NextResponse.json({ error: "Failed to create carrier" }, { status: 500 });
  }
}

const updateSchema = z.object({
  id: z.string().optional(),
  carrier: z.string().trim().min(1).transform((val) => val.toLowerCase()),
  name: z.string().trim().min(1).max(100).optional(),
  enabled: z.boolean(),
  serviceType: z.number().int().optional().default(1),
  baseFee: z.number().int().min(0).optional().default(25000),
  estimatedDelivery: z.string().trim().max(100).optional(),
  trackingUrlTemplate: z.string().trim().max(500).optional(),
});

export async function PUT(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await prisma.carrierSettings.findUnique({
      where: { tenantId_carrier: { tenantId: DEFAULT_TENANT_ID, carrier: data.carrier } },
    });

    let currentMeta = {
      sla: "1-3 business days",
      trackingUrl: "",
      badge: data.carrier.substring(0, 4).toUpperCase(),
    };

    if (existing?.defaultDeliverInstruction) {
      try {
        currentMeta = { ...currentMeta, ...JSON.parse(existing.defaultDeliverInstruction) };
      } catch {}
    }

    if (data.estimatedDelivery !== undefined) currentMeta.sla = data.estimatedDelivery;
    if (data.trackingUrlTemplate !== undefined) currentMeta.trackingUrl = data.trackingUrlTemplate;

    const updated = await prisma.carrierSettings.upsert({
      where: { tenantId_carrier: { tenantId: DEFAULT_TENANT_ID, carrier: data.carrier } },
      update: {
        ...(data.name ? { senderName: data.name } : {}),
        enabled: data.enabled,
        serviceType: data.serviceType,
        defaultCodAmount: data.baseFee,
        defaultDeliverInstruction: JSON.stringify(currentMeta),
      },
      create: {
        tenantId: DEFAULT_TENANT_ID,
        carrier: data.carrier,
        senderName: data.name || data.carrier.toUpperCase(),
        enabled: data.enabled,
        serviceType: data.serviceType,
        defaultCodAmount: data.baseFee,
        defaultDeliverInstruction: JSON.stringify(currentMeta),
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

export async function DELETE(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const code = searchParams.get("code")?.toLowerCase();

    if (!id && !code) {
      return NextResponse.json({ error: "Carrier ID or Code is required" }, { status: 400 });
    }

    if (id) {
      await prisma.carrierSettings.delete({ where: { id } });
    } else if (code) {
      await prisma.carrierSettings.delete({
        where: { tenantId_carrier: { tenantId: DEFAULT_TENANT_ID, carrier: code } },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_CARRIERS_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete carrier" }, { status: 500 });
  }
}
