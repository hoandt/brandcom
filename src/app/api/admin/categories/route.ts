import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { uploadFileToR2 } from "@/lib/r2";
import { Prisma } from "@/generated/prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

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

let categoriesCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL_MS = 60_000;

export function invalidateCategoriesCache() {
  categoriesCache = null;
}

export async function GET() {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (categoriesCache && Date.now() - categoriesCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(categoriesCache.data);
  }

  const categories = await prisma.category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });
  const data = { categories };
  categoriesCache = { data, timestamp: Date.now() };
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await authorized())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const formData = await req.formData();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid category data", fields: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const data = parsed.data;
  const heroImage = formData.get("heroImage");
  if (heroImage instanceof File && heroImage.size === 0) {
    return NextResponse.json({ error: "The selected hero image is empty. Please choose the file again." }, { status: 400 });
  }
  if (heroImage instanceof File && (!heroImage.type.startsWith("image/") || heroImage.size > 10 * 1024 * 1024)) {
    return NextResponse.json({ error: "Hero image must be an image smaller than 10 MB" }, { status: 400 });
  }
  const slug = slugify(data.slug || data.name);
  if (!slug) return NextResponse.json({ error: "A valid slug is required" }, { status: 400 });
  if (data.parentId && !(await prisma.category.findUnique({ where: { id: data.parentId }, select: { id: true } }))) {
    return NextResponse.json({ error: "Parent category not found" }, { status: 400 });
  }

  try {
    const heroImageUrl = heroImage instanceof File
      ? await uploadFileToR2(Buffer.from(await heroImage.arrayBuffer()), `categories/${heroImage.name}`, heroImage.type)
      : data.heroImageUrl || null;
    const category = await prisma.category.create({
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
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Category slug already exists" }, { status: 409 });
    }
    console.error("[CATEGORY_CREATE]", error);
    return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
  }
}
