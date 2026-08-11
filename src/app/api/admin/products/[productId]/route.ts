import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { uploadFileToR2 } from "@/lib/r2";
import { slugify } from "@/lib/slugify";
import { revalidateTag } from "next/cache";
import { invalidateProductsListCache } from "../route";

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

// Simple in-memory cache for GET /api/admin/products/[productId]
const productCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 30_000;

export function invalidateAdminProductCache(productId?: string) {
  if (productId) {
    productCache.delete(productId);
  } else {
    productCache.clear();
  }
}



export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { productId } = await params;

  const cached = productCache.get(productId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  const [product, warehouses] = await Promise.all([
    prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        description: true,
        overview: true,
        materials: true,
        care: true,
        cardHoverVideoUrl: true,
        cardHoverImageUrl: true,
        categories: { select: { id: true } },
        images: { orderBy: { position: "asc" }, select: { url: true } },
        variants: {
          orderBy: { id: "asc" },
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            stock: true,
            imageUrl: true,
            inventories: { select: { warehouseId: true, quantity: true } },
          },
        },
      },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, code: true, isDefault: true, isPickup: true },
    }),
  ]);
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const result = {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      status: product.status,
      description: product.description || "",
      overview: product.overview || "",
      materials: product.materials || "",
      care: product.care || "",
      cardHoverVideoUrl: product.cardHoverVideoUrl || "",
      cardHoverImageUrl: product.cardHoverImageUrl || "",
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
  };

  productCache.set(productId, { data: result, timestamp: Date.now() });
  return NextResponse.json(result);
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
    let cardHoverVideoUrl = (formData.get("cardHoverVideoUrl") as string) || "";
    const cardHoverImageUrl = (formData.get("cardHoverImageUrl") as string) || "";
    const submittedStatus = formData.get("status");
    const status = typeof submittedStatus === "string" && ["DRAFT", "ACTIVE", "ARCHIVED"].includes(submittedStatus)
      ? submittedStatus as "DRAFT" | "ACTIVE" | "ARCHIVED"
      : null;
    const variantsStr = formData.get("variants") as string;
    const categoryIds = parseCategoryIds(formData.get("categoryIds"));
    const mainImageType = formData.get("mainImageType");
    const mainImageValue = formData.get("mainImageValue");

    if (!name || !variantsStr || !status) {
      return NextResponse.json({ error: "Missing or invalid name, status, or variants data" }, { status: 400 });
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
      select: { id: true },
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
        select: { id: true },
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

    // Handle new uploads if any raw Files were attached
    const newImages = formData.getAll("images");
    const newImageUrls: string[] = [];

    const cardHoverVideo = formData.get("cardHoverVideo") as File | null;
    if (cardHoverVideo?.size) {
      if (!cardHoverVideo.type.startsWith("video/")) return NextResponse.json({ error: "Card hover media must be a video" }, { status: 400 });
      if (cardHoverVideo.size > 25 * 1024 * 1024) return NextResponse.json({ error: "Card hover video must be 25 MB or smaller" }, { status: 400 });
      cardHoverVideoUrl = await uploadFileToR2(Buffer.from(await cardHoverVideo.arrayBuffer()), cardHoverVideo.name, cardHoverVideo.type);
    }

    for (const entry of newImages) {
      if (typeof entry === "string" && entry.length > 0) {
        newImageUrls.push(entry);
      } else if (entry && typeof entry === "object" && "size" in entry && (entry as File).size > 0) {
        const file = entry as File;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadFileToR2(buffer, file.name, file.type);
        newImageUrls.push(url);
      }
    }

    // Process variant image uploads
    for (let idx = 0; idx < variants.length; idx++) {
      const variantImageEntry = formData.get(`variantImage_${idx}`);
      if (typeof variantImageEntry === "string" && variantImageEntry.length > 0) {
        variants[idx].imageUrl = variantImageEntry;
      } else if (variantImageEntry && typeof variantImageEntry === "object" && "size" in variantImageEntry && (variantImageEntry as File).size > 0) {
        const file = variantImageEntry as File;
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const url = await uploadFileToR2(buffer, file.name, file.type);
        variants[idx].imageUrl = url;
      }
    }

    // Read current relations before update
    const currentProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        images: { orderBy: { position: "asc" }, select: { url: true } },
        variants: { select: { id: true, name: true, sku: true, price: true, stock: true, imageUrl: true } },
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

    // Identify variants to delete
    const submittedVariantIds = variants.map((variant) => variant.id).filter((id): id is string => Boolean(id));
    const variantsToDelete = currentProduct.variants.filter(
      (v) => !submittedVariantIds.includes(v.id)
    );

    const existingVariantIds = currentProduct.variants.map((v) => v.id);
    const currentVariantMap = new Map(currentProduct.variants.map((v) => [v.id, v]));

    // ── FAST BULK PARALLEL TRANSACTION ─────────────────────────
    await prisma.$transaction(async (tx) => {
      // 1. Update product base info
      await tx.product.update({
        where: { id: productId },
        data: {
          name,
          slug,
          status,
          description,
          overview,
          materials,
          care,
          cardHoverVideoUrl: cardHoverVideoUrl || null,
          cardHoverImageUrl: cardHoverImageUrl || null,
          categories: { set: categoryIds.map((id) => ({ id })) },
        },
      });

      // 2. Re-create product images in bulk
      await tx.productImage.deleteMany({ where: { productId } });
      if (orderedImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: orderedImageUrls.map((url, position) => ({
            productId,
            url,
            alt: name,
            position,
          })),
        });
      }

      // 3. Delete old inventories for existing variants in 1 bulk query
      if (existingVariantIds.length > 0) {
        await tx.warehouseInventory.deleteMany({
          where: { variantId: { in: existingVariantIds } },
        });
      }

      // 4. Delete removed variants in 1 bulk query
      if (variantsToDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: variantsToDelete.map((v) => v.id) } },
        });
      }

      // 5. Update/Create variants in parallel ONLY if fields actually changed
      const inventoryRows: { variantId: string; warehouseId: string; quantity: number }[] = [];
      const updatePromises: Promise<any>[] = [];

      for (const v of variants) {
        const inventories = Array.isArray(v.inventories)
          ? v.inventories
              .map((inv) => ({
                warehouseId: inv.warehouseId || "",
                quantity: Math.max(0, Math.floor(Number(inv.quantity) || 0)),
              }))
              .filter((inv) => inv.warehouseId && inv.quantity > 0)
          : [];
        const totalStock = inventories.reduce((sum, inv) => sum + inv.quantity, 0);

        let variantId = v.id;
        if (variantId) {
          const existingVariant = currentVariantMap.get(variantId);
          const hasChanged =
            !existingVariant ||
            existingVariant.name !== v.name ||
            existingVariant.sku !== v.sku ||
            Number(existingVariant.price) !== Number(v.price) ||
            existingVariant.stock !== totalStock ||
            (existingVariant.imageUrl || "") !== (v.imageUrl || "");

          if (hasChanged) {
            updatePromises.push(
              tx.productVariant.update({
                where: { id: variantId },
                data: {
                  name: v.name,
                  sku: v.sku,
                  price: v.price,
                  stock: totalStock,
                  imageUrl: v.imageUrl || null,
                },
              })
            );
          }
        } else {
          const createdVariant = await tx.productVariant.create({
            data: {
              productId,
              name: v.name,
              sku: v.sku,
              price: v.price,
              stock: totalStock,
              imageUrl: v.imageUrl || null,
              isActive: true,
            },
            select: { id: true },
          });
          variantId = createdVariant.id;
        }

        for (const inv of inventories) {
          inventoryRows.push({
            variantId: variantId!,
            warehouseId: inv.warehouseId,
            quantity: inv.quantity,
          });
        }
      }

      // Execute all changed variant updates in parallel
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
      }

      // 6. Insert all new inventories across all variants in 1 bulk query
      if (inventoryRows.length > 0) {
        await tx.warehouseInventory.createMany({
          data: inventoryRows,
        });
      }
    }, { maxWait: 10_000, timeout: 30_000 });

    invalidateAdminProductCache(productId);
    invalidateProductsListCache();
    if (process.env.NODE_ENV === "production") {
      revalidateTag("products");
    }

    const savedProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        images: { orderBy: { position: "asc" }, select: { url: true } },
      },
    });
    return NextResponse.json(savedProduct);
  } catch (error) {
    console.error("[UPDATE_PRODUCT_API_ERROR]", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
