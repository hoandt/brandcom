import { prisma } from "@/lib/prisma";

export interface ApplyVoucherParams {
  tenantId: string;
  voucherId: string;
  customerId?: string | null;
  orderId: string;
  cartDiscount: number;
  shippingDiscount: number;
  idempotencyKey: string;
}

/**
 * Persists voucher usage and updates the order.
 * Safe against concurrent calls and double consumption.
 */
export async function applyVoucher({
  tenantId,
  voucherId,
  customerId,
  orderId,
  cartDiscount,
  shippingDiscount,
  idempotencyKey,
}: ApplyVoucherParams) {
  return await prisma.$transaction(async (tx) => {
    // 1. Idempotency check: check if this idempotencyKey has already been used
    const existingUsage = await tx.voucherUsage.findUnique({
      where: { idempotencyKey },
    });
    if (existingUsage) {
      return existingUsage;
    }

    // 2. Fetch the voucher details
    const voucher = await tx.voucher.findUnique({
      where: { id: voucherId },
    });
    if (!voucher) {
      throw new Error("Voucher not found");
    }

    // 3. Atomically check and increment consumedQuantity to prevent race conditions
    // If totalUsageLimit is reached, updatedCount.count will be 0.
    const updatedCount = await tx.voucher.updateMany({
      where: {
        id: voucherId,
        OR: [
          { totalUsageLimit: null },
          { consumedQuantity: { lt: voucher.totalUsageLimit ?? 0 } },
        ],
      },
      data: {
        consumedQuantity: { increment: 1 },
      },
    });

    if (updatedCount.count === 0) {
      throw new Error("VOUCHER_USAGE_LIMIT_REACHED");
    }

    // 4. Create the voucher usage record
    const usage = await tx.voucherUsage.create({
      data: {
        tenantId,
        voucherId,
        customerId: customerId || null,
        orderId,
        cartDiscount,
        shippingDiscount,
        totalDiscount: cartDiscount + shippingDiscount,
        status: "applied",
        idempotencyKey,
      },
    });

    // 5. Update order snapshot and recalculate final amount
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });
    if (!order) {
      throw new Error("Order not found");
    }

    const subtotal = Number(order.subtotal);
    const shippingFee = Number(order.shippingFee);
    const totalDiscount = cartDiscount + shippingDiscount;
    const totalAfterDiscount = Math.max(subtotal + shippingFee - totalDiscount, 0);

    await tx.order.update({
      where: { id: orderId },
      data: {
        voucherId,
        voucherCode: voucher.code,
        voucherName: voucher.name,
        cartDiscount,
        shippingDiscount,
        discount: totalDiscount,
        totalAmount: totalAfterDiscount,
      },
    });

    return usage;
  });
}

/**
 * Reverses a voucher usage when an order is cancelled or deleted.
 * Decrements the consumedQuantity and updates order totals.
 */
export async function reverseVoucherUsage({
  orderId,
}: {
  orderId: string;
}) {
  await prisma.$transaction(async (tx) => {
    const usages = await tx.voucherUsage.findMany({
      where: {
        orderId,
        status: "applied",
      },
    });

    for (const usage of usages) {
      await tx.voucherUsage.update({
        where: { id: usage.id },
        data: {
          status: "reversed",
          reversedAt: new Date(),
        },
      });

      await tx.voucher.update({
        where: { id: usage.voucherId },
        data: {
          consumedQuantity: { decrement: 1 },
        },
      });
    }

    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (order) {
      const subtotal = Number(order.subtotal);
      const shippingFee = Number(order.shippingFee);

      await tx.order.update({
        where: { id: orderId },
        data: {
          voucherId: null,
          voucherCode: null,
          voucherName: null,
          cartDiscount: 0,
          shippingDiscount: 0,
          discount: 0,
          totalAmount: subtotal + shippingFee,
        },
      });
    }
  });
}
