"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";

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

const SCORES = [
  { value: 1, label: "לא טוב", className: "bg-danger text-white" },
  { value: 2, label: "טוב", className: "bg-accent-2 text-black" },
  { value: 3, label: "מצוין", className: "bg-success text-white" },
] as const;

export default function RateDetailPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [models, setModels] = useState<ModelWithImages[] | null>(null);
  const [imageIdx, setImageIdx] = useState(0);
  const [justRated, setJustRated] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => setModels(data.models || []));
  }, [user?.id]);

  const index = useMemo(
    () => (models ? models.findIndex((m) => m.id === params.id) : -1),
    [models, params.id]
  );
  const current = index >= 0 && models ? models[index] : null;

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
          prev ? prev.map((m) => (m.id === current.id ? { ...m, myRating: score } : m)) : prev
        );
        setJustRated(true);
      } finally {
        setSaving(false);
      }
    },
    [current, saving]
  );

  const goNext = useCallback(() => {
    if (!models || index < 0) return;
    if (index < models.length - 1) {
      router.push(`/rate/${models[index + 1].id}`);
    } else {
      router.push("/rate");
    }
  }, [models, index, router]);

  const goPrev = useCallback(() => {
    if (!models || index <= 0) return;
    router.push(`/rate/${models[index - 1].id}`);
  }, [models, index, router]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (["1", "2", "3"].includes(e.key)) {
        rate(Number(e.key));
      } else if (e.key === "ArrowRight") {
        goNext();
      } else if (e.key === "ArrowLeft") {
        goPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rate, goNext, goPrev]);

  const ratedCount = useMemo(
    () => (models ? models.filter((m) => m.myRating !== null).length : 0),
    [models]
  );

  if (loading || !user || models === null) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען...</p>
      </main>
    );
  }

  if (!current) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 text-center">
        <p className="text-muted">דגם לא נמצא</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <button onClick={() => router.push("/rate")} className="text-muted text-sm">
          ← רשימה
        </button>
        <span className="text-sm text-muted">
          {ratedCount} / {models.length} דורגו
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate max-w-[100px]">{user.name}</span>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex flex-col px-4 py-4 max-w-md w-full mx-auto">
        <div className="relative aspect-square w-full rounded-2xl bg-white overflow-hidden border border-border mb-4">
          {current.images.length > 0 ? (
            <img
              src={`/api/files/${current.images[imageIdx]}`}
              alt={current.name}
              className="w-full h-full object-contain p-3"
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
                    i === imageIdx ? "bg-accent w-6" : "bg-black/15"
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

        <div className="grid grid-cols-3 gap-2">
          {SCORES.map((s) => (
            <button
              key={s.value}
              disabled={saving}
              onClick={() => rate(s.value)}
              className={`rounded-xl py-5 font-semibold transition active:scale-[0.97] disabled:opacity-50 ${
                current.myRating === s.value ? s.className : "bg-surface-2 text-foreground border border-border"
              }`}
            >
              <span className="block text-lg">{s.value}</span>
              <span className="block text-xs mt-1">{s.label}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-muted text-xs mt-2">
          אפשר גם להקיש 1-3 במקלדת, וחצים לניווט
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            onClick={goPrev}
            disabled={index === 0}
            className="rounded-xl border border-border py-3.5 font-medium text-muted disabled:opacity-40 active:scale-[0.98] transition"
          >
            ← הקודם
          </button>
          <button
            onClick={goNext}
            className={`rounded-xl py-3.5 font-semibold active:scale-[0.98] transition ${
              justRated ? "bg-accent text-white" : "border border-border text-muted"
            }`}
          >
            {justRated ? "לדגם הבא →" : "דלג →"}
          </button>
        </div>
      </div>
    </main>
  );
}
