import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { fetchShopeeModels, suggestShopeeMappings } from "@/lib/shopee-product-migration";

const requestSchema = z.object({
  itemId: z.coerce.number().int().positive().safe(),
  shopId: z.coerce.number().int().positive().safe(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Valid itemId and shopId are required", details: parsed.error.flatten() }, { status: 422 });
    const result = await fetchShopeeModels(parsed.data.itemId, parsed.data.shopId);
    return NextResponse.json({ ...result, suggestedMappings: suggestShopeeMappings(result.columns) });
  } catch (error) {
    console.error("[SHOPEE_MIGRATION_PREVIEW_ERROR]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to fetch Shopee product" }, { status: 502 });
  }
}
