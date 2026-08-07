import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const statusParam = new URL(request.url).searchParams.get("status") || "PENDING";
  const status = ["PENDING", "APPROVED", "REJECTED"].includes(statusParam) ? statusParam as "PENDING" | "APPROVED" | "REJECTED" : "PENDING";
  const [reviews, pendingCount, approvedCount, rejectedCount] = await prisma.$transaction([
    prisma.productReview.findMany({
      where: { status },
      include: { product: { select: { name: true } }, user: { select: { name: true, email: true, phone: true } }, _count: { select: { helpfulVotes: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.productReview.count({ where: { status: "PENDING" } }),
    prisma.productReview.count({ where: { status: "APPROVED" } }),
    prisma.productReview.count({ where: { status: "REJECTED" } }),
  ]);
  return NextResponse.json({ reviews, counts: { PENDING: pendingCount, APPROVED: approvedCount, REJECTED: rejectedCount } });
}
