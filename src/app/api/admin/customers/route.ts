import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";

export async function GET() {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          select: {
            id: true,
            totalAmount: true,
            orderStatus: true,
            paymentStatus: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        addresses: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            provinceName: true,
            districtName: true,
            wardName: true,
            isDefault: true,
          },
        },
      },
    });

    const sanitized = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      image: u.image,
      createdAt: u.createdAt.toISOString(),
      orders: u.orders.map((o) => ({
        id: o.id,
        totalAmount: Number(o.totalAmount),
        orderStatus: o.orderStatus,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt.toISOString(),
      })),
      addresses: u.addresses,
      totalSpent: u.orders.reduce((sum, o) => sum + Number(o.totalAmount), 0),
      ordersCount: u.orders.length,
    }));

    return NextResponse.json({ customers: sanitized });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
