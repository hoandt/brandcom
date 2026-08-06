import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EditProductForm from "./edit-form";

export default async function EditProductPage(
  props: {
    params: Promise<{ productId: string }>;
  }
) {
  const params = await props.params;
  const product = await prisma.product.findUnique({
    where: { id: params.productId },
    include: {
      images: {
        orderBy: { position: "asc" },
      },
      variants: {
        orderBy: { id: "asc" },
        include: { inventories: true },
      },
    },
  });

  if (!product) {
    notFound();
  }

  const warehouses = await prisma.warehouse.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: { id: true, name: true, code: true, isDefault: true, isPickup: true },
  });

  // Map product database structure including all variants and new SEO fields to form props
  const initialData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    overview: product.overview || "",
    materials: product.materials || "",
    care: product.care || "",
    images: product.images.map((img) => img.url),
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: parseFloat(v.price.toString()),
      stock: v.stock,
      inventories: v.inventories.map((inventory) => ({
        warehouseId: inventory.warehouseId,
        quantity: inventory.quantity,
      })),
      imageUrl: v.imageUrl || "",
    })),
    warehouses,
  };
  return (
    <div className="flex flex-col gap-4 w-full max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Product</h1>
        <p className="text-muted-foreground text-xs">Update product details, variants, custom SKUs and SEO details</p>
      </div>
      <EditProductForm initialData={initialData} />
    </div>
  );
}
