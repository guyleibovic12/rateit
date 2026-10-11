"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/lib/useUser";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const { user, loading, refresh } = useUser();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function login(asName: string | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: asName || "" }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      await refresh();
      if (data.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/rate");
      }
    } catch {
      setError("משהו השתבש, נסה שוב");
    } finally {
      setBusy(false);
    }
  }

  if (!loading && user) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative">
        <div className="absolute top-4 left-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-sm text-center space-y-4">
          <p className="text-muted">מחובר בשם</p>
          <p className="text-2xl font-bold">{user.name}</p>
          <button
            onClick={() => router.push(user.role === "admin" ? "/admin" : "/rate")}
            className="w-full rounded-xl bg-accent py-3.5 font-semibold text-white active:scale-[0.98] transition"
          >
            המשך
          </button>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              await refresh();
            }}
            className="w-full rounded-xl border border-border py-3 text-muted"
          >
            התנתק
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-accent flex items-center justify-center text-3xl mb-4">
            👟
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">RateIt</h1>
          <p className="text-muted">דירוג דגמי נעליים חדשים</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) login(name.trim());
          }}
          className="space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="השם שלך"
            className="w-full rounded-xl bg-surface border border-border px-4 py-3.5 text-lg outline-none focus:border-accent transition"
            autoFocus
          />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="w-full rounded-xl bg-accent py-3.5 font-semibold text-white disabled:opacity-40 active:scale-[0.98] transition"
          >
            התחברות
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-muted text-sm">או</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <button
          onClick={() => login(null)}
          disabled={busy}
          className="w-full rounded-xl border border-border py-3.5 font-medium text-muted active:scale-[0.98] transition"
        >
          המשך כאנונימי
        </button>
      </div>
    </main>
  );
}
