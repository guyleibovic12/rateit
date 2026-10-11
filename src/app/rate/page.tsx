"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/useUser";

interface ModelWithImages {
  id: string;
  name: string;
  sku: string | null;
  brand: string | null;
  category: string | null;
  notes: string | null;
  images: string[];
  myRating: number | null;
}

const STAR_LABELS = ["גרוע", "לא טוב", "סביר", "טוב", "מצוין"];

export default function RatePage() {
  const { user, loading } = useUser();
  const router = useRouter();

  const [models, setModels] = useState<ModelWithImages[] | null>(null);
  const [index, setIndex] = useState(0);
  const [imageIdx, setImageIdx] = useState(0);
  const [justRated, setJustRated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        const list: ModelWithImages[] = data.models || [];
        setModels(list);

        const lastId = user?.last_model_id;
        let startIndex = 0;
        if (lastId) {
          const i = list.findIndex((m) => m.id === lastId);
          if (i >= 0) startIndex = i;
        } else {
          const firstUnrated = list.findIndex((m) => m.myRating === null);
          if (firstUnrated >= 0) startIndex = firstUnrated;
        }
        setIndex(startIndex);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const current = models && models.length > 0 ? models[index] : null;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local UI state when the active model changes
    setImageIdx(0);
    setJustRated(false);
    if (current) {
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelId: current.id }),
      });
    }
  }, [current?.id]);

  const rate = useCallback(
    async (score: number) => {
      if (!current || saving) return;
      setSaving(true);
      try {
        await fetch("/api/ratings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ modelId: current.id, score }),
        });
        setModels((prev) =>
          prev
            ? prev.map((m) => (m.id === current.id ? { ...m, myRating: score } : m))
            : prev
        );
        setJustRated(true);
      } finally {
        setSaving(false);
      }
    },
    [current, saving]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (["1", "2", "3", "4", "5"].includes(e.key)) {
        rate(Number(e.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate]);

  const ratedCount = useMemo(
    () => (models ? models.filter((m) => m.myRating !== null).length : 0),
    [models]
  );

  function goNext() {
    if (!models) return;
    const nextUnrated = models.findIndex(
      (m, i) => i > index && m.myRating === null
    );
    if (nextUnrated >= 0) {
      setIndex(nextUnrated);
    } else if (index < models.length - 1) {
      setIndex(index + 1);
    } else {
      router.push("/");
    }
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

  if (!current) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted">אין עדיין דגמים לדירוג.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => router.push("/")} className="text-muted text-sm">
          ← בית
        </button>
        <span className="text-sm text-muted">
          {ratedCount} / {models.length} דורגו
        </span>
        <span className="text-sm font-medium truncate max-w-[100px]">{user.name}</span>
      </header>

      <div className="flex-1 flex flex-col px-4 py-4 max-w-md w-full mx-auto">
        <div className="relative aspect-square w-full rounded-2xl bg-surface overflow-hidden border border-border mb-4">
          {current.images.length > 0 ? (
            <img
              src={`/api/files/${current.images[imageIdx]}`}
              alt={current.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl text-muted">
              👟
            </div>
          )}

          {current.images.length > 1 && (
            <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
              {current.images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setImageIdx(i)}
                  className={`w-2 h-2 rounded-full transition ${
                    i === imageIdx ? "bg-accent w-6" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center mb-5 space-y-1">
          <h1 className="text-xl font-bold">{current.name}</h1>
          <p className="text-muted text-sm">
            {[current.brand, current.category, current.sku].filter(Boolean).join(" · ")}
          </p>
          {current.notes && <p className="text-muted text-sm pt-1">{current.notes}</p>}
        </div>

        <StarRow value={current.myRating} onRate={rate} disabled={saving} />

        {justRated && (
          <div className="mt-6 grid grid-cols-2 gap-3 animate-in">
            <button
              onClick={() => router.push("/")}
              className="rounded-xl border border-border py-3.5 font-medium text-muted active:scale-[0.98] transition"
            >
              חזרה לבית
            </button>
            <button
              onClick={goNext}
              className="rounded-xl bg-accent py-3.5 font-semibold text-white active:scale-[0.98] transition"
            >
              לדגם הבא →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function StarRow({
  value,
  onRate,
  disabled,
}: {
  value: number | null;
  onRate: (score: number) => void;
  disabled: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value ?? 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            disabled={disabled}
            onClick={() => onRate(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(null)}
            className="text-4xl leading-none transition active:scale-110"
            aria-label={`דרג ${n} כוכבים`}
          >
            <span className={n <= display ? "text-accent-2" : "text-border"}>★</span>
          </button>
        ))}
      </div>
      <p className="text-muted text-sm h-5">
        {display > 0 ? STAR_LABELS[display - 1] : "הקש לדירוג (או 1-5 במקלדת)"}
      </p>
    </div>
  );
}
