import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { isHomepageMediaType, validateHomepageMedia } from "@/lib/homepage-media";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidateDynamicComponentCache } from "@/lib/dynamic-components";
import { revalidatePath } from "next/cache";
import {
  defaultProductPromotion,
  PRODUCT_PROMOTION_CODE,
  PRODUCT_PROMOTION_NAME,
  validateProductPromotion,
} from "@/lib/product-promotion";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminEmail((await auth())?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await params;
    const component = await prisma.dynamicComponent.findUnique({
      where: { code },
    });

    if (!component && code === PRODUCT_PROMOTION_CODE) {
      return NextResponse.json({
        code,
        type: code,
        name: PRODUCT_PROMOTION_NAME,
        content: defaultProductPromotion,
        isActive: true,
      });
    }

    if (!component) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(component);
  } catch (error) {
    console.error("[GET_COMPONENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch component" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminEmail((await auth())?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid component payload" }, { status: 400 });
    }
    const { name, type, content, isActive } = body;
    if ((name !== undefined && (typeof name !== "string" || !name.trim())) ||
        (type !== undefined && (typeof type !== "string" || !type)) ||
        (isActive !== undefined && typeof isActive !== "boolean")) {
      return NextResponse.json({ error: "Invalid component fields" }, { status: 400 });
    }

    if (code === PRODUCT_PROMOTION_CODE) {
      const result = validateProductPromotion(content === undefined ? defaultProductPromotion : content);
      if (!result.content || (type !== undefined && type !== code)) {
        return NextResponse.json({ error: result.error ?? "Invalid promotion component type." }, { status: 400 });
      }
      const component = await prisma.dynamicComponent.upsert({
        where: { code },
        create: {
          code,
          type: code,
          name: name ?? PRODUCT_PROMOTION_NAME,
          content: result.content,
          isActive: isActive ?? true,
        },
        update: {
          type: code,
          ...(content !== undefined && { content: result.content }),
          ...(name !== undefined && { name }),
          ...(isActive !== undefined && { isActive }),
        },
      });
      revalidatePath("/[locale]/products/[slug]", "page");
      return NextResponse.json(component);
    }

    if (type === PRODUCT_PROMOTION_CODE) {
      return NextResponse.json({ error: "Use the Product Page Promotions component." }, { status: 400 });
    }

    let savedContent = content;
    if (isHomepageMediaType(code) || isHomepageMediaType(type)) {
      const result = validateHomepageMedia(code, type ?? code, content ?? {});
      if (!result.content) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      if (content !== undefined) savedContent = result.content;
    }

    const component = await prisma.dynamicComponent.update({
      where: { code },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(savedContent !== undefined && { content: savedContent }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    invalidateDynamicComponentCache(code);
    revalidatePath("/", "layout");

    return NextResponse.json(component);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[UPDATE_COMPONENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  if (!isAdminEmail((await auth())?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code } = await params;
    if (code === PRODUCT_PROMOTION_CODE) {
      return NextResponse.json({ error: "Deactivate Product Page Promotions from its editor." }, { status: 405 });
    }
    await prisma.dynamicComponent.delete({
      where: { code },
    });

    invalidateDynamicComponentCache(code);
    revalidatePath("/", "layout");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DELETE_COMPONENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to delete component" }, { status: 500 });
  }
}
