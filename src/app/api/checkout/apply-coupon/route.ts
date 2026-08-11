import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

interface VoucherBenefit {
  scope: "cart" | "shipping" | "payment";
  type: "fixed_amount" | "percentage" | "free_shipping";
  paymentMethod?: string;
  isAutomatic?: boolean;
  value?: number;
  maxDiscountAmount?: number;
  canCombine?: boolean;
}

const TENANT_ID = DEFAULT_TENANT_ID;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, subtotal, appliedCoupons = [] } = body;

    if (!code || typeof subtotal !== "number") {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 });
    }

    const MAX_COUPONS_PER_ORDER = 3;
    if (appliedCoupons.length >= MAX_COUPONS_PER_ORDER) {
      return NextResponse.json(
        { success: false, message: `You can only apply up to ${MAX_COUPONS_PER_ORDER} coupons per order` },
        { status: 400 }
      );
    }

    if (appliedCoupons.includes(code.toUpperCase())) {
      return NextResponse.json({ success: false, message: "Coupon is already applied" }, { status: 400 });
    }

    // Look up Voucher (created via /admin/discounts — uses the Voucher model)
    const voucher = await prisma.voucher.findFirst({
      where: {
        tenantId: TENANT_ID,
        code: code.toUpperCase(),
      },
    });

    if (!voucher) {
      return NextResponse.json({ success: false, message: "Invalid coupon code" }, { status: 404 });
    }

    if (voucher.status !== "active") {
      return NextResponse.json({ success: false, message: "This coupon is no longer active" }, { status: 400 });
    }

    const now = new Date();
    if (now < voucher.startsAt) {
      return NextResponse.json({ success: false, message: "This coupon is not yet valid" }, { status: 400 });
    }

    if (now > voucher.endsAt) {
      return NextResponse.json({ success: false, message: "This coupon has expired" }, { status: 400 });
    }

    if (voucher.totalUsageLimit !== null && voucher.consumedQuantity >= voucher.totalUsageLimit) {
      return NextResponse.json({ success: false, message: "This coupon has reached its usage limit" }, { status: 400 });
    }

    if (voucher.minimumCartSubtotal !== null && subtotal < (voucher.minimumCartSubtotal ?? 0)) {
      return NextResponse.json(
        {
          success: false,
          message: `Minimum order value of ${(voucher.minimumCartSubtotal ?? 0).toLocaleString()}đ required`,
        },
        { status: 400 }
      );
    }

    // Product-scoped validation
    if (voucher.productIds.length > 0) {
      const cartProductIds: string[] = body.cartProductIds || [];
      const hasQualifyingProduct = cartProductIds.some((pid: string) =>
        voucher.productIds.includes(pid)
      );
      if (!hasQualifyingProduct) {
        return NextResponse.json(
          { success: false, message: "This coupon is not applicable to items in your cart" },
          { status: 400 }
        );
      }
    }

    const benefit = voucher.benefit as unknown as VoucherBenefit;

    if (appliedCoupons.length > 0) {
      const normalizedAppliedCodes = appliedCoupons.map((appliedCode: string) =>
        appliedCode.toUpperCase()
      );
      const existingVouchers = await prisma.voucher.findMany({
        where: {
          tenantId: TENANT_ID,
          code: { in: normalizedAppliedCodes },
        },
        select: { code: true, benefit: true },
      });
      const allExistingVouchersCanCombine =
        existingVouchers.length === normalizedAppliedCodes.length &&
        existingVouchers.every((existingVoucher) => {
          const existingBenefit = existingVoucher.benefit as unknown as VoucherBenefit;
          return existingBenefit.canCombine === true;
        });

      if (benefit.canCombine !== true || !allExistingVouchersCanCombine) {
        return NextResponse.json(
          {
            success: false,
            message: "This voucher cannot be combined with the currently applied voucher(s)",
          },
          { status: 400 }
        );
      }
    }

    // Calculate discount amounts based on benefit
    let cartDiscountAmount = 0;
    let shippingDiscountAmount = 0;

    if (benefit.scope === "cart" || benefit.scope === "payment") {
      if (benefit.type === "fixed_amount") {
        cartDiscountAmount = Math.min(benefit.value ?? 0, subtotal);
      } else if (benefit.type === "percentage") {
        cartDiscountAmount = subtotal * ((benefit.value ?? 0) / 100);
        if (benefit.maxDiscountAmount) {
          cartDiscountAmount = Math.min(cartDiscountAmount, benefit.maxDiscountAmount);
        }
      }
    } else if (benefit.scope === "shipping") {
      if (benefit.type === "free_shipping") {
        shippingDiscountAmount = -1; // -1 = signal to frontend: apply free shipping
      } else if (benefit.type === "fixed_amount") {
        shippingDiscountAmount = benefit.value ?? 0;
      }
    }

    // Map benefit to legacy coupon type for frontend compatibility
    let couponType: string;
    if (benefit.scope === "shipping" && benefit.type === "free_shipping") {
      couponType = "FREE_SHIPPING";
    } else if (benefit.scope === "shipping" && benefit.type === "fixed_amount") {
      couponType = "SHIPPING_FIXED";
    } else if (benefit.type === "percentage") {
      couponType = "PERCENTAGE";
    } else {
      couponType = "FIXED";
    }

    return NextResponse.json(
      {
        success: true,
        coupon: {
          id: voucher.id,
          code: voucher.code,
          name: voucher.name,
          type: couponType,
          value: benefit.value ?? 0,
          scope: benefit.scope,
          benefitType: benefit.type,
          canCombine: benefit.canCombine === true,
          productIds: voucher.productIds,
        },
        discountAmount: cartDiscountAmount,
        shippingDiscountAmount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
  }
}
