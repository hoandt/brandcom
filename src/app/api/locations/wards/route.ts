import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const province_id = searchParams.get("province_id");

  if (!province_id) {
    return NextResponse.json({ success: false, message: "province_id is required" }, { status: 400 });
  }

  try {
    const distRes = await fetch(
      `https://app.swifthub.net/api/swifthub/locations?country=VN&parent_id=${province_id}`
    );
    const distJson = await distRes.json();
    const locations = Array.isArray(distJson.data) ? distJson.data : Array.isArray(distJson) ? distJson : [];

    // If the returned locations are already level 2 (wards), return them directly
    const isWards = locations.length > 0 && locations[0].level === 2;
    if (isWards) {
      return NextResponse.json({ success: true, data: locations });
    }

    const wardPromises = locations.map(async (dist: any) => {
      const wardRes = await fetch(
        `https://app.swifthub.net/api/swifthub/locations?country=VN&parent_id=${dist.location_id}`
      );
      const wardJson = await wardRes.json();
      const wards = Array.isArray(wardJson.data) ? wardJson.data : Array.isArray(wardJson) ? wardJson : [];
      return wards;
    });

    const wardsArrays = await Promise.all(wardPromises);
    const allWards = wardsArrays.flat();

    return NextResponse.json({ success: true, data: allWards });
  } catch (error) {
    console.error("Error fetching wards:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch wards" }, { status: 500 });
  }
}
