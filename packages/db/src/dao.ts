import { sql, type Kysely } from "kysely";
import type { Database } from "./types";
import { ulid } from "ulid";

type Json = unknown;

export async function upsertSession(db: Kysely<Database>, input: {
  session_id: string;
  student_id: string;
  started_at: string; // ISO
  ended_at?: string; // ISO
  device?: string;
}): Promise<void> {
  await db
    .insertInto("sessions")
    .values({
      session_id: input.session_id,
      student_id: input.student_id,
      started_at: new Date(input.started_at),
      ended_at: input.ended_at ? new Date(input.ended_at) : null,
      device: input.device ?? null,
      created_at: new Date(),
    })
    .onConflict((oc) => oc.column("session_id").doUpdateSet({
      ended_at: input.ended_at ? new Date(input.ended_at) : null,
      device: input.device ?? null,
    }))
    .execute();
}

export async function ensureStudent(db: Kysely<Database>, student_id: string, org_id?: string): Promise<void> {
  // For MVP, create a placeholder student if not exists (org_id optional)
  await db
    .insertInto("students")
    .values({
      student_id,
      org_id: org_id ?? "org_unknown",
      name: null,
      alias: null,
      initials: null,
      created_at: new Date(),
    })
    .onConflict((oc) => oc.column("student_id").doNothing())
    .execute();
}

export type ActivityInput = {
  activity_id?: string;
  session_id: string;
  student_id?: string;
  app: string;
  type: string;
  topic?: string;
  lesson_title?: string;
  started_at: string; // ISO
  ended_at?: string; // ISO
  duration_ms?: number;
  score?: number;
  correct?: boolean;
  attempts?: number;
  idle_ms?: number;
  distractions?: string[];
  evidence?: Json;
};

export async function insertActivities(db: Kysely<Database>, acts: ActivityInput[]): Promise<void> {
  if (acts.length === 0) return;
  const rows = acts.map((a) => ({
    activity_id: a.activity_id ?? ulid(),
    session_id: a.session_id,
    student_id: a.student_id ?? null,
    app: a.app,
    type: a.type,
    topic: a.topic ?? null,
    lesson_title: a.lesson_title ?? null,
    started_at: new Date(a.started_at),
    ended_at: a.ended_at ? new Date(a.ended_at) : null,
    duration_ms: a.duration_ms ?? null,
    score: a.score ?? null,
    correct: typeof a.correct === "boolean" ? a.correct : null,
    attempts: typeof a.attempts === "number" ? a.attempts : null,
    idle_ms: typeof a.idle_ms === "number" ? a.idle_ms : null,
    distractions: a.distractions ? sql`cast(${JSON.stringify(a.distractions)} as jsonb)` : null,
    evidence: a.evidence ? sql`cast(${JSON.stringify(a.evidence)} as jsonb)` : null,
    created_at: new Date(),
  }));
  await db.insertInto("activities").values(rows as any).execute();
}

export async function insertSummary(db: Kysely<Database>, input: {
  student_id: string;
  day: Date;
  total_duration_ms: number;
  idle_ms: number;
  lessons_completed?: number;
  highlights: string[];
  concerns?: string[];
}): Promise<string> {
  const summary_id = ulid();
  await db
    .insertInto("summaries")
    .values({
      summary_id,
      student_id: input.student_id,
      day: input.day,
      total_duration_ms: input.total_duration_ms,
      idle_ms: input.idle_ms,
      lessons_completed: input.lessons_completed ?? null,
      highlights: sql`cast(${JSON.stringify(input.highlights)} as jsonb)` as unknown as Json,
      concerns: input.concerns ? (sql`cast(${JSON.stringify(input.concerns)} as jsonb)` as unknown as Json) : null,
      created_at: new Date(),
    })
    .execute();
  return summary_id;
}

export async function listRecentSummaries(db: Kysely<Database>, limit = 20) {
  return db
    .selectFrom("summaries")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute();
}

export async function getSummaryAndActivities(db: Kysely<Database>, summary_id: string) {
  const summary = await db.selectFrom("summaries").selectAll().where("summary_id", "=", summary_id).executeTakeFirst();
  if (!summary) return null;
  // Fetch activities for the student for the same day
  const acts = await db
    .selectFrom("activities")
    .selectAll()
    .where("student_id", "=", summary.student_id)
    .where(sql<boolean>`date_trunc('day', started_at::timestamptz) = ${summary.day}`)
    .orderBy("started_at", "asc")
    .execute();
  return { summary, activities: acts };
}

// Device tokens
export type MintTokenInput = {
  org_id?: string;
  device_id?: string;
  ttl_hours?: number;
  note?: string;
};

export async function mintDeviceToken(db: Kysely<Database>, input: MintTokenInput) {
  const token = ulid();
  const expires_at = input.ttl_hours ? new Date(Date.now() + input.ttl_hours * 3600_000) : null;
  await db
    .insertInto("device_tokens")
    .values({
      token,
      org_id: input.org_id ?? null,
      device_id: input.device_id ?? null,
      created_at: new Date(),
      expires_at,
      revoked_at: null,
      note: input.note ?? null,
    })
    .execute();
  return token;
}

export async function revokeDeviceToken(db: Kysely<Database>, token: string) {
  await db
    .updateTable("device_tokens")
    .set({ revoked_at: new Date() })
    .where("token", "=", token)
    .executeTakeFirst();
}

export async function listDeviceTokens(db: Kysely<Database>, limit = 50) {
  return db
    .selectFrom("device_tokens")
    .selectAll()
    .orderBy("created_at", "desc")
    .limit(limit)
    .execute();
}

// Users
export async function createUser(db: Kysely<Database>, email: string, password_hash: string, role: "admin" | "user" = "user") {
  const user_id = ulid();
  await db
    .insertInto("users")
    .values({ user_id, email, password_hash, role, created_at: new Date() })
    .execute();
  return { user_id, email, role };
}

export async function findUserByEmail(db: Kysely<Database>, email: string) {
  return db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
}
