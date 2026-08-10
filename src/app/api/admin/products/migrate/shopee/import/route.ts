import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import {
  fetchShopeeModels,
  mappedNumber,
  mappedText,
  type ShopeeProductMappings,
} from "@/lib/shopee-product-migration";

const mappingKeys = ["productName", "description", "overview", "materials", "care", "productImage", "variantName", "sku", "price", "comparePrice", "stock", "variantImage"] as const;
const mappingsSchema = z.object(Object.fromEntries(mappingKeys.map((key) => [key, z.string()])) as Record<(typeof mappingKeys)[number], z.ZodString>);
const requestSchema = z.object({
  itemId: z.number().int().positive().safe(),
  shopId: z.number().int().positive().safe(),
  mappings: mappingsSchema,
  categoryIds: z.array(z.string().min(1)).max(50).default([]),
  warehouseId: z.string().min(1).optional(),
  status: z.enum(["DRAFT", "ACTIVE"]).default("DRAFT"),
});

function validImageUrl(value: string) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid migration settings", details: parsed.error.flatten() }, { status: 422 });
    const input = parsed.data;
    const source = await fetchShopeeModels(input.itemId, input.shopId);
    const mappings = input.mappings as ShopeeProductMappings;
    const firstRow = source.rows[0];
    const productName = mappedText(firstRow, mappings.productName) || `Shopee item ${input.itemId}`;
    const baseSlug = slugify(productName) || `shopee-${input.itemId}`;

    const preparedVariants = source.rows.map((row, index) => {
      const sourceModelId = mappedText(row, "model.model_id") || String(index + 1);
      const sku = mappedText(row, mappings.sku) || `SHOPEE-${input.shopId}-${input.itemId}-${sourceModelId}`;
      const price = Math.max(0, mappedNumber(row, mappings.price));
      const comparePriceValue = mappedNumber(row, mappings.comparePrice, -1);
      return {
        name: mappedText(row, mappings.variantName) || (source.rows.length === 1 ? "Default" : `Model ${sourceModelId}`),
        sku,
        price,
        comparePrice: comparePriceValue >= 0 ? comparePriceValue : null,
        stock: Math.max(0, Math.floor(mappedNumber(row, mappings.stock))),
        imageUrl: validImageUrl(mappedText(row, mappings.variantImage)),
      };
    });
    const duplicateSkus = preparedVariants.filter((variant, index) => preparedVariants.findIndex((candidate) => candidate.sku.toUpperCase() === variant.sku.toUpperCase()) !== index);
    if (duplicateSkus.length > 0) return NextResponse.json({ error: `Mapped SKU is duplicated: ${duplicateSkus[0].sku}` }, { status: 422 });

    const mappedProductImages = source.rows.map((row) => validImageUrl(mappedText(row, mappings.productImage))).filter(Boolean);
    const fallbackVariantImages = preparedVariants.map((variant) => variant.imageUrl).filter(Boolean);
    const imageUrls = [...new Set(mappedProductImages.length > 0 ? mappedProductImages : fallbackVariantImages)];

    const product = await prisma.$transaction(async (tx) => {
      if (input.categoryIds.length > 0) {
        const categoryCount = await tx.category.count({ where: { id: { in: input.categoryIds }, isActive: true } });
        if (categoryCount !== input.categoryIds.length) throw new Error("One or more selected categories are invalid");
      }
      const warehouse = input.warehouseId
        ? await tx.warehouse.findFirst({ where: { id: input.warehouseId, isActive: true, isPickup: true }, select: { id: true } })
        : await tx.warehouse.findFirst({ where: { isActive: true, isPickup: true }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }], select: { id: true } });
      if (preparedVariants.some((variant) => variant.stock > 0) && !warehouse) throw new Error("An active pickup warehouse is required for imported stock");

      const existingSku = await tx.productVariant.findFirst({ where: { sku: { in: preparedVariants.map((variant) => variant.sku) } }, select: { sku: true } });
      if (existingSku) throw new Error(`SKU already exists: ${existingSku.sku}`);

      let slug = baseSlug;
      let suffix = 1;
      while (await tx.product.findUnique({ where: { slug }, select: { id: true } })) {
        slug = `${baseSlug}-${suffix++}`;
      }

      return tx.product.create({
        data: {
          name: productName,
          slug,
          status: input.status,
          description: mappedText(firstRow, mappings.description),
          overview: mappedText(firstRow, mappings.overview),
          materials: mappedText(firstRow, mappings.materials),
          care: mappedText(firstRow, mappings.care),
          categories: input.categoryIds.length > 0 ? { connect: input.categoryIds.map((id) => ({ id })) } : undefined,
          images: imageUrls.length > 0 ? { create: imageUrls.map((url, position) => ({ url, alt: productName, position })) } : undefined,
          variants: {
            create: preparedVariants.map((variant) => ({
              name: variant.name,
              sku: variant.sku,
              price: variant.price,
              comparePrice: variant.comparePrice,
              stock: variant.stock,
              imageUrl: variant.imageUrl || null,
              isActive: true,
              inventories: warehouse && variant.stock > 0 ? { create: [{ warehouseId: warehouse.id, quantity: variant.stock }] } : undefined,
            })),
          },
        },
        select: { id: true, name: true, slug: true, status: true, _count: { select: { variants: true, images: true } } },
      });
    }, { isolationLevel: "Serializable" });

    revalidateTag("products");
    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("[SHOPEE_PRODUCT_MIGRATION_ERROR]", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Product slug or SKU already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to import Shopee product" }, { status: 400 });
  }
}
