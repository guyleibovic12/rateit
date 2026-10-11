import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { requireAdmin, requireUser, handleApiError } from "@/lib/api-utils";
import type { Model, ModelImage, Rating } from "@/lib/types";

export async function GET() {
  try {
    const user = await requireUser();

    const models = db
      .prepare(`SELECT * FROM models WHERE active = 1 ORDER BY created_at ASC`)
      .all() as Model[];

    const images = db.prepare(`SELECT * FROM images ORDER BY sort_order ASC`).all() as ModelImage[];
    const imagesByModel = new Map<string, ModelImage[]>();
    for (const img of images) {
      if (!img.model_id) continue;
      const list = imagesByModel.get(img.model_id) || [];
      list.push(img);
      imagesByModel.set(img.model_id, list);
    }

    const myRatings = db
      .prepare(`SELECT * FROM ratings WHERE user_id = ?`)
      .all(user.id) as Rating[];
    const myRatingByModel = new Map(myRatings.map((r) => [r.model_id, r.score]));

    let ratingStats: Map<string, { count: number; avg: number }> | null = null;
    if (user.role === "admin") {
      const rows = db
        .prepare(
          `SELECT model_id, COUNT(*) as count, AVG(score) as avg FROM ratings GROUP BY model_id`
        )
        .all() as { model_id: string; count: number; avg: number }[];
      ratingStats = new Map(rows.map((r) => [r.model_id, { count: r.count, avg: r.avg }]));
    }

    const result = models.map((m) => ({
      ...m,
      images: (imagesByModel.get(m.id) || []).map((i) => i.filename),
      myRating: myRatingByModel.get(m.id) ?? null,
      ratingCount: ratingStats?.get(m.id)?.count ?? undefined,
      avgScore: ratingStats?.get(m.id)?.avg ?? undefined,
    }));

    return NextResponse.json({ models: result });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const name = String(body.name || "").trim();
    if (!name) throw new Error("שם דגם הוא שדה חובה");

    const id = randomUUID();
    db.prepare(
      `INSERT INTO models (id, sku, name, brand, category, notes) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      body.sku ? String(body.sku).trim() : null,
      name,
      body.brand ? String(body.brand).trim() : null,
      body.category ? String(body.category).trim() : null,
      body.notes ? String(body.notes).trim() : null
    );

    const model = db.prepare(`SELECT * FROM models WHERE id = ?`).get(id);
    return NextResponse.json({ model });
  } catch (err) {
    return handleApiError(err);
  }
}
