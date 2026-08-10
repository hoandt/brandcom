import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { authenticateOpenApi } from "@/lib/openapi-auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";

const inventorySchema = z.object({
  warehouseId: z.string().trim().min(1),
  quantity: z.number().int().min(0).max(1_000_000),
});

const variantSchema = z.object({
  name: z.string().trim().min(1).max(200).default("Default Variant"),
  sku: z.string().trim().min(1).max(200),
  price: z.number().finite().min(0),
  comparePrice: z.number().finite().min(0).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).optional(),
  imageUrl: z.string().trim().url().nullable().optional(),
  isActive: z.boolean().default(true),
  inventories: z.array(inventorySchema).max(100).optional(),
}).superRefine((variant, context) => {
  const warehouseIds = variant.inventories?.map((inventory) => inventory.warehouseId) ?? [];
  if (new Set(warehouseIds).size !== warehouseIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["inventories"], message: "Duplicate warehouse allocations are not allowed" });
  }
});

const createProductSchema = z.object({
  name: z.string().trim().min(1).max(300),
  slug: z.string().trim().max(300).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  description: z.string().max(100_000).default(""),
  overview: z.string().max(100_000).default(""),
  materials: z.string().max(50_000).default(""),
  care: z.string().max(50_000).default(""),
  categoryIds: z.array(z.string().trim().min(1)).max(50).default([]),
  images: z.array(z.object({
    url: z.string().trim().url(),
    alt: z.string().trim().max(500).optional(),
  })).max(20).default([]),
  variants: z.array(variantSchema).min(1).max(500),
}).superRefine((product, context) => {
  if (new Set(product.categoryIds).size !== product.categoryIds.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["categoryIds"], message: "Duplicate categories are not allowed" });
  }
  const skus = product.variants.map((variant) => variant.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["variants"], message: "Variant SKUs must be unique" });
  }
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
    const parsed = createProductSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid request body", details: parsed.error.flatten() } },
        { status: 422 },
      );
    }

    const input = parsed.data;
    const productSlug = slugify(input.slug || input.name);
    if (!productSlug) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "name or slug must contain letters or numbers" } },
        { status: 422 },
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      if (input.categoryIds.length > 0) {
        const categories = await tx.category.count({ where: { id: { in: input.categoryIds }, isActive: true } });
        if (categories !== input.categoryIds.length) throw new Error("One or more categories are invalid or inactive");
      }

      const requestedWarehouseIds = [...new Set(input.variants.flatMap((variant) => variant.inventories?.map((inventory) => inventory.warehouseId) ?? []))];
      if (requestedWarehouseIds.length > 0) {
        const warehouses = await tx.warehouse.count({
          where: { id: { in: requestedWarehouseIds }, isActive: true, isPickup: true },
        });
        if (warehouses !== requestedWarehouseIds.length) throw new Error("One or more inventory warehouses are invalid, inactive, or not pickup warehouses");
      }

      const needsDefaultWarehouse = input.variants.some((variant) => !variant.inventories?.length && (variant.stock ?? 0) > 0);
      const defaultWarehouse = needsDefaultWarehouse
        ? await tx.warehouse.findFirst({
            where: { isActive: true, isPickup: true },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            select: { id: true },
          })
        : null;
      if (needsDefaultWarehouse && !defaultWarehouse) throw new Error("No active pickup warehouse is available for stock allocation");

      return tx.product.create({
        data: {
          name: input.name,
          slug: productSlug,
          status: input.status,
          description: input.description,
          overview: input.overview,
          materials: input.materials,
          care: input.care,
          categories: input.categoryIds.length > 0 ? { connect: input.categoryIds.map((id) => ({ id })) } : undefined,
          images: input.images.length > 0 ? {
            create: input.images.map((image, position) => ({ url: image.url, alt: image.alt || input.name, position })),
          } : undefined,
          variants: {
            create: input.variants.map((variant) => {
              const submittedInventories = (variant.inventories ?? []).filter((inventory) => inventory.quantity > 0);
              const inventories = submittedInventories.length > 0
                ? submittedInventories
                : defaultWarehouse && (variant.stock ?? 0) > 0
                  ? [{ warehouseId: defaultWarehouse.id, quantity: variant.stock ?? 0 }]
                  : [];
              const stock = inventories.reduce((total, inventory) => total + inventory.quantity, 0);
              return {
                name: variant.name,
                sku: variant.sku,
                price: variant.price,
                comparePrice: variant.comparePrice ?? null,
                stock,
                imageUrl: variant.imageUrl ?? null,
                isActive: variant.isActive,
                inventories: inventories.length > 0 ? { create: inventories } : undefined,
              };
            }),
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          createdAt: true,
          images: { orderBy: { position: "asc" }, select: { id: true, url: true, alt: true, position: true } },
          categories: { select: { id: true, name: true, slug: true } },
          variants: { orderBy: { name: "asc" }, select: { id: true, name: true, sku: true, price: true, comparePrice: true, stock: true, imageUrl: true, isActive: true } },
        },
      });
    }, { isolationLevel: "Serializable" });

    revalidateTag("products");
    return NextResponse.json({
      success: true,
      product: {
        ...product,
        createdAt: product.createdAt.toISOString(),
        imagesUsePlaceholder: product.images.length === 0,
        variants: product.variants.map((variant) => ({
          ...variant,
          price: Number(variant.price),
          comparePrice: variant.comparePrice === null ? null : Number(variant.comparePrice),
        })),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("[OPENAPI_CREATE_PRODUCT_ERROR]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_PRODUCT", message: "The product slug or one of its SKUs already exists" } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "PRODUCT_CREATION_FAILED", message: error instanceof Error ? error.message : "Unable to create product" } },
      { status: 400 },
    );
  }
}
