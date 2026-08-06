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

    const [ordersCount, revenue] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);
    const totalRevenue = Number(revenue._sum.totalAmount ?? 0);

    return NextResponse.json(
      { revenue: totalRevenue, ordersCount },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" } }
    );
  } catch (error) {
    console.error("Error fetching metrics:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
