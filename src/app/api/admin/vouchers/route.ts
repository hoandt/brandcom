import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { usages: true } },
      },
    });
    return NextResponse.json({ vouchers });
  } catch (error) {
    console.error("Error fetching admin vouchers:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!isAdminEmail(session?.user?.email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      tenantId = DEFAULT_TENANT_ID,
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

    if (!name || !code || !status || !startsAt || !endsAt || !benefit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const normalizedCode = code.trim().toUpperCase();

    // Check if code already exists for this tenant
    const existing = await prisma.voucher.findFirst({
      where: {
        tenantId,
        code: normalizedCode,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Voucher code already exists for this tenant" }, { status: 409 });
    }

    const voucher = await prisma.voucher.create({
      data: {
        tenantId,
        name,
        description: description || null,
        code: normalizedCode,
        status,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        minimumCartSubtotal: minimumCartSubtotal !== undefined && minimumCartSubtotal !== null ? Number(minimumCartSubtotal) : null,
        benefit,
        productIds: Array.isArray(productIds) ? productIds : [],
        totalUsageLimit: totalUsageLimit !== undefined && totalUsageLimit !== null ? Number(totalUsageLimit) : null,
        usagePerCustomer: usagePerCustomer !== undefined && usagePerCustomer !== null ? Number(usagePerCustomer) : null,
      },
    });

    return NextResponse.json({ success: true, voucher });
  } catch (error) {
    console.error("Error creating admin voucher:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
