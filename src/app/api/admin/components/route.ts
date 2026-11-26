import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { invalidateDynamicComponentCache } from "@/lib/dynamic-components";
import { isHomepageMediaType, validateHomepageMedia } from "@/lib/homepage-media";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { PRODUCT_PROMOTION_CODE } from "@/lib/product-promotion";

export async function GET() {
  if (!isAdminEmail((await auth())?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const components = await prisma.dynamicComponent.findMany({
      where: {
        code: {
          not: "theme-settings"
        }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(components);
  } catch (error) {
    console.error("[GET_COMPONENTS_ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch components" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAdminEmail((await auth())?.user?.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { code, name, type, content, isActive } = (await req.json().catch(() => null)) ?? {};

    if (typeof code !== "string" || !code || typeof name !== "string" || !name ||
        typeof type !== "string" || !type ||
        (isActive !== undefined && typeof isActive !== "boolean")) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (code === PRODUCT_PROMOTION_CODE || type === PRODUCT_PROMOTION_CODE) {
      return NextResponse.json({ error: "Use the Product Page Promotions component editor." }, { status: 400 });
    }

    let savedContent = content ?? {};
    if (isHomepageMediaType(code) || isHomepageMediaType(type)) {
      const result = validateHomepageMedia(code, type, savedContent);
      if (!result.content) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      savedContent = result.content;
    }

    const component = await prisma.dynamicComponent.create({
      data: {
        code,
        name,
        type,
        content: savedContent,
        isActive: isActive ?? true,
      },
    });

    invalidateDynamicComponentCache(code);
    revalidatePath("/", "layout");
    return NextResponse.json(component);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "Component with this code already exists" }, { status: 400 });
    }
    console.error("[CREATE_COMPONENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to create component" }, { status: 500 });
  }
}
