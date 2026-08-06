import { NextResponse } from "next/server";

// Haversine formula to compute spherical distance between two coordinates in kilometers
function getHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parent_id = searchParams.get("parent_id");
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");
  const radiusStr = searchParams.get("radius") || "1"; // Default 1km radius

  try {
    // If lat & lng are provided, perform spatial distance filtering
    if (latStr && lngStr) {
      const targetLat = parseFloat(latStr);
      const targetLng = parseFloat(lngStr);
      const radiusKm = parseFloat(radiusStr);

      const pid = parent_id || "-1";
      const res = await fetch(
        `https://app.swifthub.net/api/swifthub/locations?country=VN&parent_id=${pid}`,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        }
      );

      const json = await res.json();
      const rawList = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
        ? json
        : [];

      const matches = rawList
        .filter(
          (item: any) =>
            typeof item.latitude === "number" &&
            typeof item.longitude === "number"
        )
        .map((item: any) => {
          const distanceKm = getHaversineDistance(
            targetLat,
            targetLng,
            item.latitude,
            item.longitude
          );
          return {
            ...item,
            distanceKm: Math.round(distanceKm * 1000) / 1000,
          };
        })
        .filter((item: any) => item.distanceKm <= radiusKm)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm);

      return NextResponse.json({
        success: true,
        count: matches.length,
        radiusKm,
        target: { lat: targetLat, lng: targetLng },
        data: matches,
      });
    }

    // Default behavior by parent_id
    const pid = parent_id || "-1";
    const res = await fetch(
      `https://app.swifthub.net/api/swifthub/locations?country=VN&parent_id=${pid}`,
      {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching locations:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
