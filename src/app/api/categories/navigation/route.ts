import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const rows = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      position: true,
      isActive: true,
      _count: { select: { products: { where: { status: "ACTIVE" } } } },
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } },
      },
    },
  });
  const categories = rows.map(({ products, ...category }) => ({
    ...category,
    imageUrl: products.flatMap((product) => product.images).find((image) => image.url)?.url ?? null,
  }));

  return NextResponse.json(
    { categories },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
