import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { sql } from "kysely";
import { createDb } from "../src/client";

async function main() {
  const db = createDb();
  const dir = join(process.cwd(), "packages/db/migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files) {
    const p = join(dir, f);
    const raw = readFileSync(p, "utf8");
    // naive split on ; for multiple statements, ignore empty
    const statements = raw
      .split(/;\s*\n/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await sql.raw(stmt).execute(db);
    }
    // biome-ignore lint/suspicious/noConsole: CLI output
    console.log("applied migration:", f);
  }
}

main().catch((err) => {
  // biome-ignore lint/suspicious/noConsole: CLI output
  console.error(err);
  process.exit(1);
});

