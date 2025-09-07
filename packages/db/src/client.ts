import { Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { Database } from "./types";

let cached: Kysely<Database> | undefined;

export function createDb(): Kysely<Database> {
  if (cached) return cached;
  const { DATABASE_URL } = process.env;
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL is required for @screentime/db");
  }
  const client = postgres(DATABASE_URL, {
    max: 5,
  });
  cached = new Kysely<Database>({ dialect: new PostgresJSDialect({ postgres: client }) });
  return cached;
}

// Simple health check helper
export async function dbNow(): Promise<Date> {
  const db = createDb();
  const res = await sql<{ now: Date }>`select now() as now`.execute(db);
  return res.rows[0].now;
}
