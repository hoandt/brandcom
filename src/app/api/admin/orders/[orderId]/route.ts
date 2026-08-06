import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { allocateInventory, deductRecordedInventory, restoreInventory } from "@/lib/inventory";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json();

    const { orderStatus, paymentStatus } = body;

    const result = await prisma.$transaction(async (tx) => {
      // Fetch current order state including items
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: { include: { allocations: true } } }
      });

      if (!existingOrder) {
        throw new Error("Order not found");
      }

      // Check transition to CANCELLED (restores stock)
      if (orderStatus === "CANCELLED" && existingOrder.orderStatus !== "CANCELLED") {
        for (const item of existingOrder.items) {
          let allocations = item.allocations.map((allocation) => ({ warehouseId: allocation.warehouseId, quantity: allocation.quantity }));
          if (allocations.length === 0) {
            const fallbackWarehouse = await tx.warehouse.findFirst({
              where: { isActive: true, isPickup: true },
              orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
              select: { id: true },
            });
            if (!fallbackWarehouse) throw new Error("No active pickup warehouse is available to restore inventory.");
            allocations = [{ warehouseId: fallbackWarehouse.id, quantity: item.quantity }];
            await tx.orderItemInventoryAllocation.createMany({
              data: allocations.map((allocation) => ({ ...allocation, orderItemId: item.id })),
            });
          }
          await restoreInventory(tx, item.variantId, allocations);
        }
      }

      // Check transition FROM CANCELLED back to active (deducts stock again)
      if (existingOrder.orderStatus === "CANCELLED" && orderStatus && orderStatus !== "CANCELLED") {
        for (const item of existingOrder.items) {
          if (item.allocations.length > 0) {
            await deductRecordedInventory(tx, item.variantId, item.allocations.map((allocation) => ({ warehouseId: allocation.warehouseId, quantity: allocation.quantity })));
          } else {
            const allocations = await allocateInventory(tx, item.variantId, item.quantity);
            await tx.orderItemInventoryAllocation.createMany({
              data: allocations.map((allocation) => ({ ...allocation, orderItemId: item.id })),
            });
          }
        }
      }

      // Perform update
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          orderStatus: orderStatus || undefined,
          paymentStatus: paymentStatus || undefined
        }
      });

      return updatedOrder;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ success: true, order: result });
  } catch (error: any) {
    console.error("Order Status Update Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update order" },
      { status: 400 }
    );
  }
}
