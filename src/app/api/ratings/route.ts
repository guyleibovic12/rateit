import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const modelId = String(body.modelId || "");
    const score = Number(body.score);

    if (!modelId) throw new Error("חובה לציין דגם");
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new Error("ציון חייב להיות בין 1 ל-5");
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
