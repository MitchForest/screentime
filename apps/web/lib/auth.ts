import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "st_auth";
const AUTH_SECRET = process.env.AUTH_SECRET || "dev_secret";

export type Session = { user_id: string; email: string; role: "admin" | "user"; iat: number };

export function hashPassword(password: string, salt?: string): string {
  const s = salt || randomBytes(16).toString("hex");
  const hash = scryptSync(password, s, 64).toString("hex");
  return `${s}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [s, hash] = stored.split(":");
  const derived = scryptSync(password, s, 64).toString("hex");
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(derived, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signSession(sess: Session): string {
  const payload = Buffer.from(JSON.stringify(sess)).toString("base64url");
  const sig = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionCookie(value: string | undefined): Session | null {
  if (!value) return null;
  const [payload, sig] = value.split(".");
  if (!(payload && sig)) return null;
  const expected = createHmac("sha256", AUTH_SECRET).update(payload).digest("base64url");
  if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
  } catch {
    return null;
  }
}

export function cookieName(): string {
  return COOKIE_NAME;
}

