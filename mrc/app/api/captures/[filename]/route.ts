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
    const cwd = process.cwd();
    const candidatePaths = [
      path.join(cwd, "public", "uploads", "captures", safeName),
      path.join(cwd, "mrc", "public", "uploads", "captures", safeName),
      path.join(cwd, "..", "mrc", "public", "uploads", "captures", safeName),
    ];

    const filePath = candidatePaths.find((p) => fs.existsSync(p));

    if (!filePath) {
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
