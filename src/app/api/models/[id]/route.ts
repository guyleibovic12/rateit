import { NextRequest, NextResponse } from "next/server";
import { db, uploadsDir } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/api-utils";
import type { ModelImage } from "@/lib/types";
import fs from "node:fs/promises";
import path from "node:path";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    const existing = db.prepare(`SELECT * FROM models WHERE id = ?`).get(id);
    if (!existing) throw new Error("דגם לא נמצא");

    db.prepare(
      `UPDATE models SET name = ?, sku = ?, brand = ?, category = ?, notes = ?, active = ? WHERE id = ?`
    ).run(
      body.name !== undefined ? String(body.name).trim() : (existing as { name: string }).name,
      body.sku !== undefined ? String(body.sku || "").trim() || null : (existing as { sku: string | null }).sku,
      body.brand !== undefined ? String(body.brand || "").trim() || null : (existing as { brand: string | null }).brand,
      body.category !== undefined ? String(body.category || "").trim() || null : (existing as { category: string | null }).category,
      body.notes !== undefined ? String(body.notes || "").trim() || null : (existing as { notes: string | null }).notes,
      body.active !== undefined ? (body.active ? 1 : 0) : (existing as { active: number }).active,
      id
    );

    const model = db.prepare(`SELECT * FROM models WHERE id = ?`).get(id);
    return NextResponse.json({ model });
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

    const images = db
      .prepare(`SELECT * FROM images WHERE model_id = ?`)
      .all(id) as ModelImage[];

    for (const img of images) {
      await fs.unlink(path.join(uploadsDir, img.filename)).catch(() => {});
    }

    db.prepare(`DELETE FROM models WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
