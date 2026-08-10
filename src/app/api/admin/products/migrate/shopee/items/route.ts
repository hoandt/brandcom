import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { fetchAllShopeeItems } from "@/lib/shopee-product-migration";

const requestSchema = z.object({ shopId: z.coerce.number().int().positive().safe() });

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "A valid shopId is required", details: parsed.error.flatten() }, { status: 422 });
    return NextResponse.json(await fetchAllShopeeItems(parsed.data.shopId));
  } catch (error) {
    console.error("[SHOPEE_ITEMS_FETCH_ERROR]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to fetch Shopee items" }, { status: 502 });
  }
}
