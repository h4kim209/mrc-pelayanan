import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

function getUploadDir(subfolder: string): string {
  const cwd = process.cwd();
  const primary = path.join(cwd, "public", subfolder);
  if (fs.existsSync(path.join(cwd, "public"))) {
    return primary;
  }
  const inMrc = path.join(cwd, "mrc", "public", subfolder);
  if (fs.existsSync(path.join(cwd, "mrc", "public"))) {
    return inMrc;
  }
  const parentMrc = path.join(cwd, "..", "mrc", "public", subfolder);
  if (fs.existsSync(path.join(cwd, "..", "mrc", "public"))) {
    return parentMrc;
  }
  return primary;
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    // 1. Handle JSON base64 data URL
    if (contentType.includes("application/json")) {
      const body = await req.json();
      const { image, type = "capture" } = body;

      if (!image || typeof image !== "string") {
        return NextResponse.json({ error: "No image data provided" }, { status: 400 });
      }

      let ext = "jpg";
      let base64Data = image;

      const commaIndex = image.indexOf(",");
      if (commaIndex !== -1) {
        const meta = image.substring(0, commaIndex);
        base64Data = image.substring(commaIndex + 1);
        if (meta.includes("png")) ext = "png";
        else if (meta.includes("webp")) ext = "webp";
      }

      const buffer = Buffer.from(base64Data.replace(/[\r\n\s]/g, ""), "base64");
      if (buffer.length === 0) {
        return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
      }

      const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const uploadDir = getUploadDir(path.join("uploads", "captures"));

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      return NextResponse.json({
        success: true,
        path: `/api/captures/${fileName}`,
        fileName,
      });
    }

    // 2. Handle standard multipart form data
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // @ts-ignore
    const arrayBuffer = await file.arrayBuffer();
    // @ts-ignore
    const fileName = file.name || `${Date.now()}.png`;
    const buffer = Buffer.from(arrayBuffer);
    const uploadDir = getUploadDir(path.join("assets", "img"));
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ success: true, path: `/assets/img/${fileName}` });
  } catch (err: any) {
    console.error("Error in POST /api/upload:", err);
    return NextResponse.json({
      error: "Upload failed",
      detail: err?.message || String(err),
    }, { status: 500 });
  }
}
