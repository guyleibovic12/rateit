"use client";

import { useEffect, useRef, useState } from "react";
import { parseJsonResponse } from "@/lib/fetchJson";

interface ModelRow {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  images: string[];
  ratingCount?: number;
  avgScore?: number;
}

export default function ModelsTab() {
  const [models, setModels] = useState<ModelRow[] | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", brand: "", category: "" });
  const [importMsg, setImportMsg] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/models");
    const data = await res.json();
    setModels(data.models || []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    load();
  }, []);

  async function addModel(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    await fetch("/api/models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", sku: "", brand: "", category: "" });
    load();
  }

  async function removeModel(id: string) {
    if (!confirm("למחוק את הדגם לצמיתות? פעולה זו תמחק גם את התמונות והדירוגים שלו.")) return;
    await fetch(`/api/models/${id}`, { method: "DELETE" });
    load();
  }

  async function importFile(file: File) {
    setImportBusy(true);
    setImportMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/models/import", { method: "POST", body: fd });
      const { ok, data } = await parseJsonResponse<{ created: number; updated: number; total: number }>(res);
      if (!ok) throw new Error((data as { error?: string }).error || "שגיאה בייבוא");
      const d = data as { created: number; updated: number; total: number };
      setImportMsg(`נוספו ${d.created} דגמים, עודכנו ${d.updated} מתוך ${d.total}`);
      load();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : "שגיאה בייבוא");
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6 py-4">
      <section className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">ייבוא דגמים מ-CSV / Excel</h2>
        <p className="text-muted text-sm">
          עמודות נתמכות: שם / name, מק&quot;ט / sku, מותג / brand, קטגוריה / category, הערות / notes
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          disabled={importBusy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
          }}
          className="w-full text-sm text-muted"
        />
        {importMsg && <p className="text-sm text-accent-2">{importMsg}</p>}
      </section>

      <section className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <h2 className="font-semibold">הוספת דגם ידנית</h2>
        <form onSubmit={addModel} className="grid grid-cols-2 gap-2">
          <input
            placeholder="שם דגם *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="col-span-2 rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            placeholder="מק&quot;ט"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
            className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            placeholder="מותג"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <input
            placeholder="קטגוריה"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="col-span-2 rounded-lg bg-surface-2 border border-border px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!form.name.trim()}
            className="col-span-2 rounded-lg bg-accent py-2.5 font-medium text-white disabled:opacity-40"
          >
            הוספה
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold px-1">
          דגמים ({models?.length ?? 0})
        </h2>
        {models?.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 bg-surface border border-border rounded-xl p-3"
          >
            <div className="w-12 h-12 rounded-lg bg-surface-2 overflow-hidden flex items-center justify-center shrink-0">
              {m.images[0] ? (
                <img src={`/api/files/${m.images[0]}`} className="w-full h-full object-cover" alt="" />
              ) : (
                <span className="text-xl">👟</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{m.name}</p>
              <p className="text-muted text-xs truncate">
                {[m.brand, m.sku].filter(Boolean).join(" · ") || "—"} · {m.images.length} תמונות
                {m.ratingCount ? ` · ${m.ratingCount} דירוגים · ${m.avgScore?.toFixed(1)}★` : ""}
              </p>
            </div>
            <button
              onClick={() => removeModel(m.id)}
              className="text-danger text-sm px-2 py-1"
            >
              מחק
            </button>
          </div>
        ))}
        {models?.length === 0 && (
          <p className="text-muted text-sm text-center py-6">אין דגמים עדיין</p>
        )}
      </section>
    </div>
  );
}
