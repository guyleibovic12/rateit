import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/api-utils";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  try {
    await requireAdmin();

    const rows = db
      .prepare(
        `SELECT u.name as rater, u.is_anonymous as anonymous, m.sku, m.name as model,
                r.score, r.created_at, r.updated_at
         FROM ratings r
         JOIN users u ON u.id = r.user_id
         JOIN models m ON m.id = r.model_id
         ORDER BY m.name, u.name`
      )
      .all() as {
      rater: string;
      anonymous: number;
      sku: string | null;
      model: string;
      score: number;
      created_at: string;
      updated_at: string;
    }[];

    const header = ["מדרג", "אנונימי", "מק\"ט", "דגם", "ציון", "נוצר", "עודכן"];
    const lines = [header.map(csvEscape).join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.rater,
          r.anonymous ? "כן" : "לא",
          r.sku || "",
          r.model,
          r.score,
          r.created_at,
          r.updated_at,
        ]
          .map(csvEscape)
          .join(",")
      );
    }

    const csv = "﻿" + lines.join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rateit-export.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
