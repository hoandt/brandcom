import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const [products, storeSettings] = await Promise.all([
      prisma.product.findMany({
        where: { status: "ACTIVE" },
        include: {
          variants: { where: { isActive: true }, orderBy: { price: "asc" } },
          images: { orderBy: { position: "asc" }, take: 2 },
          categories: { where: { isActive: true }, orderBy: [{ position: "asc" }, { name: "asc" }], take: 1 },
          reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        },
        orderBy: { createdAt: "desc" },
        ...(slug === "new" ? { take: 24 } : {}),
      }),
      prisma.storeSettings.findFirst({ select: { currency: true } }),
    ]);

    return NextResponse.json({ success: true, data: products, currency: storeSettings?.currency });
    
  } catch (error) {
    console.error("[COLLECTIONS_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
