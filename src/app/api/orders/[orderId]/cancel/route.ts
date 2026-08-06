import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { restoreInventory } from "@/lib/inventory";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await params;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Find the order
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
        // Make sure it belongs to the current user
        userId: user.id
      },
      include: {
        items: true
      }
    });

    if (!order) {
      return NextResponse.json({ success: false, message: "Order not found or unauthorized" }, { status: 404 });
    }

    // Check if order is cancellable
    if (order.orderStatus !== "PENDING" && order.orderStatus !== "PROCESSING") {
      return NextResponse.json({ success: false, message: `Order cannot be cancelled because it is ${order.orderStatus}` }, { status: 400 });
    }

    // Cancel order and restore each item to its originally allocated warehouses.
    await prisma.$transaction(async (tx) => {
      const transactionalOrder = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: { include: { allocations: true } } },
      });
      if (transactionalOrder.orderStatus !== "PENDING" && transactionalOrder.orderStatus !== "PROCESSING") {
        throw new Error(`Order cannot be cancelled because it is ${transactionalOrder.orderStatus}`);
      }
      const changed = await tx.order.updateMany({
        where: { id: order.id, orderStatus: { in: ["PENDING", "PROCESSING"] } },
        data: { orderStatus: "CANCELLED" },
      });
      if (changed.count !== 1) throw new Error("Order status changed. Refresh and try again.");

      for (const item of transactionalOrder.items) {
        let allocations = item.allocations.map((allocation) => ({
          warehouseId: allocation.warehouseId,
          quantity: allocation.quantity,
        }));
        if (allocations.length === 0) {
          const fallbackWarehouse = await tx.warehouse.findFirst({
            where: { isActive: true, isPickup: true },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: { id: true },
          });
          if (!fallbackWarehouse) throw new Error("No active pickup warehouse is available to restore legacy order inventory.");
          allocations = [{ warehouseId: fallbackWarehouse.id, quantity: item.quantity }];
          await tx.orderItemInventoryAllocation.createMany({
            data: allocations.map((allocation) => ({ ...allocation, orderItemId: item.id })),
          });
        }
        await restoreInventory(tx, item.variantId, allocations);
      }
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, message: "Order cancelled successfully" });
  } catch (error: any) {
    console.error("Cancel order error:", error);
    return NextResponse.json({ success: false, message: error.message || "Internal server error" }, { status: 500 });
  }
}
