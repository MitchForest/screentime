Screentime Delivery Tracker

Handoff — Read Me First (MVP)

- Current state: End-to-end loop works locally once Alpha Gate is configured. Extension and Mac agent capture → upload → edge `/v1/responses/proxy` → model → persist → summaries visible in web.
- Your immediate actions:
  1) Alpha Gate: Create/promote `vision-screencast-evaluator@1.0.0`, paste JSON Schema from `packages/contracts/dist/screentime_activity_v1.json`, enable PII redaction + 24h retention, set quotas. Test with a sample.
  2) Env: Fill `.env` for edge/web with `ALPHAGATE_API_KEY`, `ALPHAGATE_BASE_URL`, `AWS_*`, `DATABASE_URL`, `EDGE_API_KEYS`, `AUTH_SECRET`.
  3) DB: `bun run -w @screentime/db migrate` to create tables.
  4) Run: `bun run dev:edge`, then `bun run build:web && bun run start:web`.
  5) Web: Visit `/signup` to create account; admin role is given on first signup if `ADMIN_EMAIL` matches; go to `/onboarding` to mint device token and install clients.
  6) Extension: Load unpacked from `apps/extension`, set Base URL and token, use Cmd/Ctrl+Shift+U.
  7) Mac app: Open `apps/mac-native/ScreentimeAgent/Package.swift` in Xcode, run, grant Screen Recording, set Base URL and token, Start capture.
  8) Verify: Summaries appear under `/summaries`; open a summary to view activities and evidence links.

- Notes:
  - Web reads edge admin APIs (`/api/summaries`, `/api/summaries/:id`). If `EDGE_API_KEYS` is set, set `EDGE_DASHBOARD_API_KEY` in web env for auth.
  - Better Auth package is installed; current auth uses secure, HMAC-signed cookies for MVP. Swapping to Better Auth is planned below.
  - Do not expose service role keys in the browser; use device tokens for agents.

Roadmap Summary — MVP (Order & Acceptance)

1) Alpha Gate endpoint live (v1.0.0) with Structured JSON; sample frame validates.
2) Edge worker hardened: Bearer auth, Zod validation, request‑id logs, basic rate limits; presigned PUT/GET enforced.
3) Storage + pipeline minimal: migrations, DAOs, correlator (1→1), aggregator (daily), retention job.
4) Clients: Chrome extension posts telemetry; macOS app captures at cadence with preprocess + uploads + telemetry.
5) Web dashboard: auth; list summaries; activity detail with evidence.
6) Security & privacy: device tokens; image retention verified; no client‑side secrets.
7) Release engineering: CI checks, notarized DMG, extension package, runbooks.

Milestone 1 — Bootstrap Repo & Initial Push

- [x] Prereqs: Install toolchain
  - [x] Bun 1.1+ (`bun -v`)
  - [x] Git 2.40+ (`git --version`)
  - [x] GitHub auth ready (pushed to origin)
  - [x] Biome + Ultracite installed

- [x] Initialize git and remote
  - [x] In repo root: `git init`
  - [x] Create `.gitignore`
  - [x] Default branch: `git branch -M main`
  - [x] Add origin: `git remote add origin https://github.com/MitchForest/screentime.git`

- [x] Scaffold monorepo structure (apps + packages)
  - [ ] Root files: `README.md`, `.editorconfig`, `.env.example`, `tsconfig.base.json`, `pnpm-workspace.yaml`
  - [ ] Folders:
    - [x] `apps/edge-worker/` (Hono app — runs under Bun for dev; optionally deployable to Cloudflare Worker later)
    - [ ] `apps/workers/correlator/` (Bun + Hono job/queue)
    - [ ] `apps/workers/aggregator/` (Bun + Hono job/queue)
    - [ ] `apps/workers/retention/` (Bun job)
    - [x] `packages/contracts/` (Zod domain + JSON Schema generation) — stubbed
    - [x] `packages/alphagate-client/` (typed client wrapper for Responses/Events) — stubbed
    - [x] `packages/shared/` (types, ULID util, logging) — stubbed
    - [ ] `infra/` (wrangler.toml, env templates; later: Terraform/SQL migrations)
    - [ ] `scripts/` (dev/build helpers)

- [x] Root package and workspace setup
  - [x] `bun init -y`, set `"private": true`
  - [x] Add workspaces to `package.json`:
        "workspaces": ["apps/*", "apps/workers/*", "packages/*"]
  - [x] Add root scripts: `"typecheck"`, `"format"`, `"lint"`, `"dev:web"`, `"dev:edge"`

- [x] TypeScript + linting/formatting baseline
  - [x] Root dev deps: `typescript @biomejs/biome ultracite`
  - [x] Configure `biome.json` (formatter + linter, TS project; Bun global)
  - [x] `tsconfig.base.json`: strict TS, bundler resolution, path aliases

- [x] Package: `packages/contracts`
  - [x] Init: workspace package.json
  - [x] Deps: `zod zod-to-json-schema`
  - [ ] Export Zod schemas for: Org, User, Student, Device, Session, Capture, Observation, Activity, Summary
  - [ ] Script to emit JSON Schema (align to Integration Guide §6) → `dist/schema.json`

- [x] Package: `packages/alphagate-client`
  - [x] Init and deps: minimal fetch-based client (avoid Node-only SDKs)
  - [x] Config: accepts `ALPHAGATE_API_KEY`, `ALPHAGATE_BASE_URL`
  - [x] Helper: `responsesCreate()` wrapper using endpoint name `vision-screencast-evaluator` (streaming later)

- [x] Package: `packages/shared`
  - [x] Init and deps: `zod ulid`
  - [x] Utilities: id generator (ULID), retry/backoff, result types

- [x] App: `apps/edge-worker` (Hono on Bun; CF optional)
  - [x] Files: `src/index.ts` (Hono app), `dev.ts` (Bun server for local dev)
  - [x] Deps: `hono`
  - [x] Routes: `POST /v1/events` (validate + 202 queue), `GET /healthz`, `POST /api/uploads/sign` (stub)
  - [ ] Local dev: `bun run apps/edge-worker/dev.ts` (manual run)

- [x] Apps: Bun Workers (correlator, aggregator, retention)
  - [x] Each folder with `src/index.ts`
  - [x] Deps per app: `hono zod` (later as needed)
  - [ ] Scripts: `bun run dev`, `bun build`

- [x] Install all deps
  - [x] `bun install`
  - [x] Ultracite/Biome check passes across repo
  - [x] Typecheck baseline wired

- [x] Seed minimal code so builds pass
  - [x] Each app exports a no-op handler

- [x] First commit and push
  - [x] Initial commit created and pushed to `main`

- [x] Web app scaffold (requested)
  - [x] `apps/web` (Next.js 14 app router)
  - [x] Tailwind + shadcn configured (`components.json`, namespace `sct`)
  - [x] Base UI installed (Button) and demo page

- [ ] Acceptance criteria
  - [x] Clean install with `bun install` succeeds
  - [x] Biome/Ultracite checks pass
  - [x] Local dev serves `GET /healthz` via Bun/Hono (verified in-process)
  - [x] Repo visible at GitHub with initial commit

Milestone 2 — Data Contracts & IDs

- [ ] Adopt ULIDs for ids: `org_id`, `user_id`, `student_id`, `device_id`, `session_id`, `activity_id`
- [x] Implement Zod contracts for MVP payload (Session/Context/Activity/Summary)
- [x] Add remaining nouns as needed (Org/User/Student/Device/Capture/Observation)
- [x] Provide validators in `@contracts` (zod exports)
- [x] Generate JSON Schema matching Integration Guide §6; versioned as `screentime_activity_v1`
  - Generated: `packages/contracts/dist/screentime_activity_v1.json`
- [x] Add tests for schema round‑trip (Zod ⇄ JSON Schema)
  - `bun run -w packages/contracts build:schema && bun run -w packages/contracts test`

Milestone 3 — Real S3 + Alpha Gate (E2E MVP)

- [ ] AWS S3 setup (see Appendix: AWS S3 Setup)
  - [ ] Create bucket (Block Public Access ON), note `AWS_S3_BUCKET` and `AWS_REGION`
  - [ ] Apply CORS for browser/extension uploads (PUT, GET, HEAD)
  - [ ] Create IAM user+policy scoped to bucket/prefix (PutObject/GetObject)
  - [ ] Create access key and add to `.env` (AWS_ACCESS_KEY_ID/SECRET)
- [ ] Configure Alpha Gate Endpoint (PENDING)
  - [ ] Create `vision-screencast-evaluator@1.0.0`
  - [ ] Paste `packages/contracts/dist/screentime_activity_v1.json` as Structured JSON
  - [ ] Set policies (grade band, PII redaction ON, image retention 24h)
  - [ ] Set quotas (images/day)
  - [ ] Test with sample frame; promote to v1.0.0
- [ ] Implement upload signing in edge worker
  - [x] `POST /api/uploads/sign` returns: `{ putUrl, getUrl, key, headers, expiresIn }`
  - [ ] Strategy: presigned PUT to `s3://$AWS_S3_BUCKET/$AWS_S3_PREFIX/<ulid>.jpg`
  - [ ] Include presigned GET (`getUrl`, 5–10m TTL) for `image_url` in model call
  - [ ] Validate content type `image/jpeg|webp|png`
  - [ ] Require Bearer API key; return 401 on missing/invalid
  - [ ] Zod-validate request body; structured JSON error envelopes
  - [ ] Add request-id logging and minimal metrics (counts/latency)
  - [ ] Basic per-key rate limiting (dev-grade; pluggable for prod)
- [ ] Minimal Responses integration (BLOCKED until endpoint configured)
  - [x] Add JSON helper in `@screentime/alphagate-client`
  - [x] E2E harness script in place (`bun run e2e <image>`) — will run after endpoint is live
  - [x] Edge: `/v1/responses/proxy` calls Alpha Gate with `image_url` + telemetry and persists output
  - [x] Clients: Call proxy after upload (Mac app + extension)
- [ ] Minimal pipeline
  - [ ] Correlator: map one response → Activity (passthrough of model fields)
  - [ ] Aggregator: Activity → Summary (compute duration/idle placeholders)
  - [x] Persist endpoint: `POST /v1/persist` validates Screentime payload and stores Session/Activities/Summary
- [ ] Edge events route hardening
  - [ ] `POST /v1/events` requires Bearer API key
  - [ ] Zod-validate event bodies (session/context/activity snapshot)
  - [ ] Structured logs with request-id; redaction where needed
- [ ] Web UI (MVP)
  - [x] Page to list last N summaries and drill into one Activity (show evidence bbox frame URL)
  - [x] Admin: device token mint/revoke page
  - [x] Onboarding/install page with download links and setup instructions (extension + mac app)
  - [x] Minimal admin login (cookie)
  - [x] Use Edge admin APIs from web (not direct DB)
  - [ ] Real signup/login with Better Auth (email/password or magic link)
- [ ] Acceptance
  - [ ] Sample image uploaded to S3, Response produced, Activity/Summary persisted, visible in dashboard (BLOCKED until endpoint configured)
  - [ ] All checks pass (Ultracite/Biome), envs documented

Immediate Housekeeping

- [ ] Add `**/.next` to `.gitignore` to avoid committing build artifacts
- [ ] Unify contract primitives (ULID/Device enum) between `schema.ts` and `nouns.ts`
- [ ] Add zod-based env validation for edge/web; fail fast with actionable messages

Milestone 4 — Clients (Swift Mac app + Chrome Extension)

 - [ ] Swift Mac app (production path)
  - [ ] Xcode project `apps/mac-native` (bundle id, signing team)
  - [ ] ScreenCaptureKit capture + cadence (15–30s; idle pause)
  - [ ] TCC permissions flow (screen recording)
  - [ ] Preprocess (downscale/compress/redact) before upload
    - [x] Downscale + JPEG compress implemented (≤1024 px, ~80% quality)
    - [ ] Redaction (blur regions)
  - [x] Upload via `/api/uploads/sign` → PUT (Content-Type enforced)
  - [x] Telemetry events (active app/window title/url) to `/v1/events`
  - [ ] Responses call (after endpoint configured) with `image_url`
  - [x] Menubar UI (start/stop, sampling slider)
  - [ ] Packaging: codesign + notarize; app sandbox entitlements
  - [ ] Acceptance: install on a clean Mac, capture→upload works, prompts shown once
  - [x] MVP Prototype: SwiftUI menubar app via SPM at `apps/mac-native/ScreentimeAgent` (uses `CGDisplayCreateImage` for initial capture)
- [x] Chrome Extension (MV3) — initial
  - [x] Hotkey `Cmd/Ctrl+Shift+U` captures visible tab and uploads via presigned PUT
  - [x] Options page to set backend base URL
  - [x] Telemetry events (URL/title) to backend
  - [ ] Responses call orchestrated by backend
  - [ ] Distribution: Chrome Web Store listing or documented "Load unpacked" instructions in web onboarding

Milestone 5 — Prod Readiness

- [ ] Data: move pipeline persistence to Postgres; add migrations
- [ ] Observability: structured logs, metrics, tracing; alerts
- [ ] Security: rotate keys, limit IAM policy to bucket/prefix; audit logs; retention job
- [ ] Reliability: retries/backoff, idempotency keys, queue/dlq for workers
- [ ] Performance: pHash delta cache to skip identical frames
- [ ] Cost: tune quotas/cadence; storage lifecycle rules; gzip JSON

Appendix — AWS S3 Setup (Step‑by‑Step)

1) Create bucket
- Name: globally unique (e.g., `screentime-<org>-uploads`)
- Region: choose and note `AWS_REGION`
- Block Public Access: ON
- Versioning: optional (Off)
- Default encryption: AES‑256

2) Set CORS (Bucket → Permissions → CORS configuration)
```
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

3) Create IAM user and attach policy (programmatic access only)
- User: `screentime-uploader`
- Policy (replace `BUCKET_NAME` and optionally prefix `frames/*`):
```
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PutGetObjects",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:AbortMultipartUpload"],
      "Resource": "arn:aws:s3:::BUCKET_NAME/frames/*"
    }
  ]
}
```

4) Create Access Key
- Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` securely

5) Fill `.env`
- `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PREFIX=frames/`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `UPLOAD_SIGN_TTL_SECONDS=600`

6) Upload pattern and URLs
- Object key: `frames/<ulid>.jpg`
- `putUrl`: presigned PUT for direct upload
- `getUrl`: presigned GET (5–10m TTL) to pass as `image_url` in Alpha Gate `input_image`
- Note: Keep bucket private; rely on presigned GET for model fetch
 - [ ] Confirm ULID implementation vs dependency (native impl or `ulid` pkg)

Milestone 3 — Alpha Gate Endpoint

- [ ] Console: Create endpoint `vision-screencast-evaluator@1.0.0`
- [ ] Policies: set grade band, PII redaction ON, image retention 24h
- [ ] Quotas: cap images/day per org/key
- [ ] Structured Output: paste JSON Schema from `@contracts`
- [ ] Prompt template: system prompt + examples; placeholders for telemetry merges
- [ ] Test harness: sample screenshot + telemetry; validate output
- [ ] Promote to v1.0.0; document canary flow for vNext

Milestone 4 — Edge Worker (Events & Uploads)

- [ ] Implement `POST /v1/events` (validate, enqueue)
- [x] Implement `POST /api/uploads/sign` (returns signed URL; back it with S3-compatible storage)
- [ ] Bindings: env vars and secrets documented in `.env.example` (Cloudflare `wrangler.toml` optional if we choose Cloudflare)
- [x] Observability: request ids; structured JSON errors
- [x] cURL examples in README to validate endpoints (plus `scripts/e2e-run.ts`)
- [x] Admin APIs: `GET /api/summaries`, `GET /api/summaries/:id`, device token mint/revoke/list

Milestone 5 — Workers Pipeline

- [ ] Correlator: merge Observations + Events → Activities
- [ ] Aggregator: Activities/day → Summary (per student)
- [ ] Retention: purge images > TTL; keep JSON & hashes
- [ ] Job runners: backoff, idempotency, metrics

Milestone 6 — Storage

- [x] Postgres (OLTP): orgs, students, sessions, activities, summaries (baseline committed)
- [ ] ClickHouse (analytics): captures, observations, usage, rollups
- [ ] S3-compatible object storage for images; short-lived
- [x] Migration tool (Kysely SQL runner); baseline schema committed in `packages/db/migrations`

Milestone 7 — Client Integrations (MVP)

- [ ] Mac Agent prototype: capture, preprocess, signed PUT upload, POST events
- [ ] Chrome Extension prototype: page context + optional captures
- [ ] Response call: use `@alphagate-client` to call `/v1/responses` with `input_text` + `input_image`
- [ ] Local validation against schema; store outputs for audits
 - [ ] Integrate Ultracite (confirm package and purpose) if relevant to client-side processing or formatting

Milestone 8 — Security, Privacy, Compliance

- [ ] No raw provider keys in clients; use org-scoped Alpha Gate keys
- [ ] On-device redaction where possible; server-side enforcement otherwise
- [ ] Retention policies honored; per-student opt-out path
- [ ] Secrets management: local via `.env`, prod via platform secrets

Milestone 9 — Observability & Ops

- [ ] Usage dashboards (Alpha Gate + internal)
- [ ] Logs with PII redaction, sampling
- [ ] Alerts on quota/rate-limit and error spikes

Milestone 10 — QA, Pilot, Iterate

- [ ] Pilot orgs enabled; sampling cadence tuned (15–30s; delta cache)
- [ ] Prompt and schema refinements based on real data
- [ ] Backlog triage and vNext canary plan

Appendix — Helpful Commands

- `git init && git branch -M main && git remote add origin https://github.com/MitchForest/screentime.git`
- `bun init -y && bun install`
- `bun add -d @biomejs/biome typescript`
- `bun add -w hono`
- Local dev: `bun run apps/edge-worker/dev.ts`
- Alpha Gate client example (Responses): use `openai` with `baseURL=https://api.alphagate.ai/v1` and `model=vision-screencast-evaluator`

Note on Wrangler

- Wrangler is Cloudflare’s CLI for developing and deploying Cloudflare Workers. If/when we target Cloudflare for the edge, we’ll add `wrangler.toml` and use `wrangler dev`/`wrangler deploy`. For now, we run the Hono app under Bun locally and can decide on deployment later.
- [ ] Auth + DB (Supabase + Kysely + Better Auth)
  - [x] Supabase project and Postgres URL (SSL) — env added
  - [x] Add `packages/db` with Kysely + Postgres (postgres-js dialect)
  - [ ] Define tables: orgs, users, students, devices, sessions, activities, summaries, policies
  - [ ] Migrations (SQL + runner) and seed
  - [ ] Better Auth installed in `apps/web` (session cookies); roles: admin/teacher/guardian
  - [ ] Protect dashboard routes; backend verifies session/JWT for admin APIs
  - [ ] Device/agent auth: short-lived scoped tokens minted server-side (no Better Auth on agents)

Appendix — Supabase + Kysely Notes

- Generate Supabase types:
  - Linked project: `supabase gen types typescript --local > packages/db/src/__generated__/supabase.ts`
  - Or via DB URL: `supabase gen types typescript --db-url "$DATABASE_URL" > packages/db/src/__generated__/supabase.ts`
- Kysely typing:
  - `packages/db/src/types.ts` uses `kysely-supabase` to translate Supabase types.
- Health check:
  - `bun run -w @screentime/db ping` logs `DB now:` if connection works.

Priority Track — Real Functional MVP (Swift + Extension + Web + Alpha Gate)

Goal: A real user installs the Mac app (Swift) and the Chrome extension from the web app, grants permissions, starts a session, and real screenshots + app/URL telemetry are sent to the Qwen‑VL endpoint via Alpha Gate. Structured JSON and end‑of‑session summaries are produced and visible in the dashboard. Follows .docs/plan.md and .docs/integration-guide.md.

Current Status (Done vs Remaining)

- [x] Web app scaffold (Next 15 + React 19) with shadcn UI; fixed typedRoutes config
- [x] S3 presign route: `POST /api/uploads/sign` (Bun/Hono) returning PUT + GET URLs
- [x] Contracts + JSON Schema + round‑trip tests; schema file generated
- [x] Chrome Extension (initial): capture visible tab → upload via presigned PUT; options page for base URL
- [x] E2E harness script (awaits real endpoint): upload → call Alpha Gate → validate via Zod
- [x] Kysely + postgres-js DB package scaffold; envs added for Supabase
- [ ] Alpha Gate endpoint (BLOCKER): create `vision-screencast-evaluator`, paste schema, set policies/quotas, test, promote v1.0.0
- [ ] Minimal pipeline: correlator + aggregator (in app/edge-worker) with in‑memory store (then Supabase)
- [ ] Web dashboard: list latest Summaries; drill into Activities with evidence
- [ ] Swift Mac app (production): capture + preprocess + permissions + upload + events + responses + menubar + packaging
- [ ] Better Auth in web: dashboard auth (admin/teacher/guardian); agent device token minting

MVP User Flows (to implement now)

- Onboarding (Web)
  - [ ] Public landing with “Download Mac App” (DMG) and “Install Chrome Extension” links
  - [ ] Auth (Better Auth) for dashboard users; set up org and students/devices
  - [ ] Device token issuance (short‑lived, scoped) for Mac app & Extension

- Start a Session
  - [ ] From dashboard: create session (ULID), provide token to device; show “Recording…”
  - [ ] Mac app starts cadence (15–30s when active) capturing screen via ScreenCaptureKit; extension captures URL/title (and optional frame)
  - [ ] Preprocess (downscale/compress/redact; skip near‑duplicates via pHash)
  - [ ] Upload frames via `/api/uploads/sign` → PUT; keep `getUrl` for model calls
  - [ ] POST `/v1/events` for telemetry (context.update, session.start/pause/resume/end)
  - [ ] Call Alpha Gate `/v1/responses` with `image_url` and telemetry; enforce Structured JSON schema

- Correlate & Summarize
  - [ ] Correlator merges Observations + Events → Activities (topic/title/score/evidence)
  - [ ] Aggregator rolls Activities → Summary per student per day; persist
  - [ ] End‑of‑session summary generated and displayed

- Review (Dashboard)
  - [ ] Summaries list; open one Summary → Activities list → evidence overlays (frame URL + bbox)
  - [ ] Export JSON for audits

Engineering Tasks (Next Up)

1) Alpha Gate endpoint (blocking external)
   - [ ] Name: `vision-screencast-evaluator`
   - [ ] Structured JSON: paste `packages/contracts/dist/screentime_activity_v1.json` (use inner `definitions.screentime_activity_v1`)
   - [ ] Policies: grade band; PII redaction ON; image retention 24h; quotas
   - [ ] Test with a sample; promote v1.0.0

2) Swift Mac app (apps/mac-native)
   - [ ] Xcode project (bundle id + team); app sandbox & screen recording entitlements
   - [ ] ScreenCaptureKit capture pipeline; cadence + idle pause
   - [ ] Preprocess (JPEG/WebP 70–85%; ≤1024 px long edge; redaction)
   - [ ] Upload via `/api/uploads/sign`; keep `getUrl`
   - [ ] Telemetry (active app/window/url) POST `/v1/events`
   - [ ] Responses call (Alpha Gate): include `image_url` + telemetry; backoff/retry
   - [ ] Menubar UI (start/stop, sampling, redaction controls)
   - [ ] Packaging: codesign + notarize; install guide

3) Edge worker (apps/edge-worker)
   - [ ] `/v1/events`: validate via zod (packages/contracts); store (in‑memory → Supabase)
   - [ ] Correlator: map model outputs + events → Activities (evidence refs)
   - [ ] Aggregator: Activities/day → Summary (idle/duration placeholders)
   - [ ] Optional orchestrator endpoint to call Alpha Gate centrally (if agents delegate)

4) Web app (apps/web)
   - [ ] Auth: integrate Better Auth (sessions/cookies)
     - [x] better-auth package installed
     - [ ] Server config + adapter wiring; replace custom cookie routes/middleware
   - [ ] Device token mint & revoke endpoints; admin UI for devices
   - [ ] Summaries page + Activity detail with evidence frame overlays
   - [ ] Onboarding page: links to Mac app DMG & Chrome Web Store listing

5) Supabase + Kysely
   - [ ] Migrations: orgs, users, students, devices, sessions, activities, summaries, policies
   - [ ] Data access: typed queries (Kysely) & APIs consumed by web
   - [ ] Seeds for demo org and students

Acceptance (MVP)

- [ ] User installs Mac app & extension from the web app
- [ ] Grants permissions; starts a session from dashboard; sees “Recording…”
- [ ] Real frames + telemetry uploaded to S3; model called; JSON validates
- [ ] Summary generated and visible; activities show evidence
- [ ] No raw provider keys in clients; device tokens scoped and short‑lived
 - [ ] Web auth supports signup/login; admin area restricted by role

Handoff Notes (for next agent)

- Versions
  - Node: 24.x; Bun: 1.2.x; Next: 15.x; React: 19.x
  - typedRoutes is top‑level in Next 15; configured in `apps/web/next.config.mjs`

- Env (.env)
  - AWS_REGION, AWS_S3_BUCKET, AWS_S3_PREFIX, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, UPLOAD_SIGN_TTL_SECONDS
  - ALPHAGATE_API_KEY, ALPHAGATE_BASE_URL (`https://api.alphagate.ai/v1`)
  - DATABASE_URL (Supabase Postgres, sslmode=require), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
  - AUTH_SECRET, AUTH_URL, AUTH_COOKIE_* (Better Auth)

- Key paths
  - S3 presign: `apps/edge-worker/src/index.ts` (`POST /api/uploads/sign`)
  - Contracts & schema: `packages/contracts/src/schema.ts` and `packages/contracts/dist/screentime_activity_v1.json`
  - Alpha Gate client: `packages/alphagate-client/src/index.ts` (`responsesCreateJson`)
  - E2E harness: `scripts/e2e-run.ts` (upload + call Alpha Gate + Zod validate)
  - Chrome extension: `apps/extension/*` (MV3; background.js + options)
  - DB bootstrap: `packages/db/*` (kysely + postgres-js; `bun run -w @screentime/db ping`)

- Commands
  - Install: `bun install`
  - Lint/format/typecheck: `bun run format && bun run check && bun run typecheck`
  - Edge dev: `bun run dev:edge` (health: GET /healthz)
  - Web build: `bun run build:web` or `bun --cwd apps/web run build`
  - E2E (after Alpha Gate ready): `bun run e2e <path/to/image>`

- Security
  - Don’t ship provider keys to clients. Agents authenticate using short‑lived scoped tokens minted server‑side.
  - Keep S3 buckets private; use presigned GET for `image_url`.

- Preprocessing (per Integration Guide §5)
  - Downscale ≤1024 px; JPEG/WebP 70–85%; redact PII; pHash for delta‑skip

- Schema (per Integration Guide §6)
  - Use `screentime_activity_v1` from `packages/contracts/dist/screentime_activity_v1.json`


Appendix — Decisions & Architecture Notes

- Mac app language: Swift (ScreenCaptureKit). The previous Bun helper remains a stopgap for local tests only.
- Auth: Better Auth in `apps/web` for dashboard users. Agents (Mac app/Extension) use scoped tokens issued by backend, never raw provider keys.
- Database: Supabase Postgres with Kysely. Use Postgres dialect (pg or postgres-js) from Bun runtime.
