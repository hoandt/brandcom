import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-settings";

let settingsCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidatePublicSettingsCache() {
  settingsCache = null;
}

export async function GET() {
  try {
    if (settingsCache && Date.now() - settingsCache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(settingsCache.data, {
        headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
      });
    }

    const settings = await getStoreSettings();
    const data = { settings };
    settingsCache = { data, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("[PUBLIC_SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to load store settings" }, { status: 500 });
  }
}
