import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(), "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

