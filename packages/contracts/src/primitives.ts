import { z } from "zod";

export const SCORE_MIN = 0;
export const SCORE_MAX = 100;

export const zULID = z.string().min(1);
export const zDevice = z.enum(["mac", "windows", "chromebook", "unknown"]);

export type ULID = z.infer<typeof zULID>;
export type Device = z.infer<typeof zDevice>;

