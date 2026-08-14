import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { wouldCreateCategoryCycle } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { uploadFileToR2 } from "@/lib/r2";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { invalidateStorefrontCache } from "@/lib/storefront-cache";

const categorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(140).optional().default(""),
  description: z.string().trim().max(2000).optional().nullable(),
  heroImageUrl: z.string().trim().url().or(z.literal("")).optional().default(""),
  parentId: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().min(1).optional().nullable(),
  ),
  position: z.coerce.number().int().min(0).optional().default(0),
  isActive: z.enum(["true", "false"]).transform((value) => value === "true"),
});

async function authorized() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { categoryId } = await params;
  const formData = await req.formData();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category data", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const [current, categories] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { id: true } }),
    prisma.category.findMany({ select: { id: true, parentId: true } }),
  ]);
  if (!current) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  const data = parsed.data;
  const heroImage = formData.get("heroImage");
  if (heroImage instanceof File && heroImage.size === 0) {
    return NextResponse.json({ error: "The selected hero image is empty. Please choose the file again." }, { status: 400 });
  }
  if (heroImage instanceof File && (!heroImage.type.startsWith("image/") || heroImage.size > 10 * 1024 * 1024)) {
    return NextResponse.json({ error: "Hero image must be an image smaller than 10 MB" }, { status: 400 });
  }
  if (data.parentId && !categories.some((category) => category.id === data.parentId)) {
    return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
  }
  if (wouldCreateCategoryCycle(categories, categoryId, data.parentId || null)) {
    return NextResponse.json({ error: "A category cannot be moved inside itself or one of its children" }, { status: 409 });
  }
  const slug = slugify(data.slug || data.name);
  if (!slug) return NextResponse.json({ error: "A valid slug is required" }, { status: 400 });

  try {
    const heroImageUrl = heroImage instanceof File
      ? await uploadFileToR2(Buffer.from(await heroImage.arrayBuffer()), `categories/${heroImage.name}`, heroImage.type)
      : data.heroImageUrl || null;
    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: data.name,
        slug,
        description: data.description || null,
        heroImageUrl,
        parentId: data.parentId || null,
        position: data.position,
        isActive: data.isActive,
      },
      include: { _count: { select: { products: true, children: true } } },
    });
    invalidateStorefrontCache();
    return NextResponse.json({ category });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Category slug already exists" }, { status: 409 });
    }
    console.error("[CATEGORY_UPDATE]", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ categoryId: string }> }) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { categoryId } = await params;
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { children: true, products: true } } },
  });
  if (!category) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  if (category._count.children > 0) {
    return NextResponse.json({ error: "Move or delete child categories first", code: "CATEGORY_HAS_CHILDREN" }, { status: 409 });
  }
  if (category._count.products > 0) {
    return NextResponse.json({ error: "Remove assigned products first", code: "CATEGORY_HAS_PRODUCTS" }, { status: 409 });
  }
  await prisma.category.delete({ where: { id: categoryId } });
  invalidateStorefrontCache();
  return NextResponse.json({ success: true });
}
