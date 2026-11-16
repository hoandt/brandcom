import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { invalidateStorefrontCache } from "@/lib/storefront-cache";
import { invalidateStoreSettingsCache } from "@/lib/store-settings";
import { invalidateDynamicComponentCache } from "@/lib/dynamic-components";
import { invalidateProductsListCache } from "../../products/route";
import { invalidateAdminProductCache } from "../../products/[productId]/route";

export async function POST() {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  invalidateStorefrontCache();
  invalidateStoreSettingsCache();
  invalidateDynamicComponentCache();
  invalidateProductsListCache();
  invalidateAdminProductCache();
  revalidatePath("/", "layout");
  revalidateTag("products");

  return NextResponse.json({ ok: true, clearedAt: new Date().toISOString() });
}
