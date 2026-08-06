import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        OR: [
          { userId: user?.id },
          { customerEmail: session.user.email }
        ]
      },
      include: {
        items: true
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch variants to get product images and slug
    const variantIds = Array.from(new Set(order.items.map((item: any) => item.variantId)));
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

    return NextResponse.json({ order, variantMap });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
