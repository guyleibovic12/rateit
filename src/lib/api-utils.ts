import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth";
import type { User } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "לא מחובר");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "אין הרשאת מנהל");
  return user;
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error(err);
  return NextResponse.json({ error: "שגיאת שרת" }, { status: 500 });
}

export function slugFilename(original: string): string {
  const ext = original.includes(".") ? original.split(".").pop() : "jpg";
  const safeExt = (ext || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${crypto.randomUUID()}.${safeExt || "jpg"}`;
}
