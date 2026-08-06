import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ voucherId: string }> }
) {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voucherId } = await params;

    const existing = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    const newStatus = existing.status === "active" ? "paused" : "active";

    const updated = await prisma.voucher.update({
      where: { id: voucherId },
      data: { status: newStatus },
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error) {
    console.error("Error toggling voucher status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
