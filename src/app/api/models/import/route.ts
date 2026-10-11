import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { requireAdmin, handleApiError } from "@/lib/api-utils";

interface ImportRow {
  sku?: string;
  name?: string;
  brand?: string;
  category?: string;
  notes?: string;
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase();
}

function pick(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const [k, v] of Object.entries(row)) {
    if (keys.includes(normalizeKey(k)) && v !== undefined && v !== null) {
      return String(v).trim();
    }
  }
  return undefined;
}

function toImportRows(raw: Record<string, unknown>[]): ImportRow[] {
  return raw.map((row) => ({
    sku: pick(row, ["sku", "מקט", "קוד", "code"]),
    name: pick(row, ["name", "שם", "דגם", "model", "שם דגם"]),
    brand: pick(row, ["brand", "מותג", "חברה"]),
    category: pick(row, ["category", "קטגוריה", "סוג"]),
    notes: pick(row, ["notes", "הערות", "תיאור", "description"]),
  }));
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) throw new Error("לא נבחר קובץ");

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = file.name.toLowerCase();

    let rawRows: Record<string, unknown>[] = [];

    if (filename.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const parsed = Papa.parse<Record<string, unknown>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      rawRows = parsed.data;
    } else {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    }

    const rows = toImportRows(rawRows).filter((r) => r.name);

    let created = 0;
    let updated = 0;

    const findBySku = db.prepare(`SELECT id FROM models WHERE sku = ? AND sku IS NOT NULL AND sku != ''`);
    const findByName = db.prepare(`SELECT id FROM models WHERE name = ? AND (sku IS NULL OR sku = '')`);
    const insert = db.prepare(
      `INSERT INTO models (id, sku, name, brand, category, notes) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const update = db.prepare(
      `UPDATE models SET name = ?, brand = ?, category = ?, notes = ? WHERE id = ?`
    );

    const tx = db.transaction((items: ImportRow[]) => {
      for (const row of items) {
        const name = row.name!.trim();
        const sku = row.sku?.trim() || null;

        const existing = sku
          ? (findBySku.get(sku) as { id: string } | undefined)
          : (findByName.get(name) as { id: string } | undefined);

        if (existing) {
          update.run(name, row.brand || null, row.category || null, row.notes || null, existing.id);
          updated++;
        } else {
          insert.run(randomUUID(), sku, name, row.brand || null, row.category || null, row.notes || null);
          created++;
        }
      }
    });

    tx(rows);

    return NextResponse.json({ created, updated, total: rows.length });
  } catch (err) {
    return handleApiError(err);
  }
}
