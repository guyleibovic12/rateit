import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/api-utils";

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    await requireUser();
    const { filename } = await params;

    if (filename.includes("..") || filename.includes("/")) {
      return NextResponse.json({ error: "שם קובץ לא חוקי" }, { status: 400 });
    }

    const filePath = path.join(uploadsDir, filename);
    const buffer = await fs.readFile(filePath);
    const ext = filename.split(".").pop()?.toLowerCase() || "";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "ENOENT") {
      return NextResponse.json({ error: "קובץ לא נמצא" }, { status: 404 });
    }
    return handleApiError(err);
  }
}
