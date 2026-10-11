import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser, handleApiError } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const modelId = body.modelId ? String(body.modelId) : null;

    db.prepare(`UPDATE users SET last_model_id = ?, last_seen_at = datetime('now') WHERE id = ?`).run(
      modelId,
      user.id
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
