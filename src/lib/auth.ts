import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import type { User } from "./types";

const SESSION_COOKIE = "rateit_session";

function adminUsernames(): string[] {
  return (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((s) => normalizeName(s))
    .filter(Boolean);
}

export function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function loginOrCreateUser(rawName: string | null | undefined): User {
  const name = (rawName || "").trim();

  if (!name) {
    const id = randomUUID();
    const anonLabel = `אנונימי-${id.slice(0, 4)}`;
    db.prepare(
      `INSERT INTO users (id, name, name_key, role, is_anonymous) VALUES (?, ?, NULL, 'rater', 1)`
    ).run(id, anonLabel);
    return getUser(id)!;
  }

  const nameKey = normalizeName(name);
  const role = adminUsernames().includes(nameKey) ? "admin" : "rater";

  const existing = db
    .prepare(`SELECT * FROM users WHERE name_key = ?`)
    .get(nameKey) as User | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users SET last_seen_at = datetime('now'), role = ? WHERE id = ?`
    ).run(role, existing.id);
    return getUser(existing.id)!;
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, name, name_key, role, is_anonymous) VALUES (?, ?, ?, ?, 0)`
  ).run(id, name, nameKey, role);
  return getUser(id)!;
}

export function getUser(id: string): User | undefined {
  return db.prepare(`SELECT * FROM users WHERE id = ?`).get(id) as
    | User
    | undefined;
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | undefined> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return undefined;
  return getUser(id);
}
