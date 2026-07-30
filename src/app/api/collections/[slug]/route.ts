import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // Removed artificial delay for faster loading
    // Base query options
    const queryOptions: any = {
      where: {
        status: "ACTIVE"
      },
      include: {
        variants: {
          where: { isActive: true }
        },
        images: {
          orderBy: { position: "asc" },
          take: 1,
        },
      }
    };

    if (slug === "new") {
      queryOptions.orderBy = { createdAt: "desc" };
      queryOptions.take = 24; // Limit to 24 new arrivals
    } else {
       // "all" or generic
       queryOptions.orderBy = { createdAt: "desc" };
    }

    const products = await prisma.product.findMany(queryOptions);
    return NextResponse.json({ success: true, data: products });
    
  } catch (error) {
    console.error("[COLLECTIONS_API_ERROR]", error);
    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
