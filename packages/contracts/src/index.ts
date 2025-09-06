// Screentime contracts (stubs for Milestone 1)
export type ULID = string;

export interface Session {
  session_id: ULID;
  student_id: ULID;
  started_at: string; // ISO
  ended_at?: string; // ISO
  device?: "mac" | "windows" | "chromebook" | "unknown";
}

export interface ActivityEvidence {
  image_url?: string;
  bbox?: [number, number, number, number];
}

export interface Activity {
  app: string;
  type: "lesson" | "exercise" | "video" | "quiz" | "search" | "other";
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
  evidence?: ActivityEvidence[];
}

export interface Summary {
  total_duration_ms: number;
  idle_ms: number;
  lessons_completed?: number;
  highlights: string[];
  concerns?: string[];
}

export interface ScreentimePayload {
  session: Session;
  context?: Record<string, unknown>;
  activities: Activity[];
  summary: Summary;
}

export const version = "0.1.0";
