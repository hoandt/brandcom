import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadFileToR2 } from "@/lib/r2";
import { slugify } from "@/lib/slugify";
import { revalidateTag } from "next/cache";
import { z } from "zod";

async function authorized() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

function parseCategoryIds(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((id) => typeof id !== "string")) throw new Error("Invalid category data");
  return [...new Set(parsed)];
}

type SubmittedInventory = { warehouseId?: string; quantity?: number };
type SubmittedVariant = {
  name?: string;
  sku: string;
  price: number;
  stock?: number;
  inventories?: SubmittedInventory[];
  imageUrl?: string | null;
};

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const products = await prisma.product.findMany({
    include: {
      categories: { select: { id: true, name: true, slug: true, parentId: true } },
      images: { orderBy: { position: "asc" }, take: 1 },
      variants: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          inventories: {
            where: { quantity: { gt: 0 } },
            orderBy: { warehouse: { name: "asc" } },
            include: { warehouse: { select: { id: true, name: true, code: true, isDefault: true, isActive: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products });
}

const bulkDeleteSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1).max(100).transform((ids) => [...new Set(ids)]),
});

export async function DELETE(req: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const parsed = bulkDeleteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Select between 1 and 100 products", details: parsed.error.flatten() }, { status: 422 });
    const productIds = parsed.data.productIds;
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, variants: { select: { id: true } } } });
    const foundIds = products.map((product) => product.id);
    const variantIds = products.flatMap((product) => product.variants.map((variant) => variant.id));

    const result = await prisma.$transaction(async (tx) => {
      const inventories = variantIds.length > 0 ? await tx.warehouseInventory.deleteMany({ where: { variantId: { in: variantIds } } }) : { count: 0 };
      const variants = await tx.productVariant.deleteMany({ where: { productId: { in: foundIds } } });
      const images = await tx.productImage.deleteMany({ where: { productId: { in: foundIds } } });
      const reviews = await tx.productReview.deleteMany({ where: { productId: { in: foundIds } } });
      const deletedProducts = await tx.product.deleteMany({ where: { id: { in: foundIds } } });
      return { products: deletedProducts.count, variants: variants.count, inventories: inventories.count, images: images.count, reviews: reviews.count };
    });

    revalidateTag("products");
    return NextResponse.json({ success: true, deleted: result });
  } catch (error) {
    console.error("[BULK_DELETE_PRODUCTS_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete selected products" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    let slug = formData.get("slug") as string;
    const description = (formData.get("description") as string) || "";
    const overview = (formData.get("overview") as string) || "";
    const materials = (formData.get("materials") as string) || "";
    const care = (formData.get("care") as string) || "";
    const variantsStr = formData.get("variants") as string;
    const categoryIds = parseCategoryIds(formData.get("categoryIds"));

    if (!name || !variantsStr) {
      return NextResponse.json({ error: "Missing name or variants data" }, { status: 400 });
    }

    let variants: SubmittedVariant[] = [];
    try {
      variants = JSON.parse(variantsStr) as SubmittedVariant[];
    } catch {
      return NextResponse.json({ error: "Invalid variants JSON" }, { status: 400 });
    }

    if (variants.length === 0) {
      return NextResponse.json({ error: "At least one variant is required" }, { status: 400 });
    }

    if (categoryIds.length > 0) {
      const categoryCount = await prisma.category.count({ where: { id: { in: categoryIds }, isActive: true } });
      if (categoryCount !== categoryIds.length) {
        return NextResponse.json({ error: "One or more categories are invalid" }, { status: 400 });
      }
    }

    // Auto-slugify name if slug is not provided
    slug = slugify(slug || name);

    // Ensure slug is unique
    let existing = await prisma.product.findUnique({ where: { slug } });
    let counter = 1;
    let uniqueSlug = slug;
    while (existing) {
      uniqueSlug = `${slug}-${counter}`;
      existing = await prisma.product.findUnique({ where: { slug: uniqueSlug } });
      counter++;
    }
    slug = uniqueSlug;

    // Handle Image Uploads
    const images = formData.getAll("images") as File[];
    const imageUrls: string[] = [];

    for (const image of images) {
      if (image && image.size > 0) {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadFileToR2(buffer, image.name, image.type);
        imageUrls.push(url);
      }
    }

    // Process variant image files
    for (let idx = 0; idx < variants.length; idx++) {
      const variantImageFile = formData.get(`variantImage_${idx}`) as File;
      if (variantImageFile && variantImageFile.size > 0) {
        const arrayBuffer = await variantImageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadFileToR2(buffer, variantImageFile.name, variantImageFile.type);
        variants[idx].imageUrl = url;
      }
    }

    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { isActive: true, isPickup: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    });

    // Create the product in database. Legacy new-product stock is assigned to
    // the default pickup warehouse until the new-product UI uses allocations.
    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        overview,
        materials,
        care,
        status: "ACTIVE",
        categories: categoryIds.length > 0 ? { connect: categoryIds.map((id) => ({ id })) } : undefined,
        images: {
          create: imageUrls.map((url, idx) => ({
            url,
            alt: name,
            position: idx,
          })),
        },
        variants: {
          create: variants.map((v) => {
            const submittedInventories = Array.isArray(v.inventories)
              ? v.inventories
                  .map((inventory: { warehouseId?: string; quantity?: number }) => ({ warehouseId: inventory.warehouseId || "", quantity: Math.max(0, Math.floor(Number(inventory.quantity) || 0)) }))
                  .filter((inventory: { warehouseId: string; quantity: number }) => inventory.warehouseId && inventory.quantity > 0)
              : [];
            const legacyQuantity = Math.max(0, Math.floor(Number(v.stock) || 0));
            const inventories = submittedInventories.length > 0
              ? submittedInventories
              : defaultWarehouse && legacyQuantity > 0
                ? [{ warehouseId: defaultWarehouse.id, quantity: legacyQuantity }]
                : [];
            const quantity = inventories.reduce((sum: number, inventory: { quantity: number }) => sum + inventory.quantity, 0);
            return {
              name: v.name || "Default Variant",
              sku: v.sku,
              price: v.price,
              stock: quantity,
              imageUrl: v.imageUrl || null,
              isActive: true,
              inventories: inventories.length > 0
                ? { create: inventories }
                : undefined,
            };
          }),
        },
      },
    });

    revalidateTag("products");
    return NextResponse.json(product);
  } catch (error) {
    console.error("[CREATE_PRODUCT_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
