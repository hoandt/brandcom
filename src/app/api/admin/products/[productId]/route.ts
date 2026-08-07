import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadFileToR2 } from "@/lib/r2";
import { slugify } from "@/lib/slugify";
import { revalidateTag } from "next/cache";

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
  id?: string;
  name: string;
  sku: string;
  price: number;
  stock?: number;
  inventories?: SubmittedInventory[];
  imageUrl?: string | null;
};

export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { productId } = await params;
  const [product, warehouses] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { position: "asc" } },
        categories: { select: { id: true } },
        variants: { orderBy: { id: "asc" }, include: { inventories: true } },
      },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, isDefault: true, isPickup: true },
    }),
  ]);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  return NextResponse.json({
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      overview: product.overview || "",
      materials: product.materials || "",
      care: product.care || "",
      categoryIds: product.categories.map((category) => category.id),
      images: product.images.map((image) => image.url),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku,
        price: Number(variant.price),
        stock: variant.stock,
        inventories: variant.inventories.map((inventory) => ({ warehouseId: inventory.warehouseId, quantity: inventory.quantity })),
        imageUrl: variant.imageUrl || "",
      })),
      warehouses,
    },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const categoryIds = parseCategoryIds(formData.get("categoryIds"));
    const mainImageType = formData.get("mainImageType");
    const mainImageValue = formData.get("mainImageValue");

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
    const submittedExistingImages = [
      ...new Set(
        formData
          .getAll("existingImages")
          .filter((value): value is string => typeof value === "string"),
      ),
    ];

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

    // Read the current relations before opening the transaction so image
    // changes can be reconciled without deleting and recreating the gallery.
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { position: "asc" } },
        variants: true,
      },
    });

    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentImageByUrl = new Map(
      currentProduct.images.map((image) => [image.url, image]),
    );
    const existingImages = submittedExistingImages.filter((url) =>
      currentImageByUrl.has(url),
    );
    const allImageUrls = [...new Set([...existingImages, ...newImageUrls])];
    let selectedMainImageUrl: string | undefined;
    if (
      mainImageType === "existing" &&
      typeof mainImageValue === "string" &&
      existingImages.includes(mainImageValue)
    ) {
      selectedMainImageUrl = mainImageValue;
    } else if (mainImageType === "new" && typeof mainImageValue === "string") {
      const selectedNewImageIndex = Number.parseInt(mainImageValue, 10);
      if (Number.isInteger(selectedNewImageIndex) && selectedNewImageIndex >= 0) {
        selectedMainImageUrl = newImageUrls[selectedNewImageIndex];
      }
    }
    const orderedImageUrls = selectedMainImageUrl
      ? [
          selectedMainImageUrl,
          ...allImageUrls.filter((url) => url !== selectedMainImageUrl),
        ]
      : allImageUrls;
    const retainedImageIds = orderedImageUrls.flatMap((url) => {
      const image = currentImageByUrl.get(url);
      return image ? [image.id] : [];
    });
    const newGalleryImageUrls = orderedImageUrls.filter(
      (url) => !currentImageByUrl.has(url),
    );

    // Identify variants to delete (variants in DB whose IDs are not in the submitted variants list)
    const submittedVariantIds = variants.map((variant) => variant.id).filter((id): id is string => Boolean(id));
    const variantsToDelete = currentProduct.variants.filter(
      (v) => !submittedVariantIds.includes(v.id)
    );

    const preparedVariants = variants.map((variant) => {
      const inventories = Array.isArray(variant.inventories)
        ? variant.inventories
            .map((inventory) => ({
              warehouseId: inventory.warehouseId || "",
              quantity: Math.max(0, Math.floor(Number(inventory.quantity) || 0)),
            }))
            .filter((inventory) => inventory.warehouseId && inventory.quantity > 0)
        : [];
      return {
        ...variant,
        inventories,
        totalStock: inventories.reduce((sum, inventory) => sum + inventory.quantity, 0),
      };
    });

    const variantOperations = preparedVariants.map((v) => {
      if (v.id) {
        return prisma.productVariant.update({
          where: { id: v.id },
          data: {
            name: v.name,
            sku: v.sku,
            price: v.price,
            stock: v.totalStock,
            imageUrl: v.imageUrl || null,
            inventories: {
              deleteMany: {},
              ...(v.inventories.length > 0
                ? { createMany: { data: v.inventories } }
                : {}),
            },
          },
        });
      }
      return prisma.productVariant.create({
        data: {
          productId,
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.totalStock,
          imageUrl: v.imageUrl || null,
          isActive: true,
          inventories: v.inventories.length > 0
            ? { createMany: { data: v.inventories } }
            : undefined,
        },
      });
    });

    // All writes are known in advance, so a batch transaction avoids the
    // interactive transaction lease while preserving all-or-nothing behavior.
    await prisma.$transaction(
      [
        prisma.product.update({
          where: { id: productId },
          data: {
            name,
            slug,
            description,
            overview,
            materials,
            care,
            categories: { set: categoryIds.map((id) => ({ id })) },
          },
        }),
        prisma.productImage.deleteMany({
          where: {
            productId,
            ...(retainedImageIds.length > 0
              ? { id: { notIn: retainedImageIds } }
              : {}),
          },
        }),
        ...orderedImageUrls.flatMap((url, position) => {
          const image = currentImageByUrl.get(url);
          return image
            ? [
                prisma.productImage.update({
                  where: { id: image.id },
                  data: { alt: name, position },
                }),
              ]
            : [];
        }),
        ...(newGalleryImageUrls.length > 0
          ? [
              prisma.productImage.createMany({
                data: newGalleryImageUrls.map((url) => ({
                  productId,
                  url,
                  alt: name,
                  position: orderedImageUrls.indexOf(url),
                })),
              }),
            ]
          : []),
        ...(variantsToDelete.length > 0
          ? [prisma.productVariant.deleteMany({
              where: { id: { in: variantsToDelete.map((v) => v.id) } },
            })]
          : []),
        ...variantOperations,
      ],
      { maxWait: 10_000, timeout: 30_000 },
    );

    revalidateTag("products");
    const savedProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: { orderBy: { position: "asc" } } },
    });
    return NextResponse.json(savedProduct);
  } catch (error) {
    console.error("[UPDATE_PRODUCT_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
