import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const page = await prisma.page.findUnique({
      where: { id },
    });

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json(page);
  } catch (error) {
    console.error("[GET_PAGE_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch page" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { slug, title, content, isActive } = await req.json();

    if (!slug || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");

    // Check if slug is unique (excluding current page)
    const existing = await prisma.page.findFirst({
      where: {
        slug: cleanSlug,
        NOT: { id },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 });
    }

    const page = await prisma.page.update({
      where: { id },
      data: {
        slug: cleanSlug,
        title,
        content,
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error("[UPDATE_PAGE_ERROR]", error);
    return NextResponse.json({ error: "Failed to update page" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.page.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE_PAGE_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
  }
}
