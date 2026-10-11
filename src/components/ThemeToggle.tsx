"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("rateit_theme") as Theme | null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read persisted/system theme on mount
    setTheme(stored || getSystemTheme());
  }, []);

  useEffect(() => {
    if (!theme) return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("rateit_theme", theme);
  }, [theme]);

  if (!theme) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label="החלפת מצב תצוגה"
      className="w-9 h-9 flex items-center justify-center rounded-full border border-border bg-surface text-foreground text-sm"
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
