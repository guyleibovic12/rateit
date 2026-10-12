"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";

interface MyRating {
  score: number;
  updated_at: string;
  modelId: string;
  modelName: string;
  modelSku: string | null;
  modelBrand: string | null;
  modelCategory: string | null;
  image: string | null;
}

interface MySummary {
  ratings: MyRating[];
  totals: { rated: number; totalModels: number; byScore: Record<number, number> };
}

const SCORE_LABELS: Record<number, string> = { 1: "לא טוב", 2: "טוב", 3: "מצוין" };
const SCORE_COLORS: Record<number, string> = {
  1: "bg-danger text-white",
  2: "bg-accent-2 text-black",
  3: "bg-success text-white",
};

function formatDay(iso: string): string {
  const date = new Date(iso.replace(" ", "T") + "Z");
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / dayMs);

  if (diffDays === 0) return "היום";
  if (diffDays === 1) return "אתמול";
  if (diffDays > 1 && diffDays < 7) return `לפני ${diffDays} ימים`;
  return date.toLocaleDateString("he-IL");
}

function toggleInSet(set: Set<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export default function MySummaryPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [data, setData] = useState<MySummary | null>(null);
  const [scoreFilter, setScoreFilter] = useState<number | null>(null);
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/ratings")
      .then((r) => r.json())
      .then(setData);
  }, [user?.id]);

  const brands = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.ratings.map((r) => r.modelBrand).filter((b): b is string => !!b));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const categories = useMemo(() => {
    if (!data) return [];
    const scoped =
      brandFilter.size > 0 ? data.ratings.filter((r) => r.modelBrand && brandFilter.has(r.modelBrand)) : data.ratings;
    const set = new Set(scoped.map((r) => r.modelCategory).filter((c): c is string => !!c));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data, brandFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- prune category selections that fell out of scope when the brand filter changed
    setCategoryFilter((prev) => {
      const next = new Set([...prev].filter((c) => categories.includes(c)));
      return next.size === prev.size ? prev : next;
    });
  }, [categories]);

  const filteredRatings = useMemo(() => {
    if (!data) return [];
    return data.ratings.filter((r) => {
      if (scoreFilter !== null && r.score !== scoreFilter) return false;
      if (brandFilter.size > 0 && !(r.modelBrand && brandFilter.has(r.modelBrand))) return false;
      if (categoryFilter.size > 0 && !(r.modelCategory && categoryFilter.has(r.modelCategory))) return false;
      return true;
    });
  }, [data, scoreFilter, brandFilter, categoryFilter]);

  const groups = useMemo(() => {
    const map = new Map<string, MyRating[]>();
    for (const r of filteredRatings) {
      const key = formatDay(r.updated_at);
      const list = map.get(key) || [];
      list.push(r);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [filteredRatings]);

  const hasActiveFilter = scoreFilter !== null || brandFilter.size > 0 || categoryFilter.size > 0;

  function clearFilters() {
    setScoreFilter(null);
    setBrandFilter(new Set());
    setCategoryFilter(new Set());
  }

  if (loading || !user || data === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען...</p>
      </main>
    );
  }

  const remaining = data.totals.totalModels - data.totals.rated;

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => router.push("/rate")} className="text-muted text-sm">
          ← בית
        </button>
        <h1 className="text-lg font-bold">הסיכום שלי</h1>
        <ThemeToggle />
      </header>

      <div className="px-4 pt-4 max-w-2xl mx-auto space-y-6">
        <section className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold">
              דירגת {data.totals.rated} מתוך {data.totals.totalModels}
            </p>
            <span className="text-sm text-muted">
              {remaining > 0 ? `נשארו ${remaining}` : "סיימת! 🎉"}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{
                width: `${data.totals.totalModels > 0 ? (data.totals.rated / data.totals.totalModels) * 100 : 0}%`,
              }}
            />
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map((s) => (
            <button
              key={s}
              onClick={() => setScoreFilter((prev) => (prev === s ? null : s))}
              className={`rounded-2xl p-3 text-center border transition active:scale-[0.98] ${
                scoreFilter === s ? "bg-accent border-accent text-white" : "bg-surface border-border"
              }`}
            >
              <p className="text-2xl font-bold">{data.totals.byScore[s] ?? 0}</p>
              <p className={`text-xs ${scoreFilter === s ? "text-white/90" : "text-muted"}`}>
                {SCORE_LABELS[s]}
              </p>
            </button>
          ))}
        </section>

        {brands.length > 1 && (
          <section className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted px-1">מותג</h3>
            <div className="flex flex-wrap gap-1.5">
              {brands.map((b) => (
                <button
                  key={b}
                  onClick={() => setBrandFilter((prev) => toggleInSet(prev, b))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    brandFilter.has(b) ? "bg-accent text-white" : "bg-surface-2 text-muted"
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          </section>
        )}

        {categories.length > 1 && (
          <section className="space-y-1.5">
            <h3 className="text-xs font-medium text-muted px-1">משפחה</h3>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter((prev) => toggleInSet(prev, c))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                    categoryFilter.has(c) ? "bg-accent text-white" : "bg-surface-2 text-muted"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
        )}

        {hasActiveFilter && (
          <button onClick={clearFilters} className="text-sm text-muted underline">
            נקה סינון
          </button>
        )}

        {remaining > 0 && (
          <button
            onClick={() => router.push("/rate")}
            className="w-full rounded-xl bg-accent py-3.5 font-semibold text-white active:scale-[0.98] transition"
          >
            המשך לדרג →
          </button>
        )}

        {groups.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">
            {data.ratings.length === 0 ? "עדיין לא דירגת כלום" : "אין דירוגים תואמים לסינון"}
          </p>
        ) : (
          groups.map(([day, items]) => (
            <section key={day} className="space-y-2">
              <h2 className="font-semibold px-1 text-sm text-muted">{day}</h2>
              {items.map((r) => (
                <button
                  key={r.modelId}
                  onClick={() => router.push(`/rate/${r.modelId}`)}
                  className="w-full flex items-center gap-3 bg-surface border border-border rounded-xl p-2.5 text-right active:scale-[0.98] transition"
                >
                  <div className="w-12 h-12 rounded-lg bg-white border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {r.image ? (
                      <img
                        src={`/api/files/${r.image}`}
                        alt={r.modelName}
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <span className="text-lg">👟</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.modelName}</p>
                    <p className="text-xs text-muted truncate">
                      {[r.modelBrand, r.modelSku].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${SCORE_COLORS[r.score]}`}
                  >
                    {SCORE_LABELS[r.score]}
                  </span>
                </button>
              ))}
            </section>
          ))
        )}
      </div>
    </main>
  );
}
