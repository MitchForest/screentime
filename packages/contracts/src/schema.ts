import { z } from "zod";

const SCORE_MIN = 0;
const SCORE_MAX = 100;

export const zULID = z.string().min(1);

export const zDevice = z.enum(["mac", "windows", "chromebook", "unknown"]);

export const zSession = z.object({
  session_id: zULID,
  student_id: zULID,
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  device: zDevice.optional(),
});

export const zContext = z.object({
  active_app: z.string().optional(),
  url: z.string().optional(),
  window_title: z.string().optional(),
  idle_ms_last_interval: z.number().int().min(0).optional(),
  clicks_last_interval: z.number().int().min(0).optional(),
  keystrokes_last_interval: z.number().int().min(0).optional(),
});

export const zActivityEvidence = z.object({
  image_url: z.string().optional(),
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
});

export const zActivity = z.object({
  app: z.string().describe("Detected app/site, e.g. 'Khan Academy'"),
  type: z.enum(["lesson", "exercise", "video", "quiz", "search", "other"]),
  topic: z.string().optional(),
  lesson_title: z.string().optional(),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime().optional(),
  duration_ms: z.number().int().min(0).optional(),
  score: z.number().min(SCORE_MIN).max(SCORE_MAX).optional(),
  correct: z.boolean().optional(),
  attempts: z.number().int().min(0).optional(),
  idle_ms: z.number().int().min(0).optional(),
  distractions: z.array(z.string()).optional(),
  evidence: z.array(zActivityEvidence).optional(),
});

export const zSummary = z.object({
  total_duration_ms: z.number().int().min(0),
  idle_ms: z.number().int().min(0),
  lessons_completed: z.number().int().min(0).optional(),
  highlights: z.array(z.string()),
  concerns: z.array(z.string()).optional(),
});

export const zScreentimePayload = z.object({
  session: zSession,
  context: zContext.optional(),
  activities: z.array(zActivity),
  summary: zSummary,
});

export type ScreentimePayload = z.infer<typeof zScreentimePayload>;
