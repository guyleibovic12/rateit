"use client";

import { useEffect, useState } from "react";

interface SummaryTotals {
  models: number;
  raters: number;
  ratings: number;
}

interface PerModel {
  id: string;
  name: string;
  avgScore: number | null;
  ratingCount: number;
}

interface SummaryData {
  totals: SummaryTotals;
  perModel: PerModel[];
}

export default function OverviewTab({ onNavigate }: { onNavigate: (tab: "models" | "images" | "summary") => void }) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [unassignedCount, setUnassignedCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then(setData);
    fetch("/api/images?unassigned=1")
      .then((r) => r.json())
      .then((d) => setUnassignedCount((d.images || []).length));
  }, []);

  if (!data) {
    return <p className="text-muted text-sm py-8 text-center">טוען...</p>;
  }

  const expected = data.totals.models * Math.max(data.totals.raters, 1);
  const completion = expected > 0 ? Math.min(100, Math.round((data.totals.ratings / expected) * 100)) : 0;

  const topModels = [...data.perModel]
    .filter((m) => m.ratingCount > 0)
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 5);

  return (
    <div className="space-y-6 py-4">
      <section className="grid grid-cols-3 gap-2">
        <StatCard label="דגמים" value={data.totals.models} />
        <StatCard label="מדרגים" value={data.totals.raters} />
        <StatCard label="דירוגים" value={data.totals.ratings} />
      </section>

      {unassignedCount !== null && unassignedCount > 0 && (
        <button
          onClick={() => onNavigate("images")}
          className="w-full text-right bg-surface border border-accent-2 rounded-2xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-semibold">⚠️ {unassignedCount} תמונות ממתינות למיפוי</p>
            <p className="text-muted text-xs">לחץ כדי לשייך אותן לדגמים</p>
          </div>
          <span className="text-muted">←</span>
        </button>
      )}

      <section className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">התקדמות דירוג (ממוצע למדרג)</h2>
          <span className="text-sm text-muted">{completion}%</span>
        </div>
        <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
          <div className="h-full bg-accent transition-all" style={{ width: `${completion}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onNavigate("models")}
          className="bg-surface border border-border rounded-2xl p-4 text-center active:scale-[0.98] transition"
        >
          <p className="text-2xl mb-1">📦</p>
          <p className="text-sm font-medium">דגמים</p>
        </button>
        <button
          onClick={() => onNavigate("images")}
          className="bg-surface border border-border rounded-2xl p-4 text-center active:scale-[0.98] transition"
        >
          <p className="text-2xl mb-1">🖼️</p>
          <p className="text-sm font-medium">תמונות</p>
        </button>
        <button
          onClick={() => onNavigate("summary")}
          className="bg-surface border border-border rounded-2xl p-4 text-center active:scale-[0.98] transition"
        >
          <p className="text-2xl mb-1">📊</p>
          <p className="text-sm font-medium">סיכום</p>
        </button>
      </section>

      {topModels.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold px-1">הדגמים המובילים</h2>
          {topModels.map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-surface border border-border rounded-xl p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-muted text-sm w-4">{i + 1}.</span>
                <p className="font-medium text-sm">{m.name}</p>
              </div>
              <span className="text-sm font-semibold text-accent-2">
                {m.avgScore?.toFixed(1)} / 3 · {m.ratingCount}
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-muted text-xs">{label}</p>
    </div>
  );
}
