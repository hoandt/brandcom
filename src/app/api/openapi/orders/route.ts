import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { allocateInventory } from "@/lib/inventory";
import { authenticateOpenApi } from "@/lib/openapi-auth";
import { getStoreSettings } from "@/lib/store-settings";
import { Prisma } from "@/generated/prisma/client";

const orderStatuses = ["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;
const paymentStatuses = ["PENDING", "PAID", "REFUNDED"] as const;

const createOrderSchema = z.object({
  orderNumber: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/).optional(),
  customer: z.object({
    name: z.string().trim().min(1).max(200),
    phone: z.string().trim().min(1).max(50),
    email: z.string().trim().email().max(320).optional().or(z.literal("")),
    address: z.string().trim().min(1).max(1000),
  }),
  paymentMethod: z.string().trim().min(1).max(100),
  paymentStatus: z.enum(paymentStatuses).default("PENDING"),
  orderStatus: z.enum(orderStatuses).default("PROCESSING"),
  shippingFee: z.number().finite().min(0).default(0),
  discount: z.number().finite().min(0).default(0),
  items: z.array(z.object({
    variantId: z.string().trim().min(1).optional(),
    sku: z.string().trim().min(1).optional(),
    quantity: z.number().int().min(1).max(10_000),
    unitPrice: z.number().finite().min(0).optional(),
  }).refine((item) => Boolean(item.variantId || item.sku), {
    message: "variantId or sku is required",
  })).min(1).max(100).superRefine((items, context) => {
    const keys = items.map((item) => item.variantId ? `id:${item.variantId}` : `sku:${item.sku}`);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Duplicate variants are not allowed" });
    }
  }),
});

export async function POST(request: Request) {
  const authentication = authenticateOpenApi(request);
  if (!authentication.ok) {
    return NextResponse.json(
      { success: false, error: { code: authentication.status === 503 ? "NOT_CONFIGURED" : "UNAUTHORIZED", message: authentication.message } },
      { status: authentication.status },
    );
  }

  try {
    const parsed = createOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
        { status: 422 },
      );
    }

    const input = parsed.data;
    const storeSettings = await getStoreSettings();
    const orderNumber = input.orderNumber ?? `${storeSettings.orderPrefix}-API-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    if (input.orderNumber) {
      const existingOrder = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, orderNumber: true } });
      if (existingOrder) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_ORDER", message: "An order with this orderNumber already exists" }, order: existingOrder },
          { status: 409 },
        );
      }
    }

    const order = await prisma.$transaction(async (tx) => {
      const resolvedItems = [];

      for (const item of input.items) {
        const variant = await tx.productVariant.findFirst({
          where: item.variantId ? { id: item.variantId, isActive: true } : { sku: item.sku, isActive: true },
          select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            product: { select: { name: true } },
          },
        });
        if (!variant) throw new Error(`Active variant not found: ${item.variantId ?? item.sku}`);

        const allocations = input.orderStatus === "CANCELLED"
          ? []
          : await allocateInventory(tx, variant.id, item.quantity);

        resolvedItems.push({
          variant,
          quantity: item.quantity,
          price: item.unitPrice ?? Number(variant.price),
          allocations,
        });
      }

      const subtotal = resolvedItems.reduce((total, item) => total + item.price * item.quantity, 0);
      const discount = Math.min(input.discount, subtotal + input.shippingFee);
      const totalAmount = Math.max(0, subtotal + input.shippingFee - discount);

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          customerName: input.customer.name,
          customerPhone: input.customer.phone,
          customerEmail: input.customer.email || null,
          address: input.customer.address,
          subtotal,
          shippingFee: input.shippingFee,
          discount,
          totalAmount,
          paymentMethod: input.paymentMethod,
          paymentStatus: input.paymentStatus,
          orderStatus: input.orderStatus,
          cartDiscount: discount,
        },
      });

      for (const item of resolvedItems) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            variantId: item.variant.id,
            sku: item.variant.sku,
            productName: item.variant.product.name,
            variantName: item.variant.name,
            price: item.price,
            quantity: item.quantity,
          },
        });
        if (item.allocations.length > 0) {
          await tx.orderItemInventoryAllocation.createMany({
            data: item.allocations.map((allocation) => ({ ...allocation, orderItemId: orderItem.id })),
          });
        }
      }

      return createdOrder;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        discount: Number(order.discount),
        totalAmount: Number(order.totalAmount),
        currency: storeSettings.currency,
        createdAt: order.createdAt.toISOString(),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[OPENAPI_CREATE_ORDER_ERROR]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ORDER", message: "An order with this orderNumber already exists" } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "ORDER_CREATION_FAILED", message: error instanceof Error ? error.message : "Unable to create order" } },
      { status: 400 },
    );
  }
}
