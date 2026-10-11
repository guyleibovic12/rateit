"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";

interface ModelWithImages {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  images: string[];
  myRating: number | null;
}

const SCORE_LABELS: Record<number, string> = { 1: "לא טוב", 2: "טוב", 3: "מצוין" };
const SCORE_COLORS: Record<number, string> = {
  1: "bg-danger text-white",
  2: "bg-accent-2 text-black",
  3: "bg-success text-white",
};

type Filter = "all" | "rated" | "unrated";

export default function RateHomePage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [models, setModels] = useState<ModelWithImages[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [brandFilter, setBrandFilter] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => setModels(data.models || []));
  }, [user?.id]);

  const ratedCount = useMemo(
    () => (models ? models.filter((m) => m.myRating !== null).length : 0),
    [models]
  );

  const firstUnratedId = useMemo(() => {
    if (!models) return null;
    const m = models.find((m) => m.myRating === null);
    return m?.id ?? null;
  }, [models]);

  const brands = useMemo(() => {
    if (!models) return [];
    const set = new Set(models.map((m) => m.brand).filter((b): b is string => !!b));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [models]);

  const filtered = useMemo(() => {
    if (!models) return [];
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (filter === "rated" && m.myRating === null) return false;
      if (filter === "unrated" && m.myRating !== null) return false;
      if (brandFilter.size > 0 && !(m.brand && brandFilter.has(m.brand))) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        (m.sku || "").toLowerCase().includes(q) ||
        (m.brand || "").toLowerCase().includes(q)
      );
    });
  }, [models, search, filter, brandFilter]);

  function toggleBrand(b: string) {
    setBrandFilter((prev) => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b);
      else next.add(b);
      return next;
    });
  }

  function continueRating() {
    const target = user?.last_model_id || firstUnratedId || models?.[0]?.id;
    if (target) router.push(`/rate/${target}`);
  }

  if (loading || !user || models === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען...</p>
      </main>
    );
  }

  if (models.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted">אין עדיין דגמים לדירוג. בדוק מול המנהל.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">דגמים לדירוג</h1>
          <p className="text-muted text-xs">
            {ratedCount} / {models.length} דורגו
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => router.push("/rate/summary")}
            className="text-sm text-muted border border-border rounded-lg px-3 py-1.5"
          >
            הסיכום שלי
          </button>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted border border-border rounded-lg px-3 py-1.5"
          >
            בית
          </button>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-3xl mx-auto space-y-4">
        <button
          onClick={continueRating}
          className="w-full rounded-xl bg-accent py-3.5 font-semibold text-white active:scale-[0.98] transition"
        >
          {ratedCount === 0 ? "התחל לדרג" : "המשך לדרג →"}
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, מותג או מק&quot;ט..."
          className="w-full rounded-xl bg-surface border border-border px-4 py-2.5 text-sm outline-none focus:border-accent transition"
        />

        <div className="flex gap-1.5">
          {[
            { id: "all", label: "הכל" },
            { id: "unrated", label: "טרם דורגו" },
            { id: "rated", label: "דורגו" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as Filter)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === f.id ? "bg-accent text-white" : "bg-surface-2 text-muted"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {brands.length > 1 && (
          <div className="flex flex-wrap gap-1.5 pb-1">
            <button
              onClick={() => setBrandFilter(new Set())}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                brandFilter.size === 0 ? "bg-accent text-white" : "bg-surface-2 text-muted"
              }`}
            >
              כל המותגים
            </button>
            {brands.map((b) => (
              <button
                key={b}
                onClick={() => toggleBrand(b)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                  brandFilter.has(b) ? "bg-accent text-white" : "bg-surface-2 text-muted"
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => router.push(`/rate/${m.id}`)}
              className="text-right bg-surface border border-border rounded-xl overflow-hidden active:scale-[0.98] transition"
            >
              <div className="relative aspect-square w-full bg-white">
                {m.images[0] ? (
                  <img
                    src={`/api/files/${m.images[0]}`}
                    alt={m.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-muted">
                    👟
                  </div>
                )}
                {m.myRating !== null && (
                  <span
                    className={`absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${SCORE_COLORS[m.myRating]}`}
                  >
                    {SCORE_LABELS[m.myRating]}
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{m.name}</p>
                <p className="text-[11px] text-muted truncate">{m.sku}</p>
              </div>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-muted text-sm text-center py-8">לא נמצאו דגמים תואמים</p>
        )}
      </div>
    </main>
  );
}
