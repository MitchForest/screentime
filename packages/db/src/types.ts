// Kysely table definitions for MVP schema

export type GradeBand = "K-5" | "6-8" | "9-12";

export interface OrgsTable {
  org_id: string;
  name: string;
  grade_band: GradeBand | null;
  pii_redaction: boolean | null;
  image_retention_hours: number | null;
  created_at: Date;
}

export interface StudentsTable {
  student_id: string;
  org_id: string;
  name: string | null;
  alias: string | null;
  initials: string | null;
  created_at: Date;
}

export interface DevicesTable {
  device_id: string;
  org_id: string;
  kind: string;
  default_student_id: string | null;
  created_at: Date;
}

export interface SessionsTable {
  session_id: string;
  student_id: string;
  started_at: Date;
  ended_at: Date | null;
  device: string | null;
  created_at: Date;
}

export interface ActivitiesTable {
  activity_id: string;
  session_id: string;
  app: string;
  type: string;
  topic: string | null;
  lesson_title: string | null;
  started_at: Date;
  ended_at: Date | null;
  duration_ms: number | null;
  score: number | null;
  correct: boolean | null;
  attempts: number | null;
  idle_ms: number | null;
  distractions: unknown | null; // jsonb
  evidence: unknown | null; // jsonb
  created_at: Date;
  student_id: string | null; // denormalized for faster queries (optional)
}

export interface SummariesTable {
  summary_id: string;
  student_id: string;
  day: Date; // UTC midnight date
  total_duration_ms: number;
  idle_ms: number;
  lessons_completed: number | null;
  highlights: unknown; // jsonb array of strings
  concerns: unknown | null; // jsonb array of strings
  created_at: Date;
}

export interface Database {
  orgs: OrgsTable;
  students: StudentsTable;
  devices: DevicesTable;
  sessions: SessionsTable;
  activities: ActivitiesTable;
  summaries: SummariesTable;
}

export interface DeviceTokensTable {
  token: string; // ulid-based or random string
  org_id: string | null;
  device_id: string | null;
  created_at: Date;
  expires_at: Date | null;
  revoked_at: Date | null;
  note: string | null;
}

declare module "./types" {
  // augment Database to include device_tokens table
  interface Database {
    device_tokens: DeviceTokensTable;
  }
}

export interface UsersTable {
  user_id: string;
  email: string;
  password_hash: string;
  role: "admin" | "user";
  created_at: Date;
}

declare module "./types" {
  interface Database {
    users: UsersTable;
  }
}
