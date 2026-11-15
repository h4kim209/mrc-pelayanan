import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

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

      // Format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
      const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return NextResponse.json({ error: "Invalid base64 image data" }, { status: 400 });
      }

      const ext = matches[1].includes("png") ? "png" : "jpg";
      const buffer = Buffer.from(matches[2], "base64");
      const fileName = `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

      const uploadDir = path.join(process.cwd(), "public", "uploads", "captures");
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
    const uploadDir = path.join(process.cwd(), "public", "assets", "img");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const filePath = path.join(uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return NextResponse.json({ success: true, path: `/assets/img/${fileName}` });
  } catch (err: any) {
    console.error("Error in POST /api/upload:", err);
    return NextResponse.json({ error: "Upload failed", detail: String(err) }, { status: 500 });
  }
}
