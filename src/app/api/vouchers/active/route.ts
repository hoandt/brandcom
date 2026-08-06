import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Public endpoint: GET /api/vouchers/active?productId=xxx
 * Returns currently valid, public vouchers for storefront display.
 * Optionally filters by productId (vouchers scoped to that product or all-product vouchers).
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    const now = new Date();

    const vouchers = await prisma.voucher.findMany({
      where: {
        status: "active",
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        benefit: true,
        minimumCartSubtotal: true,
        endsAt: true,
        productIds: true,
        totalUsageLimit: true,
        consumedQuantity: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const filtered = vouchers
      .filter((v) => {
        if (v.totalUsageLimit !== null && v.consumedQuantity >= v.totalUsageLimit) {
          return false;
        }
        return true;
      })
      .filter((v) => {
        // If voucher has no product scope, it applies to all products
        if (!v.productIds || v.productIds.length === 0) return true;
        // If productId is provided, only include vouchers that scope to it
        if (productId) return v.productIds.includes(productId);
        // If no productId filter, include all
        return true;
      })
      .map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        description: v.description,
        benefit: typeof v.benefit === "string" ? JSON.parse(v.benefit) : v.benefit,
        minimumCartSubtotal: v.minimumCartSubtotal,
        endsAt: v.endsAt.toISOString(),
      }));

    return NextResponse.json({ vouchers: filtered });
  } catch (error) {
    console.error("Error fetching active vouchers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
