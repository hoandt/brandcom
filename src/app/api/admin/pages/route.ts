import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(pages);
  } catch (error) {
    console.error("[GET_PAGES_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch pages" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { slug, title, content, isActive } = await req.json();

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Ensure slug is clean
    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");

    // Check if page with same slug exists
    const existing = await prisma.page.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    const page = await prisma.page.create({
      data: {
        slug: cleanSlug,
        title,
        content,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("[CREATE_PAGE_ERROR]", error);
    return NextResponse.json({ error: "Failed to create page" }, { status: 500 });
  }
}
