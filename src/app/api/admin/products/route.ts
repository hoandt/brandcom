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

    // Create the product in database
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
          create: variants.map((v: any) => ({
            name: v.name || "Default Variant",
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            imageUrl: v.imageUrl || null,
            isActive: true,
          })),
        },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("[CREATE_PRODUCT_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
