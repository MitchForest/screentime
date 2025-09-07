import { NextResponse } from "next/server";
import { createDb, findUserByEmail } from "@screentime/db";
import { signSession, verifyPassword, cookieName } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password, next } = (await req.json().catch(() => ({}))) as { email?: string; password?: string; next?: string };
  if (!(email && password)) return NextResponse.json({ error: "email and password required" }, { status: 400 });
  const db = createDb();
  const user = await findUserByEmail(db, email);
  if (!user || !verifyPassword(password, user.password_hash)) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  const token = signSession({ user_id: user.user_id, email: user.email, role: user.role as any, iat: Date.now() });
  const res = NextResponse.redirect(new URL(next || "/summaries", req.url));
  res.cookies.set(cookieName(), token, { httpOnly: true, path: "/" });
  return res;
}
