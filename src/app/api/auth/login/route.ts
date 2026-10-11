import { NextRequest, NextResponse } from "next/server";
import { loginOrCreateUser, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name : "";

  const user = loginOrCreateUser(name);
  await setSessionCookie(user.id);

  return NextResponse.json({ user });
}
