# Screentime

Operational MVP for capturing student activity (Mac + Chrome), sending frames + telemetry to a vision endpoint (Qwen‑VL via Alpha Gate), and rendering structured summaries in a web dashboard. Built for privacy, auditability, and real‑world deployments.

**Tech Stack**

- **Runtime:** Bun 1.2+, Node 24.x for tooling
- **Web:** Next 15, React 19, shadcn/ui, Tailwind
- **Edge API:** Hono (Bun), AWS SDK v3 (S3 presign)
- **Contracts:** Zod + JSON Schema
- **DB:** Supabase Postgres + Kysely (postgres‑js dialect)
- **Auth:** Better Auth (web dashboard sessions)
- **Lint/Format:** Biome + Ultracite

**Architecture**

- **Clients:**
  - Swift macOS menubar app (ScreenCaptureKit) for screenshots + app/window telemetry
  - Chrome Extension (MV3) for page context + optional tab captures
- **Edge Worker:**
  - `POST /api/uploads/sign` → presigned S3 PUT/GET URLs
  - `POST /v1/events` → session + context events (idle/app/url, start/end)
- **Inference:**
  - Alpha Gate `/v1/responses` (OpenAI Responses‑compatible) → Qwen‑VL returns structured JSON
- **Pipeline:**
  - Correlator merges Observations + Events → Activities
  - Aggregator rolls Activities/day → Summary
- **Storage:** Supabase Postgres (OLTP), S3 (short‑lived images)

**User Stories (MVP)**

- Install from the web: download Mac app (DMG) + install Chrome extension
- Start session in the dashboard → device receives token → begins capture cadence
- Frames uploaded to S3 (presigned) and passed to Alpha Gate with telemetry
- Structured JSON validates against schema; correlator/aggregator produce a Summary
- Dashboard lists Summaries; drill into Activities with evidence (frame URL + bbox)

**Repository Layout**

- **apps/web:** Next app (dashboard)
- **apps/edge-worker:** Hono API (`/api/uploads/sign`, `/v1/events`)
- **apps/extension:** Chrome MV3 extension (background + options)
- **apps/mac-agent:** Bun script prototype (kept only as a local helper)
- **packages/contracts:** Zod models + JSON Schema emission
- **packages/alphagate-client:** thin Responses client (JSON helper)
- **packages/db:** Kysely + postgres‑js client (Supabase)
- **scripts/e2e-run.ts:** upload + call Alpha Gate + validate flow

**Setup**

- **Install:** `bun install`
- **Env:** copy `.env.example` → `.env` and fill values (see below)
- **Lint/Typecheck:** `bun run format && bun run check && bun run typecheck`
- **Edge dev:** `bun run dev:edge` → GET `http://localhost:8787/healthz`
- **Web build:** `bun run build:web` (or `bun --cwd apps/web run build`)

**Environment**

- **Alpha Gate:** `ALPHAGATE_API_KEY`, `ALPHAGATE_BASE_URL=https://api.alphagate.ai/v1`
- **AWS/S3:** `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_S3_PREFIX`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `UPLOAD_SIGN_TTL_SECONDS`
- **Supabase:** `DATABASE_URL` (sslmode=require), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Better Auth (web):** `AUTH_SECRET`, `AUTH_URL`, cookie settings

**Alpha Gate Endpoint (Required for E2E)**

- Create endpoint `vision-screencast-evaluator`
- Structured JSON: paste schema from `packages/contracts/dist/screentime_activity_v1.json` (inner `definitions.screentime_activity_v1`)
- Policies: grade band, PII redaction ON, image retention 24h; set quotas
- Test + promote v1.0.0

**E2E Harness**

- Script: `bun run e2e <path/to/image>`
- Flow: `/api/uploads/sign` → PUT to S3 → `/v1/responses` (Alpha Gate) → Zod validate → print JSON
- File: `scripts/e2e-run.ts`

**Data Contracts**

- Zod models in `packages/contracts/src/schema.ts`; JSON Schema emitted to `packages/contracts/dist/screentime_activity_v1.json`
- Round‑trip tests (Zod ⇄ Ajv) in `packages/contracts/scripts/test-schema.ts`

**Security & Privacy**

- No provider keys in clients; agents use short‑lived scoped tokens
- Keep S3 buckets private; presigned GET for `image_url`
- Redaction on‑device where possible; server‑side enforcement otherwise

**MVP Roadmap (What’s Next)**

- **Swift macOS app:** ScreenCaptureKit capture + cadence/idle; preprocess (≤1024 px, JPEG/WebP 70–85%); upload; telemetry; Responses; menubar; codesign/notarize
- **Chrome extension:** add telemetry (URL/title) events; optional orchestrated Responses
- **Pipeline:** implement correlator + aggregator; persist (in‑memory → Supabase)
- **Web:** Better Auth; device token mint/revoke; Summaries list + Activity drilldown with evidence overlays
- **Supabase:** migrations for orgs/users/students/devices/sessions/activities/summaries/policies; seeds

**References**

- `.docs/plan.md` — domain model, verbs, architecture, governance
- `.docs/integration-guide.md` — Alpha Gate setup, schema, uploads, examples

