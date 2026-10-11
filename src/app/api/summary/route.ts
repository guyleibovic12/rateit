import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/api-utils";

export async function GET() {
  try {
    await requireAdmin();

    const perModel = db
      .prepare(
        `SELECT m.id, m.name, m.sku, m.brand, m.category,
                COUNT(r.id) as ratingCount, AVG(r.score) as avgScore
         FROM models m
         LEFT JOIN ratings r ON r.model_id = m.id
         WHERE m.active = 1
         GROUP BY m.id
         ORDER BY avgScore DESC`
      )
      .all();

    const perUser = db
      .prepare(
        `SELECT u.id, u.name, u.is_anonymous, u.role,
                COUNT(r.id) as ratingCount, AVG(r.score) as avgScore
         FROM users u
         LEFT JOIN ratings r ON r.user_id = u.id
         GROUP BY u.id
         HAVING ratingCount > 0 OR u.is_anonymous = 0
         ORDER BY ratingCount DESC`
      )
      .all();

    const rawRatings = db
      .prepare(
        `SELECT r.id, r.score, r.updated_at, r.created_at,
                u.id as userId, u.name as userName, u.is_anonymous as isAnonymous,
                m.id as modelId, m.name as modelName, m.sku as modelSku
         FROM ratings r
         JOIN users u ON u.id = r.user_id
         JOIN models m ON m.id = r.model_id
         ORDER BY r.updated_at DESC`
      )
      .all();

    const totalModels = db.prepare(`SELECT COUNT(*) as c FROM models WHERE active = 1`).get() as {
      c: number;
    };
    const totalRaters = db
      .prepare(`SELECT COUNT(*) as c FROM users WHERE is_anonymous = 0 AND role = 'rater'`)
      .get() as { c: number };
    const totalRatings = db.prepare(`SELECT COUNT(*) as c FROM ratings`).get() as { c: number };

    return NextResponse.json({
      perModel,
      perUser,
      rawRatings,
      totals: {
        models: totalModels.c,
        raters: totalRaters.c,
        ratings: totalRatings.c,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
