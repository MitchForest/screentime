-- Schema initialization for Screentime MVP

create table if not exists orgs (
  org_id text primary key,
  name text not null,
  grade_band text,
  pii_redaction boolean,
  image_retention_hours integer,
  created_at timestamptz not null default now()
);

create table if not exists students (
  student_id text primary key,
  org_id text not null references orgs(org_id) on delete set null,
  name text,
  alias text,
  initials text,
  created_at timestamptz not null default now()
);

create table if not exists devices (
  device_id text primary key,
  org_id text not null references orgs(org_id) on delete set null,
  kind text not null,
  default_student_id text references students(student_id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  session_id text primary key,
  student_id text not null references students(student_id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  device text,
  created_at timestamptz not null default now()
);

create table if not exists activities (
  activity_id text primary key,
  session_id text not null references sessions(session_id) on delete cascade,
  app text not null,
  type text not null,
  topic text,
  lesson_title text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_ms integer,
  score numeric,
  correct boolean,
  attempts integer,
  idle_ms integer,
  distractions jsonb,
  evidence jsonb,
  created_at timestamptz not null default now(),
  student_id text
);

create index if not exists idx_activities_student_day on activities (student_id, started_at);

create table if not exists summaries (
  summary_id text primary key,
  student_id text not null references students(student_id) on delete cascade,
  day date not null,
  total_duration_ms integer not null,
  idle_ms integer not null,
  lessons_completed integer,
  highlights jsonb not null,
  concerns jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_summaries_student_day on summaries (student_id, day desc);

create table if not exists device_tokens (
  token text primary key,
  org_id text references orgs(org_id) on delete set null,
  device_id text references devices(device_id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  note text
);

create table if not exists users (
  user_id text primary key,
  email text not null unique,
  password_hash text not null,
  role text not null default 'user',
  created_at timestamptz not null default now()
);
