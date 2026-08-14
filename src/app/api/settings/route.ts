import { NextResponse } from "next/server";
import { DEFAULT_TENANT_ID, getStoreSettings } from "@/lib/store-settings";
import { noStoreHeaders, publicCacheHeaders } from "@/lib/storefront-cache";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    if (fresh) {
      const settings = await prisma.storeSettings.findUnique({ where: { tenantId: DEFAULT_TENANT_ID } })
        ?? await getStoreSettings();
      return NextResponse.json({ settings }, { headers: noStoreHeaders });
    }
    const settings = await getStoreSettings();
    const data = { settings };

    return NextResponse.json(data, {
      headers: publicCacheHeaders(settings.storeSettingsCacheSeconds),
    });
  } catch (error) {
    console.error("[PUBLIC_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to load store settings" }, { status: 500 });
  }
}
