import { NextResponse } from "next/server";
import { getStoreSettings } from "@/lib/store-settings";
import { omitShippingMappings } from "@/lib/location-sanitizer";

type LocationRecord = {
  location_id: string;
  name: string;
  parent_id?: string;
  level?: number;
};

type NominatimAddress = {
  suburb?: string;
  quarter?: string;
  city_district?: string;
  municipality?: string;
  town?: string;
  village?: string;
  city?: string;
  state?: string;
  province?: string;
  region?: string;
};

type NominatimResult = {
  display_name?: string;
  address?: NominatimAddress;
};

type SwifthubReverseResult = {
  found?: boolean;
  data?: {
    name?: string;
    province?: string;
  };
};

function normalizeText(value?: string): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/^(tinh|thanh pho|thu do|tp|quan|huyen|thi xa|phuong|xa|thi tran)\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function namesMatch(left?: string, right?: string): boolean {
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;

  return (
    Math.min(normalizedLeft.length, normalizedRight.length) >= 4 &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
  );
}

function extractLocations(payload: unknown): LocationRecord[] {
  if (Array.isArray(payload)) return payload as LocationRecord[];
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: LocationRecord[] }).data;
  }
  return [];
}

async function fetchLocations(parentId: string): Promise<LocationRecord[]> {
  const response = await fetch(
    `https://app.swifthub.net/api/swifthub/locations?country=VN&parent_id=${encodeURIComponent(parentId)}`,
    { next: { revalidate: 24 * 60 * 60 } }
  );
  if (!response.ok) throw new Error(`Swifthub locations API status ${response.status}`);
  return extractLocations(await response.json());
}

function getOsmWardName(address?: NominatimAddress): string | undefined {
  const candidates = [
    address?.suburb,
    address?.quarter,
    address?.city_district,
    address?.municipality,
    address?.town,
    address?.village,
  ].filter((value): value is string => Boolean(value));

  return (
    candidates.find((value) => /^(phường|xã|thị trấn)\s/i.test(value)) ||
    candidates[0]
  );
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return NextResponse.json(
      { success: false, message: "Valid lat and lng parameters are required" },
      { status: 400 }
    );
  }

  try {
    const settings = await getStoreSettings();
    const nominatimBaseUrl =
      process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org";
    const nominatimUrl = new URL("reverse", `${nominatimBaseUrl.replace(/\/$/, "")}/`);
    nominatimUrl.searchParams.set("lat", String(lat));
    nominatimUrl.searchParams.set("lon", String(lng));
    nominatimUrl.searchParams.set("format", "jsonv2");
    nominatimUrl.searchParams.set("zoom", "18");
    nominatimUrl.searchParams.set("addressdetails", "1");
    nominatimUrl.searchParams.set("accept-language", "vi,en");

    const contact = settings.supportEmail
      ? `mailto:${settings.supportEmail}`
      : process.env.NEXT_PUBLIC_APP_URL || "localhost";
    const userAgent =
      process.env.NOMINATIM_USER_AGENT ||
      `${settings.storeName.replace(/[^A-Za-z0-9_-]/g, "") || "Store"}/1.0 (${contact})`;

    const [osmResult, swifthubResult] = await Promise.allSettled([
      fetch(nominatimUrl, {
        headers: { Accept: "application/json", "User-Agent": userAgent },
        next: { revalidate: 24 * 60 * 60 },
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Nominatim reverse API status ${response.status}`);
        return (await response.json()) as NominatimResult;
      }),
      fetch(
        `https://app.swifthub.net/api/reverse?lat=${encodeURIComponent(String(lat))}&lng=${encodeURIComponent(String(lng))}`,
        { headers: { Accept: "application/json" } }
      ).then(async (response) => {
        if (!response.ok) throw new Error(`Swifthub reverse API status ${response.status}`);
        return (await response.json()) as SwifthubReverseResult;
      }),
    ]);

    const osm = osmResult.status === "fulfilled" ? osmResult.value : null;
    const swifthub =
      swifthubResult.status === "fulfilled" && swifthubResult.value.found
        ? swifthubResult.value.data
        : null;

    const wardNameRaw = getOsmWardName(osm?.address) || swifthub?.name;
    const provinceCandidates = [
      osm?.address?.state,
      osm?.address?.province,
      osm?.address?.region,
      swifthub?.province,
      osm?.address?.city,
      osm?.display_name,
    ].filter((value): value is string => Boolean(value));

    if (!wardNameRaw || provinceCandidates.length === 0) {
      return NextResponse.json({
        success: false,
        message: "No location found for coordinates",
      });
    }

    const provinces = await fetchLocations("-1");
    const matchedProvince = provinces.find((province) =>
      provinceCandidates.some((candidate) => namesMatch(province.name, candidate))
    );

    let matchedDistrict: LocationRecord | null = null;
    let matchedWard: LocationRecord | null = null;

    if (matchedProvince) {
      const provinceChildren = await fetchLocations(matchedProvince.location_id);
      const childrenAreWards =
        provinceChildren.length > 0 && provinceChildren[0].level === 2;

      if (childrenAreWards) {
        matchedWard =
          provinceChildren.find((ward) => namesMatch(ward.name, wardNameRaw)) || null;
      } else {
        const districtsWithWards = await Promise.all(
          provinceChildren.map(async (district) => {
            try {
              return { district, wards: await fetchLocations(district.location_id) };
            } catch {
              return { district, wards: [] as LocationRecord[] };
            }
          })
        );

        for (const item of districtsWithWards) {
          const ward = item.wards.find((candidate) =>
            namesMatch(candidate.name, wardNameRaw)
          );
          if (ward) {
            matchedDistrict = item.district;
            matchedWard = ward;
            break;
          }
        }
      }
    }

    const provinceNameRaw = matchedProvince?.name || provinceCandidates[0];
    const finalProvince = matchedProvince || {
      location_id: "0",
      name: provinceNameRaw,
      parent_id: "-1",
      level: 0,
    };
    const finalDistrict = matchedDistrict || {
      location_id: finalProvince.location_id,
      name: finalProvince.name,
      parent_id: finalProvince.location_id,
      level: 1,
    };
    const finalWard = matchedWard || {
      location_id: "0",
      name: wardNameRaw,
      parent_id: finalDistrict.location_id,
      level: 2,
    };

    return NextResponse.json({
      success: true,
      data: {
        provinceName: finalProvince.name,
        wardName: finalWard.name,
        province: omitShippingMappings(finalProvince),
        district: omitShippingMappings(finalDistrict),
        ward: omitShippingMappings(finalWard),
        source: osm ? "osm" : "swifthub",
      },
    });
  } catch (error) {
    console.error("Error resolving reverse-geocoded location:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reverse geocode" },
      { status: 502 }
    );
  }
}
