import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-settings";
import { publicCacheHeaders, storefrontCache } from "@/lib/storefront-cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const settings = await getStoreSettings();
    const products = await storefrontCache(`collection:${slug}`, settings.collectionCacheSeconds, () =>
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
      })
    );

    return NextResponse.json(
      { success: true, data: products, currency: settings.currency, cacheSeconds: settings.collectionCacheSeconds },
      { headers: publicCacheHeaders(settings.collectionCacheSeconds) },
    );
    
  } catch (error) {
    console.error("[COLLECTIONS_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
