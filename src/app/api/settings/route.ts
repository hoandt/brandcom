import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-settings";

export async function GET() {
  try {
    const settings = await getStoreSettings();
    return NextResponse.json({ settings }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[PUBLIC_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to load store settings" }, { status: 500 });
  }
}
