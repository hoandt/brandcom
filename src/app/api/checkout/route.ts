import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { auth } from "@/auth";
import { allocateInventory } from "@/lib/inventory";
import { getStoreSettings } from "@/lib/store-settings";
import { sendNewOrderNotification } from "@/lib/order-notification";

const checkoutSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerPhone: z.string().min(1, "Phone number is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  location: z
    .object({
      province: z.any().optional(),
      district: z.any().optional(),
      ward: z.any().optional(),
    })
    .optional(),
  shippingCarrier: z.string().optional(),
  shippingParams: z.record(z.any()).optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  subtotal: z.number().min(0),
  shippingFee: z.number().min(0),
  discount: z.number().min(0).optional().default(0),
  totalAmount: z.number().min(0),
  couponCodes: z.array(z.string()).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string(),
        sku: z.string(),
        productName: z.string(),
        variantName: z.string().optional(),
        price: z.number().min(0),
        quantity: z.number().min(1),
      })
    )
    .min(1, "At least one item is required"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate the incoming request body
    const validatedData = checkoutSchema.parse(body);

    // Get session to attach userId if logged in
    const session = await auth();
    let userId: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true }
      });
      if (user) userId = user.id;
    }

    // Generate a unique order number
    const storeSettings = await getStoreSettings();
    const orderNumber = `${storeSettings.orderPrefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const TENANT_ID = storeSettings.tenantId;
    let finalDiscount = 0;
    let finalShippingFee = validatedData.shippingFee;
    let finalTotalAmount = validatedData.subtotal + finalShippingFee;
    const validVoucherIds: string[] = [];
    const voucherCombinationFlags: boolean[] = [];
    let appliedVoucherCode: string | null = null;
    let appliedVoucherName: string | null = null;

    // Validate vouchers (created via /admin/discounts) if provided
    if (validatedData.couponCodes && validatedData.couponCodes.length > 0) {
      const MAX_COUPONS_PER_ORDER = 3;
      const normalizedCouponCodes = validatedData.couponCodes.map((code) =>
        code.trim().toUpperCase()
      );
      if (normalizedCouponCodes.length > MAX_COUPONS_PER_ORDER) {
        return NextResponse.json({ success: false, message: `Maximum ${MAX_COUPONS_PER_ORDER} coupons allowed` }, { status: 400 });
      }
      if (new Set(normalizedCouponCodes).size !== normalizedCouponCodes.length) {
        return NextResponse.json(
          { success: false, message: "The same voucher cannot be applied more than once" },
          { status: 400 }
        );
      }

      for (const code of normalizedCouponCodes) {
        const voucher = await prisma.voucher.findFirst({
          where: { tenantId: TENANT_ID, code: code.toUpperCase() },
        });

        const now = new Date();
        if (
          !voucher ||
          voucher.status !== "active" ||
          now < voucher.startsAt ||
          now > voucher.endsAt ||
          (voucher.totalUsageLimit !== null && voucher.consumedQuantity >= voucher.totalUsageLimit) ||
          (voucher.minimumCartSubtotal !== null && validatedData.subtotal < voucher.minimumCartSubtotal)
        ) {
          return NextResponse.json({ success: false, message: `Invalid or expired coupon: ${code}` }, { status: 400 });
        }

        validVoucherIds.push(voucher.id);
        appliedVoucherCode = voucher.code;
        appliedVoucherName = voucher.name;

        const benefit = voucher.benefit as {
          scope: "cart" | "shipping";
          type: "fixed_amount" | "percentage" | "free_shipping";
          value?: number;
          maxDiscountAmount?: number;
          canCombine?: boolean;
        };
        voucherCombinationFlags.push(benefit.canCombine === true);

        if (benefit.scope === "cart") {
          if (benefit.type === "fixed_amount") {
            finalDiscount += Math.min(benefit.value ?? 0, validatedData.subtotal);
          } else if (benefit.type === "percentage") {
            let disc = validatedData.subtotal * ((benefit.value ?? 0) / 100);
            if (benefit.maxDiscountAmount) disc = Math.min(disc, benefit.maxDiscountAmount);
            finalDiscount += disc;
          }
        } else if (benefit.scope === "shipping") {
          if (benefit.type === "free_shipping") {
            finalShippingFee = 0;
          } else if (benefit.type === "fixed_amount") {
            finalShippingFee = Math.max(0, finalShippingFee - (benefit.value ?? 0));
          }
        }
      }

      if (
        normalizedCouponCodes.length > 1 &&
        voucherCombinationFlags.some((canCombine) => !canCombine)
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "One or more selected vouchers cannot be combined",
          },
          { status: 400 }
        );
      }

      // Cap discount to subtotal
      if (finalDiscount > validatedData.subtotal) finalDiscount = validatedData.subtotal;
    }

    // Apply automatic payment method discounts created via /admin/discounts (scope: "payment")
    const isCod = validatedData.paymentMethod === "Cash on Delivery" || validatedData.paymentMethod === "COD";
    const now = new Date();

    const activeVouchers = await prisma.voucher.findMany({
      where: {
        tenantId: TENANT_ID,
        status: "active",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });

    const matchingPaymentVoucher = activeVouchers.find((v) => {
      const b = v.benefit as any;
      if (!b || b.scope !== "payment") return false;
      if (b.isAutomatic === false) return false;
      if (v.totalUsageLimit !== null && v.consumedQuantity >= v.totalUsageLimit) return false;
      if (v.minimumCartSubtotal !== null && validatedData.subtotal < v.minimumCartSubtotal) return false;

      const pm = b.paymentMethod || "all_online";
      if (pm === "all_online") return !isCod;
      if (pm === "cod") return isCod;
      if (pm === "vnpay") return validatedData.paymentMethod === "VNPAY" || !isCod;
      return true;
    });

    if (matchingPaymentVoucher) {
      const b = matchingPaymentVoucher.benefit as any;
      let pmDisc = 0;
      if (b.type === "percentage") {
        pmDisc = Math.round((validatedData.subtotal * (b.value || 0)) / 100);
        if (b.maxDiscountAmount) pmDisc = Math.min(pmDisc, b.maxDiscountAmount);
      } else if (b.type === "fixed_amount") {
        pmDisc = Math.min(validatedData.subtotal, b.value || 0);
      }
      finalDiscount += pmDisc;
    }

    if (finalDiscount > validatedData.subtotal) finalDiscount = validatedData.subtotal;

    finalTotalAmount = validatedData.subtotal + finalShippingFee - finalDiscount;
    if (finalTotalAmount < 0) finalTotalAmount = 0;

    // Execute checkout inside a single atomic Prisma transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Atomically allocate stock from active pickup warehouses.
      const itemAllocations: { item: (typeof validatedData.items)[number]; allocations: { warehouseId: string; quantity: number }[] }[] = [];
      for (const item of validatedData.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, name: true }
        });

        if (!variant) {
          throw new Error(`Variant not found: ${item.variantId}`);
        }

        try {
          const allocations = await allocateInventory(tx, item.variantId, item.quantity);
          itemAllocations.push({ item, allocations });
        } catch (error) {
          throw new Error(`${item.productName} (${variant.name}): ${error instanceof Error ? error.message : "Insufficient inventory"}`);
        }
      }

      // 2. Extract shipping location and parameters, then create the order.
      const locationName = (val: unknown) =>
        typeof val === "string"
          ? val.trim()
          : (val as { name?: unknown } | null | undefined)?.name &&
              typeof (val as { name: string }).name === "string"
            ? (val as { name: string }).name.trim()
            : null;

      const province = locationName(validatedData.location?.province);
      const district = locationName(validatedData.location?.district);
      const ward = locationName(validatedData.location?.ward);

      const defaultShippingParams = {
        carrier: validatedData.shippingCarrier || "SPX Express",
        location: validatedData.location,
        address: validatedData.address,
        province,
        district,
        ward,
        recipient: {
          name: validatedData.customerName,
          phone: validatedData.customerPhone,
        },
        paymentMethod: validatedData.paymentMethod,
        isCod: validatedData.paymentMethod === "Cash on Delivery",
        codAmount: finalTotalAmount,
      };

      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          customerName: validatedData.customerName,
          customerPhone: validatedData.customerPhone,
          customerEmail: validatedData.customerEmail,
          address: validatedData.address,
          province,
          district,
          ward,
          shippingCarrier: validatedData.shippingCarrier || "SPX Express",
          shippingParams: (validatedData.shippingParams || defaultShippingParams) as any,
          subtotal: validatedData.subtotal,
          shippingFee: finalShippingFee,
          discount: finalDiscount,
          totalAmount: finalTotalAmount,
          paymentMethod: validatedData.paymentMethod,
          paymentStatus: "PENDING",
          orderStatus: "PROCESSING",
          voucherCode: appliedVoucherCode,
          voucherName: appliedVoucherName,
          cartDiscount: finalDiscount,
        },
      });

      for (const { item, allocations } of itemAllocations) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            variantId: item.variantId,
            sku: item.sku,
            productName: item.productName,
            variantName: item.variantName,
            price: item.price,
            quantity: item.quantity,
          },
        });
        await tx.orderItemInventoryAllocation.createMany({
          data: allocations.map((allocation) => ({ ...allocation, orderItemId: orderItem.id })),
        });
      }

      // 3. Increment voucher consumedQuantity
      if (validVoucherIds.length > 0) {
        await tx.voucher.updateMany({
          where: { id: { in: validVoucherIds } },
          data: { consumedQuantity: { increment: 1 } },
        });
      }

      return newOrder;
    });

    // Send email notification asynchronously without blocking customer response
    sendNewOrderNotification(order.id, storeSettings.currency).catch((err) =>
      console.error("[ORDER_EMAIL] Async notification error:", err)
    );

    return NextResponse.json({ success: true, orderId: order.id, orderNumber: order.orderNumber }, { status: 201 });
  } catch (error: unknown) {
    console.error("Checkout Error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 400 }
    );
  }
}
