import { NextResponse } from "next/server";
import { applyVoucher, reverseVoucherUsage } from "@/lib/voucher/persistence";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json().catch(() => ({}));
    const headerTenantId = req.headers.get("x-tenant-id");
    const tenantId = body.tenantId || headerTenantId || DEFAULT_TENANT_ID;

    const { voucherId, customerId, cartDiscount, shippingDiscount, idempotencyKey } = body;

    if (!voucherId || cartDiscount === undefined || shippingDiscount === undefined || !idempotencyKey) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const usage = await applyVoucher({
      tenantId,
      voucherId,
      customerId: customerId || null,
      orderId,
      cartDiscount: Number(cartDiscount),
      shippingDiscount: Number(shippingDiscount),
      idempotencyKey,
    });

    return NextResponse.json({ success: true, usage });
  } catch (error: any) {
    console.error("Error applying voucher:", error);
    if (error.message === "VOUCHER_USAGE_LIMIT_REACHED") {
      return NextResponse.json({ error: "VOUCHER_USAGE_LIMIT_REACHED" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    await reverseVoucherUsage({ orderId });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reversing voucher usage:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
