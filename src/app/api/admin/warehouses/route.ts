import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";

async function isAdmin() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ warehouses });
  } catch (error) {
    console.error("[WAREHOUSES_GET]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load warehouses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
  const data = await req.json();
  if (!data.name || !data.code || !data.contactName || !data.phone || !data.address || !data.provinceId || !data.wardId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const existing = await prisma.warehouse.findUnique({ where: { code: data.code.trim() } });
  if (existing) return NextResponse.json({ error: "Warehouse code already exists" }, { status: 409 });

  const count = await prisma.warehouse.count();
  const makeDefault = Boolean(data.isDefault) || count === 0;
  const warehouse = await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.warehouse.updateMany({ data: { isDefault: false } });
    return tx.warehouse.create({
      data: {
        name: data.name.trim(), code: data.code.trim(), contactName: data.contactName.trim(),
        phone: data.phone.trim(), address: data.address.trim(), provinceId: data.provinceId,
        provinceName: data.provinceName, districtId: data.districtId || "",
        districtName: data.districtName || "", wardId: data.wardId, wardName: data.wardName,
        spxProvince: data.spxMapping?.province || null, spxDistrict: data.spxMapping?.district || null,
        spxWard: data.spxMapping?.ward || null,
        latitude: data.latitude ?? null, longitude: data.longitude ?? null,
        isDefault: makeDefault, isActive: data.isActive ?? true,
        isPickup: data.isPickup ?? true, isReturn: data.isReturn ?? true,
      },
    });
  });
  return NextResponse.json({ warehouse }, { status: 201 });
  } catch (error) {
    console.error("[WAREHOUSE_CREATE]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create warehouse" }, { status: 500 });
  }
}
