import { ulid } from "ulid";

export function newId(prefix = "id"): string {
  return `${prefix}_${ulid()}`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
