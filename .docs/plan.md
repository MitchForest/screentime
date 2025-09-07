Primitives & Relations (minimal, canonical)
Nouns (8)
Org — Alpha Gate Organization (school, district, household). Tenant boundary, billing/governance scope.


User — human in an Org with a role (admin, teacher, guardian). Auth’d via dashboard.


Student — not a dashboard user. Pseudonymous domain object with student_id (ULID) and metadata (name optional; supports initials/alias).


Device — mac/windows/chromebook; optional student_id affinity; hosts Agent.


Session — bounded period of learning time on a device.


Capture — a unit of evidence produced at cadence: {frame | telemetry}.


Observation — model interpretation of a single Capture (per-capture JSON) with evidence pointers.


Activity — merged sequence of Observations describing one unit of learning (lesson/video/quiz).


Summary — day-level roll-up (per student), auditable pointers to Activities/Observations.


We keep Observation (single-frame result) separate from Activity (multi-frame merge). This simplifies the correlator and aligns with your feedback.
Verbs (7)
capture (Agent/Extension produce Captures)


preprocess (downscale/compress/redact/pHash dedup)


infer (send to Alpha Gate endpoint → Qwen-VL returns Observation)


correlate (merge Observations + Events into Activities)


aggregate (Activities → daily Summary)


review (guardian/teacher inspects Summary, drills to Activities/Evidence/JSON)


retain (apply policy; images expire; JSON persists)


Relations
Org 1..* User(role)
Org 1..* Student
Org 1..* Device --hosts--> 1 Agent
Student 1..* Session
Session --produces--> * Capture
Capture --yields--> 0..1 Observation (infer via Alpha Gate Endpoint)
Observations --merge--> 1..* Activity  --evidence--> * Capture refs(bbox)
Activities --aggregate--> 1 Summary (per student, per day)
Org --policies--> Retention/Redaction/Cadence/Quotas

Identity & IDs (feedback applied)
ULIDs for all ids (org_id, user_id, student_id, device_id, session_id, activity_id).


Student is not a User; it’s a domain record (pseudonymous).


User.external_id can map to IdP/SIS later.


Device references org_id and optionally a default student_id (multi-user laptops supported).



Conceptual Model (aligns to mental models)
Parents/Educators think: Day → Lessons → Proof.
Day = Summary: “What happened today?” time-on-task, idle, # lessons, concerns.


Lessons/Quizzes = Activities: “What unit was done?” title/topic, duration, attempts/score/status.


Proof = Evidence: annotated frames (bboxes) + timestamps. Raw images expire quickly; structured JSON remains.


Without partner APIs the system still works via vision + telemetry; with connectors it enriches accuracy but keeps the same primitives.

Architecture (MVP, precise separation of concerns)
Agent (Mac) / Extension (Chrome)
  ├─ capture + telemetry
  ├─ preprocess (downscale, compress, blur, pHash)
  ├─ signed PUT upload (S3-compatible) → image_url
  ├─ POST /v1/responses (Alpha Gate; model:"vision-screencast-evaluator")
  └─ POST /v1/events (our Worker): session.* + context + snapshot

Alpha Gate
  ├─ OpenAI-compatible /v1/responses
  ├─ Endpoint Studio: routing, guardrails, quotas, retention, BYOK
  └─ Usage metering & billing

Edge Worker (Cloudflare Hono)
  ├─ /v1/events  (validate + enqueue)
  └─ /api/uploads/sign (signed URL minting)

Workers (Bun/Hono)
  ├─ correlator (Observations + Events → Activities)
  ├─ aggregator (Activities/day → Summary)
  └─ retention (purge images > T; keep JSON & hashes)

Storage
  ├─ Postgres/Supabase (OLTP): orgs, students, sessions, activities, summaries, policies
  ├─ ClickHouse (analytics): captures, observations, usage, rollups
  └─ S3-compatible object storage (images, short-lived)

Endpoint versioning & canaries (feedback applied):
Endpoint name: vision-screencast-evaluator@1.0.0 (semver).


Promote vNext with canary % (5–10%) and invalidate Cloudflare KV config cache on promote.


MVP Execution Plan (Order, Tasks, Acceptance)

1) Alpha Gate Endpoint (Required for E2E)
- Tasks:
  - Create endpoint `vision-screencast-evaluator@1.0.0` in Endpoint Studio
  - Paste JSON Schema from `packages/contracts/dist/screentime_activity_v1.json` (Structured JSON)
  - Policies: grade band, PII redaction ON, image retention 24h; quotas per org/key/day
  - Prompt: system + examples; placeholders to merge telemetry
  - Test with sample frame + telemetry; promote to v1.0.0; document canary strategy
- Acceptance:
  - Example frame returns schema‑valid JSON in console
  - Quotas and retention verified; logs show redaction applied

2) Edge Worker Hardening (Security + Validation)
- Tasks:
  - Add Bearer API key auth to `POST /api/uploads/sign` and `POST /v1/events`
  - Validate request bodies with `@screentime/contracts` (Zod): uploads (contentType/ext), events payloads
  - Enforce `Content-Type` on presign; bound key prefix; TTL from env; consistent JSON error envelopes
  - Observability: request‑id, structured logs, minimal metrics (counts/latency)
  - Rate limit per key (basic in‑memory for dev; pluggable for prod)
- Acceptance:
  - cURL examples succeed with valid key; fail with 401/429 as expected
  - Logs show request‑id; no PII; upload PUTs succeed with required headers

3) Storage & Pipeline (Minimal, Auditable)
- Tasks:
  - Add migrations for: orgs, students, devices, sessions, activities, summaries (Supabase Postgres)
  - Implement DAOs in `@screentime/db` via Kysely; switch to factory/lazy DB init
  - Correlator: map one model output → Activity (passthrough + evidence pointers)
  - Aggregator: Activities/day → Summary (duration/idle placeholders); daily per student
  - Retention: job to purge images > TTL; keep JSON + hashes
- Acceptance:
  - Ingested response persists Activity+Summary; API returns last N summaries
  - Retention dry‑run shows candidates; live run deletes objects over TTL

4) Clients (Chrome Extension + macOS app)
- Chrome Extension:
  - Post telemetry events (URL/title/app) to `/v1/events` with retries/backoff
  - Badge UX for error/success; options validation for base URL
- macOS app (production path):
  - Xcode project with ScreenCaptureKit capture at 15–30s cadence; idle pause
  - Preprocess (downscale/compress/redact, pHash dedup);
  - Upload via `/api/uploads/sign`; post telemetry to `/v1/events`
  - Menubar UI (start/stop, sampling, redaction); TCC permissions flow
  - Codesign + notarize; sandbox entitlements
- Acceptance:
  - Fresh Mac install prompts once; capture→upload works; telemetry endpoints accept events
  - Extension hotkey capture + telemetry verified; transient failures recover

5) Web Dashboard (MVP)
- Tasks:
  - Auth (Better Auth) for admin/guardian sessions; environment/doc updates
  - Summaries list page (last N summaries per student)
  - Summary detail page with activities table and evidence preview (presigned GETs)
  - a11y pass: html `lang`, button `type`, focus states; Next best practices
- Acceptance:
  - Authenticated user lists summaries and drills into one activity; evidence preview loads
  - Lighthouse/a11y checks pass for these pages

6) Security & Privacy (MVP level)
- Tasks:
  - Device tokens (short‑lived) minted/revoked from dashboard; org‑scoped API keys
  - Structured logging with redaction; secrets management (no client leaks)
  - Document data retention policy; ensure images expire; JSON persists
- Acceptance:
  - Device token flow tested end‑to‑end; images verified to expire per policy

7) Release Engineering
- Tasks:
  - CI: typecheck, ultracite, basic route tests; optional smoke E2E behind secrets
  - Packaging: macOS DMG notarized; extension packaged for dev channel
  - Runbooks: key rotation, quota tuning, endpoint promotion/canary, rollback
- Acceptance:
  - Green CI; reproducible builds; documented runbooks

Immediate Housekeeping
- Add `**/.next` to `.gitignore` and ensure build artifacts aren’t committed
- Unify contract primitives (ULID/Device enum) to avoid drift between `schema.ts` and `nouns.ts`
- Add zod‑based env validation for edge/web for fast, actionable failures

End‑to‑End MVP Acceptance (single trace)
- A real frame uploaded by extension or macOS app is analyzed by Alpha Gate endpoint
- The output is validated by Zod and persisted; aggregator produces a Summary
- Web dashboard lists the Summary; detail view shows activities and evidence; presigned GETs work
- Logs are structured; images older than TTL are purged; JSON remains for audits


Data Contracts (Zod + JSON Schema)
We ship a contracts package with four schemas.
1) Capture (agent emission)
session_id, student_id, device, ts (RFC3339), phash, optional image_url


telemetry: {active_app, url_redacted, window_title_redacted, clicks_last_15s, keystrokes_last_15s, idle_ms_last_15s}


URL redaction (feedback applied): keep domain + path summary, drop query params; allowlist supports exact path for certain domains (e.g., Khan).
2) Observation (per-capture, model output)
Minimal per-frame analysis:


app (e.g., “Khan Academy”), type (lesson|exercise|video|quiz|search|other)


topic, lesson_title (if present), status (in_progress|completed|failed|unknown)


score?, attempts? (if visually present)


evidence[]: {image_url, bbox[x1,y1,x2,y2]} (required for any score/title claim)


Optional confidence fields per attribute


This is stricter and smaller than the Activity schema; Activity is derived downstream.
3) Activity (merged)
{ id, session_id, student_id, app, type, topic, lesson_title, started_at, ended_at, duration_ms, status, score?, attempts?, idle_ms, distractions[], evidence[] }


evidence[] holds pointers to the subset of frames & bboxes that justify key claims.


Evidence storage pointers (feedback applied): keep phash, timestamp, tiny blurred thumbnail or thumb_hash to maintain auditability when originals are purged.


4) Summary (per student/day)
{ date, student_id, total_duration_ms, idle_ms, lessons_completed, highlights[], concerns[], activities: [{id,title,app,type,duration_ms,status,score?}] }


All four schemas are versioned in @screentime/contracts; Observation is the one installed into Alpha Gate’s response_format: json_schema. The others are server-side outputs.

Endpoint (Alpha Gate)
Name: vision-screencast-evaluator@1.0.0


Routing: Qwen-VL on RunPod (vLLM), region us-east; optional fallback VL.


Policies: Grade band (K-5/6-8/9-12), PII redaction ON, images retention 24h, org quotas.


Prompt (system):


“Return only JSON per Observation schema; if unsure, use unknown. Require evidence with bboxes for each claim about scores/titles; never infer sensitive PII. Use telemetry active_app & url_redacted to disambiguate. No prose.”


Few-shots: Khan, Mentava, YouTube EDU; include failure/ambiguous examples.


Streaming SSE: ON for better TTFB.


Quotas & cadence guards (feedback applied):
Alpha Gate daily caps per org/key/endpoint.


Agents adapt cadence: 20s default → 60s on stable UI; pause on OS idle > 45s; telemetry-only mode when 429s persist.



Build Plan (Bun/Hono Turborepo)
Monorepo
/apps
  /edge-worker        # Cloudflare Hono: /v1/events, /api/uploads/sign
  /backend            # Bun + Hono: admin APIs, auth, correlator admin hooks
  /dashboard          # Next.js (app router): Screentime console
  /marketing          # Next.js: public site
  /agent-mac          # Swift: capture/preprocess/upload/infer/events
  /extension-chrome   # MV3: tab capture + telemetry
  /workers            # Bun queue consumers: correlator, aggregator, retention, usage-mirror

/packages
  /contracts          # Zod + JSON Schemas + TS types
  /ui                 # shadcn namespace registries + Kibo wrappers
  /client             # Typed SDK for our APIs (events, uploads)
  /alphagate          # Responses client thin wrapper (OpenAI compatible)
  /db                 # Kysely client + migrations (Postgres)
  /analytics          # ClickHouse client + queries
  /auth               # Better Auth + Supabase adapter
  /config             # env/schema, feature flags

CI: typecheck, lint, test (contracts + correlator), build, preview deploys; notarization step for Agent.

Detailed Execution Steps
0) Contracts & Fixtures (Week 1)
Implement Zod schemas + JSON Schema exports for Capture, Observation, Activity, Summary.


Provide 30 golden frames and expected Observation JSON (site-specific bundles).


Unit tests for validators and fixture validation.


Exit: @screentime/contracts published; fixtures validate.

1) Endpoint Setup & Quality Harness (Week 1–2)
Create vision-screencast-evaluator@1.0.0 (Alpha Gate Endpoint Studio).


Paste Observation JSON Schema; system prompt + few-shots.


Set policies (grade band, PII redaction, retention, quotas).


Harness: script to send golden frames via Responses API (stream & non-stream) → assert schema-valid and match expectations (precision/recall per field).


Canary switch configured for v1.0.x.


Exit: p95 TTFB < 2.5s; ≥85% title/topic accuracy; ≥90% score presence detection on goldens; no schema violations.

2) Mac Agent (Week 2–4)
Capture/Telemetry
Foreground display screenshot (CG APIs).


Active app, window title; browser URL via AppleScript (when available).


Keystroke/click counts only.


OS idle detection.


Preprocess
Downscale long edge ≤ 1024 px; JPEG/WebP q≈80 (<500KB).


pHash; dedup if Hamming distance ≤ N.


On-device redaction: faces (Apple Vision), OCR word boxes (blur); configurable.


Upload & Infer
POST /api/uploads/sign → signed PUT → image_url.


POST Alpha Gate /v1/responses with input_image + telemetry (JSON text).


POST /v1/events for session lifecycle & snapshots.


Resilience & UX
Offline ring buffer (SQLite) for last 200 frames.


Exponential backoff with jitter; auto telemetry-only mode on sustained 429.


Menu bar app: status, pause/resume, last sync, diagnostics.


First-run wizard: consent, student link, sampling rate, blur, allowlists.


Packaging
Signed, hardened, notarized app with required entitlements.


Auto-update via Sparkle 2 (staged rollout).


.dmg with drag-to-Applications; post-install guide screens.


Exit: uplink <120KB/s @ 20s cadence; CPU <5% on M-series; permissions flow verified.

3) Chrome Extension (Week 3–4)
MV3; permissions: tabs, activeTab, scripting, storage.


captureVisibleTab only on allowlisted domains; blur input fields via canvas mask; pHash dedup.


Telemetry: URL (redacted), title (redacted), focus/blur.


Shares session_id with Agent if present; can run standalone (Chromebook later).


Dev install initially; Web Store later.


Exit: zero capture on blocked domains; payload sizes match targets.

4) Edge & Backend (Week 3–6)
Edge Worker (Cloudflare Hono)
POST /v1/events → Zod validate → enqueue (CF Queues; key by session_id).


POST /api/uploads/sign → S3 PUT with content-type/size restrictions; 15-min expiry.


Key auth: HMAC API keys (prefix + hash), org & scope lookup in KV cache.


Workers (Bun/Hono)
Correlator: fold Observations + Events → Activities.


Split on app/site change, title/topic change, “new unit” flag, idle gap > 2 min.


Merge same app/topic within 2-min gap; compute idle from OS+snapshots; tag distractions (non-allowlist during Activity).


Aggregator: nightly & on-demand generate Summaries per student/day.


Retention: purge images > 24h (policy-driven); keep phash, timestamps, and small blurred thumb (or thumb_hash) for auditability.


Data Model (Postgres)
orgs(id, name, tier, region, created_at)
users(id, org_id, email, role, external_id?, created_at)
students(id, org_id, alias?, grade_band?, created_at)
devices(id, org_id, student_id?, platform, app_version, created_at)
sessions(id, org_id, student_id, device_id, started_at, ended_at?)
activities(id, org_id, student_id, session_id, app, type, topic, title, started_at, ended_at, duration_ms,
          status, score?, attempts?, idle_ms, distractions JSONB, evidence JSONB)
summaries(org_id, student_id, date, total_duration_ms, idle_ms, lessons_completed, highlights JSONB, concerns JSONB, activities JSONB)
policies(org_id, jsonb)  -- retention, blur, cadence, allow/deny lists, grade_band
api_keys(id, org_id, name, prefix, secret_hash, scopes JSONB, status, last_used_at)
audit_log(id, org_id, actor_user_id, action, target, details_json, created_at)

Analytics (ClickHouse)
captures, observations, events, usage_events (mirror from Alpha Gate).


Materialized rollups for usage & latency charts.


Exit: deterministic reprocessing of a day from Events+Observations; idempotent folds; backfill CLI.

5) Dashboard (Next.js + shadcn/kibo; Week 4–7)
IA & Routes
/                   → Overview (usage, install checklist, latest summaries)
/students            → Roster & KPIs
/students/[id]/[date] → Daily Summary (timeline, Activities table, Evidence drawer, JSON tab)
/install             → Wizard (students, agent, extension, policies)
/policies            → Retention/blur/cadence/allowlists
/usage               → Alpha Gate usage: frames/day, p95 latency, cost, quotas
/keys                → API Keys (create/rotate)
/settings            → Org, members & roles

Screens (flow)
Overview
KPI cards: Students Covered, Images Today, Avg Time-on-Task, Idle %.


Checklist: Install Agent, Install Extension, Set Policies, Invite Guardians.


Recent flags: “High distraction” or “Stuck on Fractions”.


Students
Kibo data table: name, today’s time-on-task, lessons completed, idle %, last activity; filters by class/grade, date.


Daily Summary
Header KPIs: total time, idle time/%, # lessons, distractions badge.


Mini timeline (colored segments per Activity).


Activities table (sortable): App/Site, Type, Topic/Title, Start–End, Duration, Status, Score, Idle %, Distractions.


Row → Evidence drawer:


Thumbnails (blurred as policy) → click → bbox overlays; zoom/pan.


Tabs: Evidence, JSON (Observation/Activity), Events (context updates).


Confidence badges (low/medium/high) when provided.


Install Wizard
Step 1: Add Students (inline or CSV).


Step 2: Download Mac Agent; entitlement walkthrough; device appears when online.


Step 3: Install Chrome Extension (dev mode for pilot).


Step 4: Policies (retention default 24h, blur on, cadence “standard”, allow/deny lists).


Step 5: Finish.


Policies
Retention slider (frames: 6h/24h/72h).


Blur toggles: faces, text blocks.


Cadence: conservative/standard/aggressive presets.


Allow/Deny lists (domain, bundle id).


Live preview: drag in sample image to visualize blur mask.


Usage
Charts from ClickHouse + Alpha Gate usage mirror.


Quotas progress bars; alerts at 80% and 100% (email + in-app).


Accessibility & States
Keyboard navigable tables, color-safe badges, skeletons, empty/error states.


Exit: p95 TTFB < 500ms (SSR); CSV export; copy JSON; resilient error handling.

6) Marketing Site (Next.js; Week 4–6)
Home: “Turn screenshots + telemetry into auditable progress.” Value props, trust badges, privacy promise.


Parents / Educators: persona landing, explainer, Daily Summary screenshots.


Developers: Alpha Gate compatibility; sample Responses payload; Events API snippet.


Security & Privacy: COPPA/FERPA posture; retention defaults; on-device redaction.


Pricing (MVP): “Included in Alpha Gate usage; contact for EDU volume.”


Docs (light): Quickstart to install; link to Alpha Gate docs for Responses API.


Changelog/Blog: feature updates, accuracy improvements.


CTAs: “Try Pilot” (signup → install wizard), “Live Demo” (preloaded demo day).

7) Policies, Privacy, Auth, RBAC (Week 5–7)
Consent: captured per-student in install; store timestamp & actor in audit_log.


PII: no keystroke content; blur faces/text; discard URL queries; configurable policy.


Retention: frames 24h by default; JSON long-lived; evidence pointers use thumb/thumb_hash.


Auth: Better Auth + Supabase; roles: admin, teacher, guardian. Students do not log in.


Access control: row-level scoping by org; teacher can be scoped to a subset of students (class/section).


Exports: CSV for Activities; JSON for audit; audit logs for policy changes and exports.



8) Observability, SLOs, and Costs (Week 6–8)
Tracing: OTel spans from Agent → Edge → Correlator → Aggregator; session_id correlation.


Metrics: frames/min, dedup ratio, p95 model latency, error rates, cost/frame.


SLOs: p95 added latency (edge) < 60ms; stream TTFB < 2s; pipeline end-to-end per-capture ≤ 5s p95; 99.5% uptime.


Cost guards:


pHash dedup + adaptive cadence.


Alpha Gate quotas + alerts; agent telemetry-only mode on sustained 429.


Dashboard cost estimator (from Alpha Gate usage mirror).



Billing & Quotas (Alpha Gate first)
Primary: Alpha Gate handles metering, quotas, and billing for model usage.


Dashboard surfacing: /usage shows Alpha Gate usage (frames, latency, cost estimate) + quota bars.


Behavior on limit: Alpha Gate 429 → agent backs off and switches to telemetry-only until window resets.


Future (Phase 2): Optional Stripe metered billing for add-ons (connectors, advanced analytics); still keep modeling costs through Alpha Gate.



Evaluation Harness & Quality (feedback applied)
Golden sets: ≥30 frames initially; add per-domain bundles (Khan, Mentava, YouTube EDU). Include fail/ambiguous patterns.


Metrics: precision/recall for lesson_title, topic, status, score-present, score-value.


Dash: internal “Model Quality” page showing trend lines; segmented by domain.


Contracts CI: “unknown > wrong” enforced; schema-only outputs; evidence bbox present for key claims.


Canaries: endpoint vNext canary 10%; automatic rollback on regression threshold.



Information Architecture (System) & Data Flows
Install → Org created → Students added → Agent installed → Consent logged → Policies set.


Run → Agent/Extension capture at cadence → preprocess → signed upload → Alpha Gate inference → Observation JSON.


Stream → Events posted asynchronously with session lifecycle & input cadence.


Correlate → Merge Observations + Events into Activities (segmentation rules).


Aggregate → Summaries per student/day.


Review → Dashboard Daily Summary → Activities → Evidence & JSON.


Retain → Purge frames at 24h; keep JSON + evidence pointers.



Sprint Plan (8–10 weeks)
S1 — Contracts, Endpoint, Shell
Contracts package, fixtures, endpoint v1.0.0, basic dashboard scaffolding, auth, keys, edge routes.


S2 — Agent & Extension (capture path)
Mac capture/preprocess/upload/events; Chrome capture on allowlist; live pipeline log page.


S3 — Inference & Correlator v1
Responses call end-to-end; correlator segmentation; Activities UI; evidence thumbnails & JSON tab.


S4 — Aggregator, Policies, Retention
Daily Summary & KPIs; policies UI; retention job; usage page (Alpha Gate metrics).


S5 — Install UX & Hardening
Install wizard; device registration; TCC flows; observability dashboards; golden-set tuning.


S6 — Pilot & Polish
Empty/error states; performance & cost passes; quota alerts; pilot onboarding and fixes.



Acceptance Criteria (MVP)
Coverage: ≥ 90% of study time assigned to Activities; ≤ 10% unknown.


Accuracy: ≥ 85% title/topic correctness; ≥ 90% score presence detection; evidence bbox provided for score/title claims.


Latency: p95 capture→Observation ≤ 5s; dashboard TTFB ≤ 500ms.


Cost: ≤ $0.015 per effective capture at default cadence.


Privacy: 100% frames older than policy horizon purged; zero plaintext keystrokes stored.


UX: ≤ 10 minutes from signup to first Summary.



Risks & Mitigations (canonical)
Model misreads → strict schema, “unknown over wrong,” evidence-required, domain prompt branches, confidence gating.


Privacy violations → on-device blur, URL/title redaction, allow/deny lists, short image retention, audit logs.


Cost spikes → pHash dedup, adaptive cadence, quotas/alerts, telemetry-only mode on 429.


Mac permissions friction → installer wizard with screenshots, auto-detection of missing permissions, Chrome-only fallback.


Schema drift → versioned contracts, endpoint semver + canary, CI fixtures.


Infra bottlenecks → queues keyed by session, idempotent consumers, autoscaling workers, observability.



UI/UX Deep Dive (by persona)
Guardians/Teachers
Mental model: Day → Lessons → Proof.


Core actions: Review daily; flag concerns; export CSV/JSON for records.


Key views: Overview KPIs; Students list; Daily Summary with Activities; Evidence drawer; Policies & Usage.


Tone: Calm, privacy-forward, audit-friendly.


Admins
Mental model: Configure & govern.


Core actions: Invite members; set policies & quotas; review usage; manage keys; install products.


Views: Settings, Members & Roles, API Keys, Usage/Quotas, Policies, Audit Log.


Students (MVP)
No dashboard; only agent presence (menu bar), pause/resume, policy view (read-only), link to privacy policy.



Marketing Story (concise)
Value prop: “Turn screenshots + telemetry into auditable learning progress—no partner APIs required.”


Why believe: Strict JSON with evidence, short image retention, built on Alpha Gate (trusted routing, safety, quotas, billing).


How it works: Capture → Evaluate → Summarize → Review.


Privacy-first: On-device redaction; 24h frame retention; clear consent.



Future Phases (direction, not detail)
Phase 2 — Reach & Enrichment
Windows & Chromebook agents; class/section RBAC; partner API connectors (Khan, Mentava) to enrich Activities; teacher assignment views; anomaly alerts.


Phase 3 — Precision & Efficiency
Domain-specialized prompt branches; semi-supervised labeling loop; fine-tuned VL or retrieval-augmented hints; on-device mini-detectors to skip uploads on known screens.


Phase 4 — Ecosystem
Publish endpoint variants in Alpha Gate Catalog; connectors marketplace; SIS/LMS sync; scheduled weekly progress emails.


Phase 5 — Assistive Layer
Real-time student nudges (opt-in); adaptive cadence; federated improvements with strong privacy guarantees.



Copy-Ready Checklists
Endpoint Studio (one-time)
Create vision-screencast-evaluator@1.0.0


Primary: Qwen-VL (RunPod); canary off


Policies: Grade band, PII ON, images retention 24h, daily caps


response_format: json_schema (Observation schema)


Prompt + few-shots installed


Golden-set run: pass thresholds


Canary pipeline configured for v1.0.x


Mac Agent
Capture/preprocess/blur/pHash/dedup


Signed upload + Responses call + Events


Idle detection; adaptive cadence; telemetry-only on 429


Menu bar status; consent wizard


Signed, notarized, Sparkle updates


Chrome Extension
Allowlist-only captures; blur inputs; dedup


URL/title redaction; share session_id


Backend/Edge
/v1/events, /api/uploads/sign (auth + limits)


Correlator segmentation rules implemented & tested


Aggregator rollups; on-demand/day


Retention purge job; evidence pointer thumbnails


Dashboard
Overview, Students, Daily Summary (timeline/table/drawer), Policies, Usage, Keys, Settings


CSV/JSON exports; audit log; accessibility


Observability & SLOs
OTel tracing, error budgets; alerts on quota/exceptions


ClickHouse usage & quality boards



