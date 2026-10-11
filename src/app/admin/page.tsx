"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useUser } from "@/lib/useUser";
import OverviewTab from "./_components/OverviewTab";
import ModelsTab from "./_components/ModelsTab";
import ImagesTab from "./_components/ImagesTab";
import SummaryTab from "./_components/SummaryTab";
import ThemeToggle from "@/components/ThemeToggle";

type Tab = "overview" | "models" | "images" | "summary";

export default function AdminPage() {
  const { user, loading, refresh } = useUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!loading) {
      if (!user) router.replace("/");
      else if (user.role !== "admin") router.replace("/rate");
    }
  }, [loading, user, router]);

  if (loading || !user || user.role !== "admin") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted">טוען...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">ניהול RateIt</h1>
          <p className="text-muted text-xs">מחובר בשם {user.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => router.push("/rate")}
            className="text-sm text-muted border border-border rounded-lg px-3 py-1.5"
          >
            מסך דירוג
          </button>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              await refresh();
              router.push("/");
            }}
            className="text-sm text-muted border border-border rounded-lg px-3 py-1.5"
          >
            התנתק
          </button>
        </div>
      </header>

      <nav className="flex gap-1 px-4 py-3 overflow-x-auto no-scrollbar">
        {[
          { id: "overview", label: "בית" },
          { id: "models", label: "דגמים" },
          { id: "images", label: "תמונות" },
          { id: "summary", label: "סיכום" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as Tab)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
              tab === t.id ? "bg-accent text-white" : "bg-surface text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="px-4 max-w-2xl mx-auto">
        {tab === "overview" && <OverviewTab onNavigate={setTab} />}
        {tab === "models" && <ModelsTab />}
        {tab === "images" && <ImagesTab />}
        {tab === "summary" && <SummaryTab />}
      </div>
    </main>
  );
}
