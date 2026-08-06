import { prisma } from "@/lib/prisma";
import type { Voucher, VoucherUsage } from "@/generated/prisma/client";
import type { VoucherBenefit } from "./calculator";

export type ValidationError =
  | "VOUCHER_NOT_FOUND"
  | "VOUCHER_NOT_ACTIVE"
  | "VOUCHER_NOT_STARTED"
  | "VOUCHER_EXPIRED"
  | "MINIMUM_CART_SUBTOTAL_NOT_MET"
  | "VOUCHER_USAGE_LIMIT_REACHED"
  | "CUSTOMER_USAGE_LIMIT_REACHED"
  | "ORDER_ALREADY_HAS_VOUCHER";

export interface ValidateVoucherParams {
  tenantId: string;
  code: string;
  cartSubtotal: number; // in cents
  customerId?: string | null;
  orderId?: string | null;
  // We can pass an existing voucher to avoid querying again
  voucher?: any;
}

export interface ValidationResult {
  valid: boolean;
  error?: ValidationError;
  voucher?: any;
}

/**
 * Validates a voucher against the specified rules in order.
 */
export async function validateVoucher({
  tenantId,
  code,
  cartSubtotal,
  customerId,
  orderId,
  voucher: passedVoucher,
}: ValidateVoucherParams): Promise<ValidationResult> {
  const normalizedCode = code.trim().toUpperCase();

  let voucher = passedVoucher;
  if (!voucher) {
    // 1. Voucher belongs to current tenant & 2. Voucher exists
    // Case-insensitive lookup (normalized using uppercase in db or exact match since we uppercase code)
    voucher = await prisma.voucher.findFirst({
      where: {
        tenantId,
        code: normalizedCode,
      },
    });
  } else if (voucher.tenantId !== tenantId || voucher.code.toUpperCase() !== normalizedCode) {
    return { valid: false, error: "VOUCHER_NOT_FOUND" };
  }

  if (!voucher) {
    return { valid: false, error: "VOUCHER_NOT_FOUND" };
  }

  // 3. Voucher status is active
  if (voucher.status !== "active") {
    return { valid: false, error: "VOUCHER_NOT_ACTIVE" };
  }

  const now = new Date();

  // 4. Current UTC time is >= startsAt
  if (now < new Date(voucher.startsAt)) {
    return { valid: false, error: "VOUCHER_NOT_STARTED" };
  }

  // 5. Current UTC time is <= endsAt
  if (now > new Date(voucher.endsAt)) {
    return { valid: false, error: "VOUCHER_EXPIRED" };
  }

  // 6. Cart subtotal meets minimumCartSubtotal
  if (
    voucher.minimumCartSubtotal !== null &&
    voucher.minimumCartSubtotal !== undefined &&
    cartSubtotal < voucher.minimumCartSubtotal
  ) {
    return { valid: false, error: "MINIMUM_CART_SUBTOTAL_NOT_MET" };
  }

  // 7. Total usage limit has not been reached
  if (
    voucher.totalUsageLimit !== null &&
    voucher.totalUsageLimit !== undefined &&
    voucher.consumedQuantity >= voucher.totalUsageLimit
  ) {
    return { valid: false, error: "VOUCHER_USAGE_LIMIT_REACHED" };
  }

  // 8. Per-customer usage limit has not been reached
  if (
    voucher.usagePerCustomer !== null &&
    voucher.usagePerCustomer !== undefined &&
    customerId
  ) {
    const customerUsageCount = await prisma.voucherUsage.count({
      where: {
        voucherId: voucher.id,
        customerId,
        status: "applied",
      },
    });

    if (customerUsageCount >= voucher.usagePerCustomer) {
      return { valid: false, error: "CUSTOMER_USAGE_LIMIT_REACHED" };
    }
  }

  // 9. The order does not already have another voucher
  if (orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { voucherId: true },
    });

    if (order && order.voucherId) {
      return { valid: false, error: "ORDER_ALREADY_HAS_VOUCHER" };
    }
  }

  return {
    valid: true,
    voucher,
  };
}
