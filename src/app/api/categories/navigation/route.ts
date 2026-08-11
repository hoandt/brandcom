import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

let navCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 300_000; // 5 minutes

export async function GET() {
  if (navCache && Date.now() - navCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(navCache.data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" },
    });
  }

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

  const data = { categories };
  navCache = { data, timestamp: Date.now() };

  return NextResponse.json(
    data,
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } }
  );
}
