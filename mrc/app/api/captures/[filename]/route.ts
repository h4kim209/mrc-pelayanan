import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename) {
      return new NextResponse("File not found", { status: 404 });
    }

    // Sanitize filename to prevent directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), "public", "uploads", "captures", safeName);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : "image/jpeg";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    console.error("Error serving capture file:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
