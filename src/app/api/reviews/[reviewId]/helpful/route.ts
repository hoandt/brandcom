import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(_: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to vote" }, { status: 401 });
  const { reviewId } = await params;
  const key = { reviewId_userId: { reviewId, userId: session.user.id } };
  const existing = await prisma.reviewHelpfulVote.findUnique({ where: key });

  if (existing) {
    await prisma.reviewHelpfulVote.delete({ where: { id: existing.id } });
  } else {
    const review = await prisma.productReview.findFirst({ where: { id: reviewId, status: "APPROVED" }, select: { id: true } });
    if (!review) return NextResponse.json({ error: "Review not found" }, { status: 404 });
    await prisma.reviewHelpfulVote.create({ data: { reviewId, userId: session.user.id } });
  }

  const helpfulCount = await prisma.reviewHelpfulVote.count({ where: { reviewId } });
  return NextResponse.json({ helpfulCount, viewerFoundHelpful: !existing });
}
