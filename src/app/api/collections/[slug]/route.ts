import { NextResponse } from "next/server";
import { getCollectionProducts } from "@/lib/storefront-collections";
import { publicCacheHeaders } from "@/lib/storefront-cache";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { products, currency, cacheSeconds } = await getCollectionProducts(slug);

    return NextResponse.json(
      { success: true, data: products, currency, cacheSeconds },
      { headers: publicCacheHeaders(cacheSeconds) },
    );
  } catch (error) {
    console.error("[COLLECTIONS_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
