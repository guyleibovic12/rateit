"use client";

import { useEffect, useState } from "react";
import type { User } from "./types";

export function useUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  async function refresh() {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setUser(data.user);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    refresh();
  }, []);

  return { user, loading: user === undefined, refresh };
}
