import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, phone, address, provinceId, provinceName, districtId, districtName, wardId, wardName, isDefault, latitude, longitude } = body;

    // Verify ownership
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress || existingAddress.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updatedAddress = await prisma.address.update({
      where: { id },
      data: {
        name: name !== undefined ? name : existingAddress.name,
        phone: phone !== undefined ? phone : existingAddress.phone,
        address: address !== undefined ? address : existingAddress.address,
        provinceId: provinceId !== undefined ? provinceId : existingAddress.provinceId,
        provinceName: provinceName !== undefined ? provinceName : existingAddress.provinceName,
        districtId: districtId !== undefined ? districtId : existingAddress.districtId,
        districtName: districtName !== undefined ? districtName : existingAddress.districtName,
        wardId: wardId !== undefined ? wardId : existingAddress.wardId,
        wardName: wardName !== undefined ? wardName : existingAddress.wardName,
        latitude: latitude !== undefined ? latitude : existingAddress.latitude,
        longitude: longitude !== undefined ? longitude : existingAddress.longitude,
        isDefault: isDefault !== undefined ? isDefault : existingAddress.isDefault,
      },
    });

    return NextResponse.json({ data: updatedAddress });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const existingAddress = await prisma.address.findUnique({
      where: { id },
    });

    if (!existingAddress || existingAddress.userId !== session.user.id) {
      return NextResponse.json({ error: "Not Found or Unauthorized" }, { status: 404 });
    }

    await prisma.address.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
