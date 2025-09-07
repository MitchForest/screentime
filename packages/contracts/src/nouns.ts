import { z } from "zod";

const SCORE_MIN = 0;
const SCORE_MAX = 100;

export const zULID = z.string().min(1);

export const zOrg = z.object({
  org_id: zULID,
  name: z.string().min(1),
  grade_band: z.enum(["K-5", "6-8", "9-12"]).optional(),
  pii_redaction: z.boolean().optional(),
  image_retention_hours: z.number().int().min(0).optional(),
});

export const zUserRole = z.enum(["admin", "teacher", "guardian"]);

export const zUser = z.object({
  user_id: zULID,
  org_id: zULID,
  role: zUserRole,
  email: z.string().email().optional(),
  external_id: z.string().optional(),
});

export const zStudent = z.object({
  student_id: zULID,
  org_id: zULID,
  name: z.string().optional(),
  alias: z.string().optional(),
  initials: z.string().optional(),
});

export const zDeviceKind = z.enum(["mac", "windows", "chromebook", "unknown"]);

export const zDevice = z.object({
  device_id: zULID,
  org_id: zULID,
  kind: zDeviceKind,
  default_student_id: zULID.optional(),
});

export const zCapture = z.object({
  capture_id: zULID,
  session_id: zULID,
  at: z.string().datetime(),
  type: z.enum(["frame", "telemetry"]),
  image_url: z.string().url().optional(),
  telemetry: z
    .object({
      active_app: z.string().optional(),
      url: z.string().optional(),
      window_title: z.string().optional(),
      idle_ms_last_interval: z.number().int().min(0).optional(),
      clicks_last_interval: z.number().int().min(0).optional(),
      keystrokes_last_interval: z.number().int().min(0).optional(),
    })
    .optional(),
});

export const zObservation = z.object({
  observation_id: zULID,
  capture_id: zULID,
  at: z.string().datetime(),
  app: z.string().optional(),
  type: z.enum(["lesson", "exercise", "video", "quiz", "search", "other"]).optional(),
  topic: z.string().optional(),
  lesson_title: z.string().optional(),
  score: z.number().min(SCORE_MIN).max(SCORE_MAX).optional(),
  correct: z.boolean().optional(),
  attempts: z.number().int().min(0).optional(),
  evidence: z
    .array(
      z.object({
        image_url: z.string().optional(),
        bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
      })
    )
    .optional(),
});

export type Org = z.infer<typeof zOrg>;
export type User = z.infer<typeof zUser>;
export type Student = z.infer<typeof zStudent>;
export type Device = z.infer<typeof zDevice>;
export type Capture = z.infer<typeof zCapture>;
export type Observation = z.infer<typeof zObservation>;
