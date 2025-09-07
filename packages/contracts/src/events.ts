import { z } from "zod";
import { zULID } from "./primitives";

const zISOTime = z.string().datetime();

const zSessionStart = z.object({
  type: z.literal("session.start"),
  session_id: zULID,
  student_id: zULID,
  started_at: zISOTime,
});

const zSessionEnd = z.object({
  type: z.literal("session.end"),
  session_id: zULID,
  ended_at: zISOTime,
  duration_ms: z.number().int().min(0).optional(),
});

const zSessionPause = z.object({
  type: z.literal("session.pause"),
  session_id: zULID,
  at: zISOTime,
});

const zSessionResume = z.object({
  type: z.literal("session.resume"),
  session_id: zULID,
  at: zISOTime,
});

const zContextUpdate = z.object({
  type: z.literal("context.update"),
  session_id: zULID,
  at: zISOTime,
  active_app: z.string().optional(),
  url: z.string().optional(),
  window_title: z.string().optional(),
});

const zActivitySnapshot = z.object({
  type: z.literal("activity.snapshot"),
  session_id: zULID,
  at: zISOTime,
  clicks_last_15s: z.number().int().min(0).optional(),
  keystrokes_last_15s: z.number().int().min(0).optional(),
  idle_ms_last_15s: z.number().int().min(0).optional(),
});

export const zEvent = z.discriminatedUnion("type", [
  zSessionStart,
  zSessionPause,
  zSessionResume,
  zSessionEnd,
  zContextUpdate,
  zActivitySnapshot,
]);

export type EventPayload = z.infer<typeof zEvent>;

