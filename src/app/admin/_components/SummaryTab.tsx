"use client";

import { useEffect, useMemo, useState } from "react";

interface RawRating {
  id: string;
  score: number;
  updated_at: string;
  userId: string;
  userName: string;
  isAnonymous: number;
  modelId: string;
  modelName: string;
  modelSku: string | null;
}

interface PerUser {
  id: string;
  name: string;
  is_anonymous: number;
  role: string;
  ratingCount: number;
  avgScore: number | null;
}

interface SummaryData {
  rawRatings: RawRating[];
  perUser: PerUser[];
  totals: { models: number; raters: number; ratings: number };
}

type RaterFilter = "all" | "named" | "anonymous" | "manual";

export default function SummaryTab() {
  const [data, setData] = useState<SummaryData | null>(null);
  const [mode, setMode] = useState<"per-model" | "per-rater">("per-model");
  const [raterFilter, setRaterFilter] = useState<RaterFilter>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/summary")
      .then((r) => r.json())
      .then(setData);
  }, []);

  const namedUsers = useMemo(
    () => (data?.perUser || []).filter((u) => !u.is_anonymous),
    [data]
  );

  const filteredRatings = useMemo(() => {
    if (!data) return [];
    return data.rawRatings.filter((r) => {
      if (raterFilter === "named") return !r.isAnonymous;
      if (raterFilter === "anonymous") return !!r.isAnonymous;
      if (raterFilter === "manual") return selectedUsers.has(r.userId);
      return true;
    });
  }, [data, raterFilter, selectedUsers]);

  const perModelComputed = useMemo(() => {
    const map = new Map<
      string,
      { name: string; sku: string | null; count: number; sum: number }
    >();
    for (const r of filteredRatings) {
      const entry = map.get(r.modelId) || {
        name: r.modelName,
        sku: r.modelSku,
        count: 0,
        sum: 0,
      };
      entry.count++;
      entry.sum += r.score;
      map.set(r.modelId, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v, avg: v.sum / v.count }))
      .sort((a, b) => b.avg - a.avg);
  }, [filteredRatings]);

  const perRaterComputed = useMemo(() => {
    const map = new Map<
      string,
      { name: string; anonymous: boolean; count: number; sum: number }
    >();
    for (const r of filteredRatings) {
      const entry = map.get(r.userId) || {
        name: r.userName,
        anonymous: !!r.isAnonymous,
        count: 0,
        sum: 0,
      };
      entry.count++;
      entry.sum += r.score;
      map.set(r.userId, entry);
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v, avg: v.sum / v.count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRatings]);

  function toggleUser(id: string) {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (!data) {
    return <p className="text-muted text-sm py-8 text-center">טוען...</p>;
  }

  return (
    <div className="space-y-6 py-4">
      <section className="grid grid-cols-3 gap-2">
        <StatCard label="דגמים" value={data.totals.models} />
        <StatCard label="מדרגים" value={data.totals.raters} />
        <StatCard label="דירוגים" value={data.totals.ratings} />
      </section>

      <section className="bg-surface border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">סינון מדרגים</h2>
          <a
            href="/api/export"
            className="text-sm bg-accent text-white rounded-lg px-3 py-1.5 font-medium"
          >
            ייצוא CSV
          </a>
        </div>
        <div className="flex gap-1 flex-wrap">
          {[
            { id: "all", label: "כולם" },
            { id: "named", label: "בעלי שם" },
            { id: "anonymous", label: "אנונימיים" },
            { id: "manual", label: "בחירה ידנית" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setRaterFilter(f.id as RaterFilter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                raterFilter === f.id ? "bg-accent text-white" : "bg-surface-2 text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {raterFilter === "manual" && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {namedUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => toggleUser(u.id)}
                className={`px-2.5 py-1 rounded-full text-xs border transition ${
                  selectedUsers.has(u.id)
                    ? "bg-accent-2 text-black border-accent-2"
                    : "border-border text-muted"
                }`}
              >
                {u.name}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="flex gap-2">
        <button
          onClick={() => setMode("per-model")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${
            mode === "per-model" ? "bg-accent text-white" : "bg-surface-2 text-muted"
          }`}
        >
          לפי דגם
        </button>
        <button
          onClick={() => setMode("per-rater")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${
            mode === "per-rater" ? "bg-accent text-white" : "bg-surface-2 text-muted"
          }`}
        >
          לפי מדרג
        </button>
      </section>

      {mode === "per-model" && (
        <div className="space-y-2">
          {perModelComputed.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-surface border border-border rounded-xl p-3"
            >
              <div>
                <p className="font-medium">{m.name}</p>
                <p className="text-muted text-xs">{m.sku || "—"} · {m.count} דירוגים</p>
              </div>
              <ScorePill value={m.avg} />
            </div>
          ))}
          {perModelComputed.length === 0 && (
            <p className="text-muted text-sm text-center py-6">אין דירוגים תואמים</p>
          )}
        </div>
      )}

      {mode === "per-rater" && (
        <div className="space-y-2">
          {perRaterComputed.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between bg-surface border border-border rounded-xl p-3"
            >
              <div>
                <p className="font-medium">{u.name}</p>
                <p className="text-muted text-xs">
                  {u.anonymous ? "אנונימי" : "בעל שם"} · {u.count} דירוגים
                </p>
              </div>
              <ScorePill value={u.avg} />
            </div>
          ))}
          {perRaterComputed.length === 0 && (
            <p className="text-muted text-sm text-center py-6">אין דירוגים תואמים</p>
          )}
        </div>
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

function ScorePill({ value }: { value: number }) {
  return (
    <span className="text-sm font-semibold bg-surface-2 border border-border rounded-full px-2.5 py-1 text-accent-2">
      {value.toFixed(1)} / 3
    </span>
  );
}
