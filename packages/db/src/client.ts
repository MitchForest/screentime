import { Kysely, sql } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";
import postgres from "postgres";
import type { Database } from "./types";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required for @screentime/db");
}

// Create a Postgres.js client. Ensure your DATABASE_URL has sslmode=require for Supabase.
const client = postgres(DATABASE_URL, {
  // If you didn't include sslmode in the URL, you can force here:
  // ssl: { rejectUnauthorized: false },
  max: 5,
});

export const db = new Kysely<Database>({
  dialect: new PostgresJSDialect({
    postgres: client,
  }),
});

// Simple health check helper
export async function dbNow(): Promise<Date> {
  const res = await sql<{ now: Date }>`select now() as now`.execute(db);
  return res.rows[0].now;
}
