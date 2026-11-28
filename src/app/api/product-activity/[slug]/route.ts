import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductPromotion } from "@/lib/product-promotion.server";
import { DEFAULT_TENANT_ID } from "@/lib/store-settings";
import { noStoreHeaders, storefrontCache } from "@/lib/storefront-cache";

type Context = { params: Promise<{ slug: string }> };
const recentWindowMs = 15 * 60_000;
const presenceLifetimeMs = 35_000;
const presenceStore = globalThis as typeof globalThis & {
  auriaProductPresence?: Map<string, Map<string, number>>;
  auriaPresenceSweptAt?: number;
};
const presence = presenceStore.auriaProductPresence ??= new Map();

async function loadFlashVoucher(code: string | undefined, productId: string, now: Date) {
  if (!code) return null;
  const voucher = await prisma.voucher.findUnique({
    where: { tenantId_code: { tenantId: DEFAULT_TENANT_ID, code: code.toUpperCase() } },
    select: {
      code: true, name: true, status: true, startsAt: true, endsAt: true, productIds: true,
      minimumCartSubtotal: true, totalUsageLimit: true, consumedQuantity: true,
      benefit: true,
    },
  });
  if (!voucher || voucher.status !== "active" || voucher.startsAt > now || voucher.endsAt <= now) return null;
  if (voucher.productIds.length && !voucher.productIds.includes(productId)) return null;
  if (voucher.totalUsageLimit !== null && voucher.consumedQuantity >= voucher.totalUsageLimit) return null;
  const benefit = voucher.benefit as { scope?: string; type?: string } | null;
  return {
    code: voucher.code,
    name: voucher.name,
    endsAt: voucher.endsAt.toISOString(),
    minimumCartSubtotal: voucher.minimumCartSubtotal,
    isFreeShipping: benefit?.scope === "shipping" && benefit.type === "free_shipping",
  };
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  try {
    const [product, promotion] = await Promise.all([
      prisma.product.findUnique({
        where: { slug, status: "ACTIVE" },
        select: { id: true, variants: { select: { id: true, stock: true, price: true, isActive: true } } },
      }),
      getProductPromotion(slug),
    ]);
    if (!product) return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 404 });
    const activeVariants = product.variants.filter((variant) => variant.isActive);
    const stock = Object.fromEntries(activeVariants.map((variant) => [variant.id, variant.stock]));
    const prices = Object.fromEntries(activeVariants.map((variant) => [variant.id, Number(variant.price)]));

    const now = new Date();
    const variantIds = product.variants.map((variant) => variant.id);
    const [sales, recent, campaign] = await Promise.all([
      storefrontCache(`product-sold:${product.id}`, 300, () => prisma.orderItem.aggregate({
        where: { variantId: { in: variantIds }, order: { orderStatus: { in: ["DELIVERED", "COMPLETED"] } } },
        _sum: { quantity: true },
      })),
      !promotion?.enabled || promotion.purchaseToast === false ? null : storefrontCache(`product-recent-purchases:${product.id}`, 15, () => prisma.order.aggregate({
        where: {
          items: { some: { variantId: { in: variantIds } } },
          orderStatus: { in: ["PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED"] },
          createdAt: { gte: new Date(now.getTime() - recentWindowMs) },
        },
        _count: { _all: true },
        _max: { createdAt: true },
      })),
      promotion?.enabled ? loadFlashVoucher(promotion.flashVoucherCode, product.id, now) : null,
    ]);
    return NextResponse.json({
      stock,
      prices,
      sold: sales._sum.quantity ?? 0,
      recent: recent?._max.createdAt && now.getTime() - recent._max.createdAt.getTime() < recentWindowMs
        ? { count: recent._count._all, latestMinute: Math.floor(recent._max.createdAt.getTime() / 60_000) } : null,
      campaign,
      announcement: promotion?.enabled ? promotion.announcement : undefined,
      expressShipping: promotion?.enabled ? promotion.expressShipping : undefined,
    }, { headers: noStoreHeaders });
  } catch (error) {
    console.error("[PRODUCT_ACTIVITY_ERROR]", error);
    return NextResponse.json({ error: "Không thể tải thông tin sản phẩm" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Context) {
  const { slug } = await params;
  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 256 || !request.headers.get("content-type")?.startsWith("application/json")) {
    return NextResponse.json({ error: "Invalid presence request" }, { status: 400 });
  }
  const body: unknown = await request.json().catch(() => null);
  const visit = body && typeof body === "object" && "visit" in body ? body.visit : null;
  if (typeof visit !== "string" || !/^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(visit) ||
    !/^[\p{L}\p{N}_-]{1,180}$/u.test(slug)) {
    return NextResponse.json({ error: "Invalid presence request" }, { status: 400 });
  }

  const now = Date.now();
  if (now - (presenceStore.auriaPresenceSweptAt ?? 0) >= 10_000) {
    for (const [product, visits] of presence) {
      for (const [id, expiresAt] of visits) {
        if (expiresAt <= now) visits.delete(id);
      }
      if (!visits.size) presence.delete(product);
    }
    presenceStore.auriaPresenceSweptAt = now;
  }
  const visits = presence.get(slug) ?? new Map<string, number>();
  for (const [id, expiresAt] of visits) {
    if (expiresAt <= now) visits.delete(id);
  }
  if (presence.size < 200 || presence.has(slug)) {
    if (visits.size < 1000 || visits.has(visit)) visits.set(visit, now + presenceLifetimeMs);
    presence.set(slug, visits);
  }
  return NextResponse.json({ viewers: Math.max(1, visits.size) }, { headers: noStoreHeaders });
}
