import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "all";

    // Find the user ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    // Build the query
    const whereClause: any = {
      OR: [
        { userId: user?.id },
        { customerEmail: session.user.email }
      ]
    };

    if (status !== "all") {
      whereClause.orderStatus = status.toUpperCase();
    }

    // Fetch orders
    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Fetch variants to get product images and slug
    const variantIds = Array.from(new Set(orders.flatMap(order => order.items.map(item => item.variantId))));
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          include: {
            images: true
          }
        }
      }
    });

    // Map variants to an object
    const variantMap = Object.fromEntries(variants.map(v => [v.id, v]));

    // Fetch counts for all statuses
    const baseWhereClause = {
      OR: [
        { userId: user?.id },
        { customerEmail: session.user.email }
      ]
    };

    const countsData = await prisma.order.groupBy({
      by: ['orderStatus'],
      where: baseWhereClause,
      _count: {
        id: true,
      },
    });

    const counts: Record<string, number> = {
      all: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
    };

    countsData.forEach(item => {
      const status = item.orderStatus.toLowerCase();
      if (counts[status] !== undefined) {
        counts[status] = item._count.id;
      }
      counts.all += item._count.id;
    });

    return NextResponse.json({ orders, variantMap, counts });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
