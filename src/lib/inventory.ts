import type { Prisma } from "@/generated/prisma/client";

export type InventoryAllocation = { warehouseId: string; quantity: number };

export async function allocateInventory(
  tx: Prisma.TransactionClient,
  variantId: string,
  requestedQuantity: number
): Promise<InventoryAllocation[]> {
  const inventories = await tx.warehouseInventory.findMany({
    where: {
      variantId,
      quantity: { gt: 0 },
      warehouse: { isActive: true, isPickup: true },
    },
    include: { warehouse: { select: { name: true, isDefault: true } } },
    orderBy: [{ warehouse: { isDefault: "desc" } }, { warehouse: { name: "asc" } }],
  });

  const available = inventories.reduce((sum, inventory) => sum + inventory.quantity, 0);
  if (available < requestedQuantity) {
    throw new Error(`Insufficient inventory. Only ${available} available across active pickup warehouses.`);
  }

  let remaining = requestedQuantity;
  const allocations: InventoryAllocation[] = [];
  for (const inventory of inventories) {
    if (remaining === 0) break;
    const quantity = Math.min(inventory.quantity, remaining);
    const updated = await tx.warehouseInventory.updateMany({
      where: { id: inventory.id, quantity: { gte: quantity } },
      data: { quantity: { decrement: quantity } },
    });
    if (updated.count !== 1) throw new Error("Inventory changed while placing the order. Please try again.");
    allocations.push({ warehouseId: inventory.warehouseId, quantity });
    remaining -= quantity;
  }

  await tx.productVariant.update({
    where: { id: variantId },
    data: { stock: { decrement: requestedQuantity } },
  });
  return allocations;
}

export async function restoreInventory(
  tx: Prisma.TransactionClient,
  variantId: string,
  allocations: InventoryAllocation[]
) {
  const quantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  for (const allocation of allocations) {
    await tx.warehouseInventory.upsert({
      where: {
        warehouseId_variantId: { warehouseId: allocation.warehouseId, variantId },
      },
      update: { quantity: { increment: allocation.quantity } },
      create: { warehouseId: allocation.warehouseId, variantId, quantity: allocation.quantity },
    });
  }
  await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } });
}

export async function deductRecordedInventory(
  tx: Prisma.TransactionClient,
  variantId: string,
  allocations: InventoryAllocation[]
) {
  const quantity = allocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
  for (const allocation of allocations) {
    const updated = await tx.warehouseInventory.updateMany({
      where: {
        warehouseId: allocation.warehouseId,
        variantId,
        quantity: { gte: allocation.quantity },
      },
      data: { quantity: { decrement: allocation.quantity } },
    });
    if (updated.count !== 1) throw new Error("Insufficient inventory in the originally allocated warehouse to reopen this order.");
  }
  await tx.productVariant.update({ where: { id: variantId }, data: { stock: { decrement: quantity } } });
}
