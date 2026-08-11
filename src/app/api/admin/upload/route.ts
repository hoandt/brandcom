import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin-access";
import { uploadFileToR2 } from "@/lib/r2";
import { NextResponse } from "next/server";

async function authorized() {
  const session = await auth();
  return isAdminEmail(session?.user?.email);
}

export async function POST(req: Request) {
  if (!(await authorized())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const url = await uploadFileToR2(buffer, file.name, file.type || "application/octet-stream");

    return NextResponse.json({ url, fileName: file.name });
  } catch (error) {
    console.error("[ADMIN_UPLOAD_ERROR]", error);
    return NextResponse.json({ error: "Failed to upload file to Cloudflare R2" }, { status: 500 });
  }
}
