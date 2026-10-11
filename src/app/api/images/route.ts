import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { db, uploadsDir } from "@/lib/db";
import { requireAdmin, handleApiError, slugFilename } from "@/lib/api-utils";
import type { Model, ModelImage } from "@/lib/types";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_SIZE = 15 * 1024 * 1024;

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const unassignedOnly = req.nextUrl.searchParams.get("unassigned") === "1";

    const images = db
      .prepare(
        unassignedOnly
          ? `SELECT * FROM images WHERE model_id IS NULL ORDER BY created_at DESC`
          : `SELECT * FROM images ORDER BY created_at DESC`
      )
      .all() as ModelImage[];

    return NextResponse.json({ images });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const explicitModelId = formData.get("modelId");
    const modelId = typeof explicitModelId === "string" && explicitModelId ? explicitModelId : null;

    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) throw new Error("לא נבחרו תמונות");

    const models = db.prepare(`SELECT * FROM models`).all() as Model[];

    const insert = db.prepare(
      `INSERT INTO images (id, model_id, original_name, filename, sort_order) VALUES (?, ?, ?, ?, ?)`
    );

    let assigned = 0;
    let unassigned = 0;

    for (const file of files) {
      if (!ALLOWED_TYPES.has(file.type)) continue;
      if (file.size > MAX_SIZE) continue;

      const storedName = slugFilename(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(path.join(uploadsDir, storedName), buffer);

      let targetModel = modelId;
      if (!targetModel) {
        const baseName = normalize(file.name.replace(/\.[^.]+$/, ""));
        const match = models.find(
          (m) =>
            (m.sku && normalize(m.sku) === baseName) ||
            normalize(m.name) === baseName ||
            (m.sku && baseName.includes(normalize(m.sku))) ||
            baseName.includes(normalize(m.name))
        );
        targetModel = match ? match.id : null;
      }

      insert.run(randomUUID(), targetModel, file.name, storedName, 0);
      if (targetModel) assigned++;
      else unassigned++;
    }

    return NextResponse.json({ assigned, unassigned, total: files.length });
  } catch (err) {
    return handleApiError(err);
  }
}
