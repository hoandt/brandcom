import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

export const SPX_CARRIER = "spx";

export const DEFAULT_SPX_SETTINGS = {
  carrier: SPX_CARRIER,
  enabled: true,
  serviceType: 1,
  senderCountry: "VN",
  senderName: null,
  senderPhone: null,
  paymentRole: 1,
  codCollection: 0,
  defaultCodAmount: 0,
  highValueProcessingCollection: 0,
  collectType: 2,
  pickupLeadTimeMinutes: 60,
  pickupTimeRangeId: null,
  allowMutualCheck: 1,
  allowTryOn: 1,
  voucherCode: process.env.SPX_VOUCHER_CODE || null,
  parcelWeightPerItem: 0.2,
  minimumParcelWeight: 1,
  parcelLength: 12,
  parcelWidth: 12,
  parcelHeight: 6,
  parcelItemName: "default",
  expressInsuredValue: 0,
  vasTypes: [] as string[],
  collectFeeAmount: 0,
  defaultDeliverInstruction: null,
};

export function getSPXCredentialStatus() {
  const fields = {
    appId: Boolean(process.env.SPX_APP_ID),
    appSecret: Boolean(process.env.SPX_APP_SECRET),
    userId: Boolean(process.env.SPX_USER_ID),
    userSecret: Boolean(process.env.SPX_USER_SECRET),
  };

  return { ...fields, configured: Object.values(fields).every(Boolean) };
}

export async function getSPXSettings(tenantId = DEFAULT_TENANT_ID) {
  return prisma.carrierSettings.upsert({
    where: { tenantId_carrier: { tenantId, carrier: SPX_CARRIER } },
    update: {},
    create: { ...DEFAULT_SPX_SETTINGS, tenantId },
  });
}
