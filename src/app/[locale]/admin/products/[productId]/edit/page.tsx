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
        orderBy: { id: "asc" }
      },
    },
  });

  if (!product) {
    notFound();
  }

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
      imageUrl: v.imageUrl || "",
    })),
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl px-4 py-8">
      <div>
        <h1 className="text-3xl font-heading uppercase tracking-widest mb-2">Edit Product</h1>
        <p className="text-muted-foreground font-light text-sm">Update product details, variants, custom SKUs and SEO details</p>
      </div>
      <EditProductForm initialData={initialData} />
    </div>
  );
}
