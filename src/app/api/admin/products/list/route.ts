import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";

// Lightweight product list for selectors (voucher product targeting, etc.)
export async function GET() {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        images: {
          orderBy: { position: "asc" },
          take: 1,
          select: { url: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Error fetching product list:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
