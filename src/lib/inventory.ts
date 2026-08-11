import type { Prisma } from "@/generated/prisma/client";

export type InventoryAllocation = { warehouseId: string; quantity: number };

export async function allocateInventory(
  tx: Prisma.TransactionClient,
  variantId: string,
  requestedQuantity: number
): Promise<InventoryAllocation[]> {
  // 1. Fetch inventories from active pickup warehouses
  let inventories = await tx.warehouseInventory.findMany({
    where: {
      variantId,
      quantity: { gt: 0 },
      warehouse: { isActive: true, isPickup: true },
    },
    include: { warehouse: { select: { name: true, isDefault: true } } },
    orderBy: [{ warehouse: { isDefault: "desc" } }, { warehouse: { name: "asc" } }],
  });

  let available = inventories.reduce((sum, inventory) => sum + inventory.quantity, 0);

  // 2. If insufficient in pickup warehouses, check all active warehouses
  if (available < requestedQuantity) {
    const allActiveInventories = await tx.warehouseInventory.findMany({
      where: {
        variantId,
        quantity: { gt: 0 },
        warehouse: { isActive: true },
      },
      include: { warehouse: { select: { name: true, isDefault: true } } },
      orderBy: [{ warehouse: { isDefault: "desc" } }, { warehouse: { name: "asc" } }],
    });
    const allAvailable = allActiveInventories.reduce((sum, inventory) => sum + inventory.quantity, 0);
    if (allAvailable >= requestedQuantity) {
      inventories = allActiveInventories;
      available = allAvailable;
    }
  }

  // 3. If still insufficient in warehouseInventory, check variant.stock fallback
  if (available < requestedQuantity) {
    const variant = await tx.productVariant.findUnique({
      where: { id: variantId },
      select: { stock: true },
    });

    if (variant && variant.stock >= requestedQuantity) {
      // Find or create default active warehouse
      let defaultWarehouse = await tx.warehouse.findFirst({
        where: { isActive: true },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

      if (!defaultWarehouse) {
        defaultWarehouse = await tx.warehouse.create({
          data: {
            code: "DEFAULT",
            name: "Kho mặc định",
            contactName: "AURIA Store",
            phone: "0900000000",
            address: "Kho trung tâm",
            provinceId: "VN_1",
            provinceName: "Thành phố Hồ Chí Minh",
            districtId: "VN_1_1",
            districtName: "Quận 1",
            wardId: "VN_1_1_1",
            wardName: "Phường Bến Nghé",
            isDefault: true,
            isActive: true,
            isPickup: true,
          },
        });
      }

      // Upsert warehouse inventory record for this variant
      const warehouseInv = await tx.warehouseInventory.upsert({
        where: {
          warehouseId_variantId: {
            warehouseId: defaultWarehouse.id,
            variantId,
          },
        },
        update: {
          quantity: { increment: variant.stock },
        },
        create: {
          warehouseId: defaultWarehouse.id,
          variantId,
          quantity: variant.stock,
        },
      });

      inventories = [{
        ...warehouseInv,
        warehouse: { name: defaultWarehouse.name, isDefault: defaultWarehouse.isDefault },
      }];
      available = warehouseInv.quantity;
    }
  }

  if (available < requestedQuantity) {
    throw new Error(`Rất tiếc, sản phẩm này chỉ còn ${available} sản phẩm trong kho.`);
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
