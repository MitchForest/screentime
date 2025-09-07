import { NextResponse } from "next/server";
import { createDb, createUser, findUserByEmail } from "@screentime/db";
import { hashPassword, signSession, cookieName } from "@/lib/auth";
import { ulid } from "ulid";

export async function POST(req: Request) {
  const { email, password } = (await req.json().catch(() => ({}))) as { email?: string; password?: string };
  if (!(email && password)) return NextResponse.json({ error: "email and password required" }, { status: 400 });
  const db = createDb();
  const existing = await findUserByEmail(db, email);
  if (existing) return NextResponse.json({ error: "email already registered" }, { status: 409 });
  const ph = hashPassword(password);
  const isAdminSeed = process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL;
  const user = await createUser(db, email, ph, isAdminSeed ? "admin" : "user");
  const token = signSession({ user_id: user.user_id ?? ulid(), email, role: user.role as any, iat: Date.now() });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(), token, { httpOnly: true, path: "/" });
  return res;
}

