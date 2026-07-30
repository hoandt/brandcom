import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    // Determine if request is FormData or JSON
    const contentType = request.headers.get("content-type") || "";
    let name, email, password;

    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      name = formData.get("name") as string;
      email = formData.get("email") as string;
      password = formData.get("password") as string;
    } else {
      const body = await request.json();
      name = body.name;
      email = body.email;
      password = body.password;
    }

    if (!email || !password) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // In a real app we might want to redirect back with an error query param
      // if coming from a form submission, or just return JSON.
      // Returning JSON for now.
      return NextResponse.json(
        { message: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // If it was a form post, redirect to login
    if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const referer = request.headers.get("referer") || "";
      const localeMatch = referer.match(/\/(en|vi|th)/);
      const localePrefix = localeMatch ? localeMatch[0] : "";
      return NextResponse.redirect(new URL(`${localePrefix}/login?registered=true`, request.url), 303);
    }

    return NextResponse.json({
      message: "User created successfully",
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("[REGISTER_ERROR]", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
