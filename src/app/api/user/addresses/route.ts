import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ data: addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, address, provinceId, provinceName, districtId, districtName, wardId, wardName, isDefault, latitude, longitude } = body;

    if (!name || !phone || !address || provinceId === undefined || districtId === undefined || wardId === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    } else {
      // If no addresses exist, make this the default
      const count = await prisma.address.count({
        where: { userId: session.user.id },
      });
      if (count === 0) {
        body.isDefault = true;
      }
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: session.user.id,
        name,
        phone,
        address,
        provinceId,
        provinceName,
        districtId,
        districtName,
        wardId,
        wardName,
        latitude,
        longitude,
        isDefault: body.isDefault || isDefault || false,
      },
    });

    return NextResponse.json({ data: newAddress }, { status: 201 });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
