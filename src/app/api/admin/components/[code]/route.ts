import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { isHomepageMediaType, validateHomepageMedia } from "@/lib/homepage-media";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidateDynamicComponentCache } from "@/lib/dynamic-components";
import { revalidatePath } from "next/cache";

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
