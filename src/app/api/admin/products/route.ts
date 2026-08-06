import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadFileToR2 } from "@/lib/r2";
import { slugify } from "@/lib/slugify";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    let slug = formData.get("slug") as string;
    const description = (formData.get("description") as string) || "";
    const overview = (formData.get("overview") as string) || "";
    const materials = (formData.get("materials") as string) || "";
    const care = (formData.get("care") as string) || "";
    const variantsStr = formData.get("variants") as string;

    if (!name || !variantsStr) {
      return NextResponse.json({ error: "Missing name or variants data" }, { status: 400 });
    }

    let variants = [];
    try {
      variants = JSON.parse(variantsStr);
    } catch (e) {
      return NextResponse.json({ error: "Invalid variants JSON" }, { status: 400 });
    }

    if (variants.length === 0) {
      return NextResponse.json({ error: "At least one variant is required" }, { status: 400 });
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
        images: {
          create: imageUrls.map((url, idx) => ({
            url,
            alt: name,
            position: idx,
          })),
        },
        variants: {
          create: variants.map((v: any) => {
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

    return NextResponse.json(product);
  } catch (error) {
    console.error("[CREATE_PRODUCT_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
