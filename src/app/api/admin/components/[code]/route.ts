import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { invalidateDynamicComponentCache } from "@/lib/dynamic-components";
import { revalidatePath } from "next/cache";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
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
  try {
    const { code } = await params;
    const { name, type, content, isActive } = await req.json();

    const component = await prisma.dynamicComponent.update({
      where: { code },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(content !== undefined && { content }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    invalidateDynamicComponentCache(code);
    revalidatePath("/", "layout");

    return NextResponse.json(component);
  } catch (error) {
    console.error("[UPDATE_COMPONENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
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
