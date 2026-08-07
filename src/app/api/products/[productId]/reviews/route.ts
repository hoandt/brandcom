import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(100),
  body: z.string().trim().min(20).max(3000),
});

export async function GET(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const sort = searchParams.get("sort") === "recent" ? "recent" : "helpful";
  const take = 6;
  const session = await auth();
  const viewerId = session?.user?.id;

  const where = { productId, status: "APPROVED" as const };
  const [reviews, allRatings] = await prisma.$transaction([
    prisma.productReview.findMany({
      where,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        isVerifiedPurchase: true,
        createdAt: true,
        user: { select: { name: true } },
        helpfulVotes: { where: { userId: viewerId ?? "__anonymous__" }, select: { userId: true } },
        _count: { select: { helpfulVotes: true } },
      },
      orderBy: sort === "recent"
        ? [{ createdAt: "desc" }]
        : [{ helpfulVotes: { _count: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * take,
      take,
    }),
    prisma.productReview.findMany({ where, select: { rating: true } }),
  ]);

  const distribution = Object.fromEntries([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
  for (const review of allRatings) distribution[review.rating] += 1;
  const total = allRatings.length;
  const ratingSum = allRatings.reduce((sum, review) => sum + review.rating, 0);

  return NextResponse.json({
    reviews: reviews.map(({ helpfulVotes, _count, user, ...review }) => ({
      ...review,
      authorName: user.name?.trim() || "Customer",
      helpfulCount: _count.helpfulVotes,
      viewerFoundHelpful: Boolean(viewerId && helpfulVotes.some((vote) => vote.userId === viewerId)),
    })),
    summary: { total, average: total ? ratingSum / total : 0, distribution },
    pagination: { page, pageCount: Math.ceil(total / take) },
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ productId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to write a review" }, { status: 401 });

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid review" }, { status: 400 });

  const { productId } = await params;
  const variantIds = await prisma.productVariant.findMany({ where: { productId }, select: { id: true } });
  if (!variantIds.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  const verifiedOrder = await prisma.order.findFirst({
    where: {
      userId: session.user.id,
      orderStatus: { in: ["DELIVERED", "COMPLETED"] },
      items: { some: { variantId: { in: variantIds.map((variant) => variant.id) } } },
    },
    select: { id: true },
  });

  try {
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId: session.user.id,
        ...parsed.data,
        isVerifiedPurchase: Boolean(verifiedOrder),
      },
    });
    return NextResponse.json({ review, message: "Review submitted for moderation" }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 });
    }
    throw error;
  }
}
