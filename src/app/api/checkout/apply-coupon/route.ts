import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, subtotal, appliedCoupons = [] } = body;

    if (!code || typeof subtotal !== "number") {
      return NextResponse.json({ success: false, message: "Invalid request data" }, { status: 400 });
    }

    const MAX_COUPONS_PER_ORDER = 3;
    if (appliedCoupons.length >= MAX_COUPONS_PER_ORDER) {
      return NextResponse.json({ success: false, message: `You can only apply up to ${MAX_COUPONS_PER_ORDER} coupons per order` }, { status: 400 });
    }
    
    if (appliedCoupons.includes(code.toUpperCase())) {
      return NextResponse.json({ success: false, message: "Coupon is already applied" }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return NextResponse.json({ success: false, message: "Invalid coupon code" }, { status: 404 });
    }

    if (!coupon.isActive) {
      return NextResponse.json({ success: false, message: "This coupon is no longer active" }, { status: 400 });
    }

    if (coupon.validFrom && new Date() < coupon.validFrom) {
      return NextResponse.json({ success: false, message: "This coupon is not yet valid" }, { status: 400 });
    }

    if (coupon.validTo && new Date() > coupon.validTo) {
      return NextResponse.json({ success: false, message: "This coupon has expired" }, { status: 400 });
    }

    if (coupon.maxUsage !== null && coupon.usedCount >= coupon.maxUsage) {
      return NextResponse.json({ success: false, message: "This coupon has reached its usage limit" }, { status: 400 });
    }

    if (coupon.minOrderValue !== null && subtotal < Number(coupon.minOrderValue)) {
      return NextResponse.json({ success: false, message: `Minimum order value of $${coupon.minOrderValue} required` }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmount = 0;
    const valueNum = Number(coupon.value);
    
    if (coupon.type === "PERCENTAGE") {
      discountAmount = subtotal * (valueNum / 100);
    } else if (coupon.type === "FIXED") {
      discountAmount = valueNum;
      // Ensure discount doesn't exceed subtotal
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }
    } else if (coupon.type === "FREE_SHIPPING") {
      // Free shipping discount is handled by the frontend by setting shipping to 0
      discountAmount = 0;
    }

    return NextResponse.json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: valueNum,
      },
      discountAmount,
    }, { status: 200 });

  } catch (error) {
    console.error("Apply Coupon Error:", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
