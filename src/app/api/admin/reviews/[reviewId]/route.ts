import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]) });

export async function PATCH(request: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  const { reviewId } = await params;
  const review = await prisma.productReview.update({ where: { id: reviewId }, data: parsed.data });
  return NextResponse.json({ review });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ reviewId: string }> }) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reviewId } = await params;
  await prisma.productReview.delete({ where: { id: reviewId } });
  return NextResponse.json({ success: true });
}
