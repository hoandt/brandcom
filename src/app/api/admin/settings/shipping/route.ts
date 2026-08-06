import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";
import { getSPXCredentialStatus, getSPXSettings, SPX_CARRIER } from "@/lib/shipping/settings";
import { NextResponse } from "next/server";
import { z } from "zod";

const binaryOption = z.number().int().min(0).max(1);
const schema = z.object({
  enabled: z.boolean(),
  serviceType: z.number().int().min(1).max(2),
  senderCountry: z.string().trim().min(2).max(3).transform((value) => value.toUpperCase()),
  senderName: z.string().trim().max(100).nullable().optional(),
  senderPhone: z.string().trim().max(30).nullable().optional(),
  paymentRole: z.number().int().min(1).max(2),
  codCollection: binaryOption,
  defaultCodAmount: z.number().int().min(0),
  highValueProcessingCollection: binaryOption,
  collectType: z.number().int().min(1).max(2),
  pickupLeadTimeMinutes: z.number().int().min(0).max(10080),
  pickupTimeRangeId: z.number().int().min(1).nullable().optional(),
  allowMutualCheck: binaryOption,
  allowTryOn: binaryOption,
  voucherCode: z.string().trim().max(100).nullable().optional(),
  parcelWeightPerItem: z.number().positive().max(1000),
  minimumParcelWeight: z.number().positive().max(1000),
  parcelLength: z.number().positive().max(1000),
  parcelWidth: z.number().positive().max(1000),
  parcelHeight: z.number().positive().max(1000),
  parcelItemName: z.string().trim().min(1).max(200),
  expressInsuredValue: z.number().int().min(0),
  vasTypes: z.array(z.string().trim().min(1).max(30)).max(20),
  collectFeeAmount: z.number().int().min(0),
  defaultDeliverInstruction: z.string().trim().max(500).nullable().optional(),
});

async function authorize() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getSPXSettings();
  return NextResponse.json({ settings, credentials: getSPXCredentialStatus() });
}

export async function PUT(request: Request) {
  if (!(await authorize())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = schema.parse(await request.json());
    const settings = await prisma.carrierSettings.upsert({
      where: { tenantId_carrier: { tenantId: DEFAULT_TENANT_ID, carrier: SPX_CARRIER } },
      update: data,
      create: { ...data, tenantId: DEFAULT_TENANT_ID, carrier: SPX_CARRIER },
    });

    return NextResponse.json({ settings, credentials: getSPXCredentialStatus() });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid carrier settings", issues: error.errors }, { status: 400 });
    }
    console.error("[ADMIN_SHIPPING_SETTINGS_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update carrier settings" }, { status: 500 });
  }
}
