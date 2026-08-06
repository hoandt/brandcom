import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-access";

async function authorized() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function PUT(req: Request, { params }: { params: Promise<{ warehouseId: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
  const { warehouseId } = await params;
  const data = await req.json();
  const current = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!current) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
  const duplicate = await prisma.warehouse.findFirst({
    where: { code: data.code.trim(), id: { not: warehouseId } },
  });
  if (duplicate) return NextResponse.json({ error: "Warehouse code already exists" }, { status: 409 });

  const warehouse = await prisma.$transaction(async (tx) => {
    if (data.isDefault) await tx.warehouse.updateMany({ where: { id: { not: warehouseId } }, data: { isDefault: false } });
    return tx.warehouse.update({
      where: { id: warehouseId },
      data: {
        name: data.name.trim(), code: data.code.trim(), contactName: data.contactName.trim(),
        phone: data.phone.trim(), address: data.address.trim(), provinceId: data.provinceId,
        provinceName: data.provinceName, districtId: data.districtId || "",
        districtName: data.districtName || "", wardId: data.wardId, wardName: data.wardName,
        spxProvince: data.spxMapping?.province ?? current.spxProvince,
        spxDistrict: data.spxMapping?.district ?? current.spxDistrict,
        spxWard: data.spxMapping?.ward ?? current.spxWard,
        latitude: data.latitude ?? null, longitude: data.longitude ?? null,
        isDefault: current.isDefault || Boolean(data.isDefault), isActive: Boolean(data.isActive),
        isPickup: Boolean(data.isPickup), isReturn: Boolean(data.isReturn),
      },
    });
  });
  return NextResponse.json({ warehouse });
  } catch (error) {
    console.error("[WAREHOUSE_UPDATE]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update warehouse" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ warehouseId: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { warehouseId } = await params;
  const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
  if (!warehouse) return NextResponse.json({ error: "Warehouse not found" }, { status: 404 });
  if (warehouse.isDefault) return NextResponse.json({ error: "Choose another default warehouse before deleting this one" }, { status: 409 });
  const [inventoryCount, allocationCount] = await Promise.all([
    prisma.warehouseInventory.count({ where: { warehouseId } }),
    prisma.orderItemInventoryAllocation.count({ where: { warehouseId } }),
  ]);
  if (inventoryCount > 0 || allocationCount > 0) {
    return NextResponse.json(
      { error: "This warehouse has product inventory or order history and cannot be deleted. Mark it inactive instead." },
      { status: 409 }
    );
  }
  await prisma.warehouse.delete({ where: { id: warehouseId } });
  return NextResponse.json({ success: true });
}
