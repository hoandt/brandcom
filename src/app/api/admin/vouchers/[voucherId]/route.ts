import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ voucherId: string }> }
) {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voucherId } = await params;

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      include: {
        _count: { select: { usages: true } },
      },
    });

    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    return NextResponse.json({ voucher });
  } catch (error) {
    console.error("Error fetching admin voucher:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ voucherId: string }> }
) {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { voucherId } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      name,
      description,
      code,
      status,
      startsAt,
      endsAt,
      minimumCartSubtotal,
      benefit,
      productIds,
      totalUsageLimit,
      usagePerCustomer,
    } = body;

    const existing = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (code) {
      const normalizedCode = code.trim().toUpperCase();
      if (normalizedCode !== existing.code) {
        const codeExists = await prisma.voucher.findFirst({
          where: {
            tenantId: existing.tenantId,
            code: normalizedCode,
          },
        });
        if (codeExists) {
          return NextResponse.json({ error: "Voucher code already exists for this tenant" }, { status: 409 });
        }
      }
    }

    const updated = await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? (description === null ? null : description) : undefined,
        code: code ? code.trim().toUpperCase() : undefined,
        status: status !== undefined ? status : undefined,
        startsAt: startsAt ? new Date(startsAt) : undefined,
        endsAt: endsAt ? new Date(endsAt) : undefined,
        minimumCartSubtotal: minimumCartSubtotal !== undefined ? (minimumCartSubtotal === null ? null : Number(minimumCartSubtotal)) : undefined,
        benefit: benefit !== undefined ? benefit : undefined,
        productIds: productIds !== undefined ? (Array.isArray(productIds) ? productIds : []) : undefined,
        totalUsageLimit: totalUsageLimit !== undefined ? (totalUsageLimit === null ? null : Number(totalUsageLimit)) : undefined,
        usagePerCustomer: usagePerCustomer !== undefined ? (usagePerCustomer === null ? null : Number(usagePerCustomer)) : undefined,
      },
    });

    return NextResponse.json({ success: true, voucher: updated });
  } catch (error) {
    console.error("Error updating admin voucher:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
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
      include: { usages: { take: 1 } },
    });

    if (!existing) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    if (existing.usages.length > 0 || existing.consumedQuantity > 0) {
      return NextResponse.json(
        { error: "Cannot delete voucher that has been used. Please pause it instead." },
        { status: 400 }
      );
    }

    await prisma.voucher.delete({
      where: { id: voucherId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting admin voucher:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST: Duplicate a voucher
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

    const source = await prisma.voucher.findUnique({
      where: { id: voucherId },
    });

    if (!source) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Generate a unique code suffix
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `${source.code}-${suffix}`;

    const duplicate = await prisma.voucher.create({
      data: {
        tenantId: source.tenantId,
        name: `${source.name} (Copy)`,
        description: source.description,
        code: newCode,
        status: "draft",
        startsAt: source.startsAt,
        endsAt: source.endsAt,
        minimumCartSubtotal: source.minimumCartSubtotal,
        benefit: source.benefit as any,
        productIds: source.productIds,
        totalUsageLimit: source.totalUsageLimit,
        usagePerCustomer: source.usagePerCustomer,
      },
    });

    return NextResponse.json({ success: true, voucher: duplicate });
  } catch (error) {
    console.error("Error duplicating admin voucher:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
