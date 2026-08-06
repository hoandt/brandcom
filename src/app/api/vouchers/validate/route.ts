import { NextResponse } from "next/server";
import { validateVoucher } from "@/lib/voucher/validator";
import { calculateDiscount } from "@/lib/voucher/calculator";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const headerTenantId = req.headers.get("x-tenant-id");
    const tenantId = body.tenantId || headerTenantId || DEFAULT_TENANT_ID;

    const { code, customerId, cartSubtotal, shippingFee } = body;

    if (!code || cartSubtotal === undefined || shippingFee === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validationResult = await validateVoucher({
      tenantId,
      code,
      cartSubtotal: Number(cartSubtotal),
      customerId: customerId || null,
    });

    if (!validationResult.valid) {
      return NextResponse.json({
        valid: false,
        error: validationResult.error,
      });
    }

    const voucher = validationResult.voucher;

    // We parse the benefit JSON from DB
    const benefit = typeof voucher.benefit === "string"
      ? JSON.parse(voucher.benefit)
      : voucher.benefit;

    const discountResult = calculateDiscount({
      benefit,
      cartSubtotal: Number(cartSubtotal),
      shippingFee: Number(shippingFee),
    });

    return NextResponse.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        name: voucher.name,
      },
      discount: {
        cartDiscount: discountResult.cartDiscount,
        shippingDiscount: discountResult.shippingDiscount,
        totalDiscount: discountResult.totalDiscount,
      },
      totals: {
        cartSubtotal: Number(cartSubtotal),
        shippingFee: Number(shippingFee),
        totalBeforeDiscount: discountResult.totalBeforeDiscount,
        totalAfterDiscount: discountResult.totalAfterDiscount,
      },
    });
  } catch (error) {
    console.error("Voucher validation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
