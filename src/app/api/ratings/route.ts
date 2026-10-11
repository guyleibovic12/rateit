import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    const user = await requireUser();

    interface MyRatingRow {
      score: number;
      updated_at: string;
      modelId: string;
      modelName: string;
      modelSku: string | null;
      modelBrand: string | null;
    }

    const rows = db
      .prepare(
        `SELECT r.score, r.updated_at,
                m.id as modelId, m.name as modelName, m.sku as modelSku, m.brand as modelBrand
         FROM ratings r
         JOIN models m ON m.id = r.model_id
         WHERE r.user_id = ?
         ORDER BY r.updated_at DESC`
      )
      .all(user.id) as MyRatingRow[];

    const images = db
      .prepare(`SELECT model_id, filename FROM images WHERE model_id IS NOT NULL ORDER BY sort_order ASC`)
      .all() as { model_id: string; filename: string }[];
    const firstImageByModel = new Map<string, string>();
    for (const img of images) {
      if (!firstImageByModel.has(img.model_id)) firstImageByModel.set(img.model_id, img.filename);
    }

    const totalModels = db.prepare(`SELECT COUNT(*) as c FROM models WHERE active = 1`).get() as {
      c: number;
    };

    const ratings = rows.map((r) => ({
      ...r,
      image: firstImageByModel.get(r.modelId) || null,
    }));

    const byScore = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const r of rows) byScore[r.score]++;

    return NextResponse.json({
      ratings,
      totals: { rated: rows.length, totalModels: totalModels.c, byScore },
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const modelId = String(body.modelId || "");
    const score = Number(body.score);

    if (!modelId) throw new Error("חובה לציין דגם");
    if (!Number.isInteger(score) || score < 1 || score > 3) {
      throw new Error("ציון חייב להיות בין 1 ל-3");
    }

    const model = db.prepare(`SELECT id FROM models WHERE id = ?`).get(modelId);
    if (!model) throw new Error("דגם לא נמצא");

    const existing = db
      .prepare(`SELECT id FROM ratings WHERE user_id = ? AND model_id = ?`)
      .get(user.id, modelId) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        `UPDATE ratings SET score = ?, updated_at = datetime('now') WHERE id = ?`
      ).run(score, existing.id);
    } else {
      db.prepare(
        `INSERT INTO ratings (id, user_id, model_id, score) VALUES (?, ?, ?, ?)`
      ).run(randomUUID(), user.id, modelId, score);
    }

    db.prepare(`UPDATE users SET last_model_id = ?, last_seen_at = datetime('now') WHERE id = ?`).run(
      modelId,
      user.id
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const modelId = String(body.modelId || "");
    if (!modelId) throw new Error("חובה לציין דגם");

    db.prepare(`DELETE FROM ratings WHERE user_id = ? AND model_id = ?`).run(user.id, modelId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
