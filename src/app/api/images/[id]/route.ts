import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { db, uploadsDir } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/api-utils";
import type { ModelImage } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const modelId = body.modelId ? String(body.modelId) : null;
    db.prepare(`UPDATE images SET model_id = ? WHERE id = ?`).run(modelId, id);

    const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(id);
    return NextResponse.json({ image });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const image = db.prepare(`SELECT * FROM images WHERE id = ?`).get(id) as
      | ModelImage
      | undefined;
    if (image) {
      await fs.unlink(path.join(uploadsDir, image.filename)).catch(() => {});
      db.prepare(`DELETE FROM images WHERE id = ?`).run(id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
