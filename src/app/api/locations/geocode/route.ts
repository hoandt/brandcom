import { NextResponse } from "next/server";
import { z } from "zod";
import { getStoreSettings } from "@/lib/store-settings";

const querySchema = z.object({
  province: z.string().trim().min(1).max(120),
  ward: z.string().trim().min(1).max(120),
});

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    province: url.searchParams.get("province"),
    ward: url.searchParams.get("ward"),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Province and ward are required" },
      { status: 400 }
    );
  }

  try {
    const settings = await getStoreSettings();
    const baseUrl = process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
    const searchUrl = new URL("search", `${baseUrl.replace(/\/$/, "")}/`);
    searchUrl.searchParams.set(
      "q",
      `${parsed.data.ward}, ${parsed.data.province}, Việt Nam`
    );
    searchUrl.searchParams.set("format", "jsonv2");
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("countrycodes", "vn");
    searchUrl.searchParams.set("accept-language", "vi,en");

    const contact = settings.supportEmail
      ? `mailto:${settings.supportEmail}`
      : process.env.NEXT_PUBLIC_APP_URL || "localhost";
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          process.env.NOMINATIM_USER_AGENT ||
          `${settings.storeName.replace(/[^A-Za-z0-9_-]/g, "") || "Store"}/1.0 (${contact})`,
      },
      next: { revalidate: 60 * 60 * 24 * 7 },
    });

    if (!response.ok) {
      throw new Error(`Nominatim search returned ${response.status}`);
    }

    const results = (await response.json()) as NominatimResult[];
    const result = results[0];
    const lat = Number(result?.lat);
    const lng = Number(result?.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json(
        { success: false, message: "No map position found for this ward" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { lat, lng, displayName: result.display_name || null },
    });
  } catch (error) {
    console.error("[LOCATION_GEOCODE]", error);
    return NextResponse.json(
      { success: false, message: "Failed to locate this address on the map" },
      { status: 502 }
    );
  }
}
