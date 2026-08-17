import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
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
  try {
    const { code, name, type, content, isActive } = await req.json();

    if (!code || !name || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const existing = await prisma.dynamicComponent.findUnique({
      where: { code },
    });

    if (existing) {
      return NextResponse.json({ error: "Component with this code already exists" }, { status: 400 });
    }

    const component = await prisma.dynamicComponent.create({
      data: {
        code,
        name,
        type,
        content: content || {},
        isActive: isActive ?? true,
      },
    });

    return NextResponse.json(component);
  } catch (error) {
    console.error("[CREATE_COMPONENT_ERROR]", error);
    return NextResponse.json({ error: "Failed to create component" }, { status: 500 });
  }
}
