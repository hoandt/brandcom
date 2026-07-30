import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadFileToR2 } from "@/lib/r2";
import { slugify } from "@/lib/slugify";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
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

    // Auto-slugify
    slug = slugify(slug || name);

    // Ensure slug is unique (excluding current product)
    let existing = await prisma.product.findFirst({
      where: {
        slug,
        NOT: { id: productId },
      },
    });
    let counter = 1;
    let uniqueSlug = slug;
    while (existing) {
      uniqueSlug = `${slug}-${counter}`;
      existing = await prisma.product.findFirst({
        where: {
          slug: uniqueSlug,
          NOT: { id: productId },
        },
      });
      counter++;
    }
    slug = uniqueSlug;

    // Parse existing image URLs to keep
    const existingImages = formData.getAll("existingImages") as string[];

    // Handle new uploads
    const newImages = formData.getAll("images") as File[];
    const newImageUrls: string[] = [];

    for (const image of newImages) {
      if (image && image.size > 0) {
        const arrayBuffer = await image.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadFileToR2(buffer, image.name, image.type);
        newImageUrls.push(url);
      }
    }

    // Process variant image uploads
    for (let idx = 0; idx < variants.length; idx++) {
      const variantImageFile = formData.get(`variantImage_${idx}`) as File;
      if (variantImageFile && variantImageFile.size > 0) {
        const arrayBuffer = await variantImageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadFileToR2(buffer, variantImageFile.name, variantImageFile.type);
        variants[idx].imageUrl = url;
      }
    }

    // Get current product images and variants
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, variants: true },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Identify images to delete
    const imagesToDelete = currentProduct.images.filter(
      (img) => !existingImages.includes(img.url)
    );

    // Identify variants to delete (variants in DB whose IDs are not in the submitted variants list)
    const submittedVariantIds = variants.map((v: any) => v.id).filter(Boolean);
    const variantsToDelete = currentProduct.variants.filter(
      (v) => !submittedVariantIds.includes(v.id)
    );

    // Run in transaction
    const updatedProduct = await prisma.$transaction(async (tx) => {
      // 1. Delete removed images
      if (imagesToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: {
            id: { in: imagesToDelete.map((img) => img.id) },
          },
        });
      }

      // 2. Add new images
      if (newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map((url, idx) => ({
            productId,
            url,
            alt: name,
            position: existingImages.length + idx,
          })),
        });
      }

      // 3. Delete removed variants
      if (variantsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: {
            id: { in: variantsToDelete.map((v) => v.id) },
          },
        });
      }

      // 4. Update existing variants & Create new variants
      for (const v of variants) {
        if (v.id) {
          // Update existing variant
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              imageUrl: v.imageUrl || null,
            },
          });
        } else {
          // Create new variant
          await tx.productVariant.create({
            data: {
              productId,
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: v.stock,
              imageUrl: v.imageUrl || null,
              isActive: true,
            },
          });
        }
      }

      // 5. Update product details (including overview, materials, care)
      return tx.product.update({
        where: { id: productId },
        data: {
          name,
          slug,
          description,
          overview,
          materials,
          care,
        },
      });
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("[UPDATE_PRODUCT_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
