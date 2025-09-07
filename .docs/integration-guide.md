Alpha Gate — Builder Guide for Workflows (Endpoints + Policies)

0) What you build vs what Alpha Gate provides
You build:
A semantic Endpoint (e.g., vision-screencast-evaluator) that accepts images + context and returns structured JSON describing activity.


Client apps (Mac app, Chrome extension, etc.) that:


capture screenshots + local telemetry (active app/window, URL, clicks/idle),


pre-process (downscale/compress/redact),


call Alpha Gate’s OpenAI-compatible /v1/responses with your endpoint as the model name,


optionally push raw telemetry to Events API (for richer analytics).


Alpha Gate provides:
An OpenAI Responses-compatible surface for text/vision (incl. SSE streaming).


Routing to providers (Qwen-VL on RunPod, GPT/Claude/Gemini), BYOK support, failover, quotas, guardrails, logging, and billing.


Console UI (“Endpoint Studio”) to configure routing/policies.


Usage analytics, logs, and retention controls.


OpenAI Responses supports multimodal parts like input_text and input_image with image_url for vision inputs; your payloads here follow that shape. (OpenAI Platform)

1) Workflow Overview (Screentime)
Goal: Summarize student activity across any learning app (with or without partner APIs).
 Inputs: Periodic screenshots + structured telemetry (active app/window/URL, session events).
 Output: Strict JSON describing activities (lessons, duration, progress, scores), plus idle/distraction metrics.

2) Authentication & Tenancy
API Keys (app → Alpha Gate)
Format: ag_live_... (public prefix) + HMAC secret (server-side only).


Where to put: Authorization: Bearer <ALPHAGATE_API_KEY>.


Keys are scoped to an Organization and rate-limited per key + endpoint.


BYOK (per provider)
Optional for your org: store provider keys in Alpha Gate (encrypted).


For Screentime/Qwen-VL on RunPod, you may use Alpha Gate pooled key or your own RunPod token.


BYOK never leaves Alpha Gate’s main app; edge only uses short-lived scoped tokens.



3) Creating Your Endpoint in the Console (“Endpoint Studio”)
Path: Console → Endpoints → New Endpoint
Identity


Name: vision-screencast-evaluator


Visibility: Private (default) or Public (to share in the Catalog)


Version: 1.0.0


Routing


Primary model: qwen-vl-<variant> (RunPod/vLLM)


Failover chain (optional): e.g., another VL fallback


Region pin (e.g., us-east-1)


BYOK binding (optional): RunPod token reference


Policies


Grade band: K-5 / 6-8 / 9-12


PII redaction: On


Retention: images 24h (only keep derived JSON long-term)


Moderation thresholds


Quotas


Cap per org/key/day (e.g., 20k images/day), per endpoint


Structured Output


Choose “Structured JSON” and paste your JSON Schema (see §6)


Prompt Template


Supply system prompt with examples; set user prompt placeholders for telemetry merges


Test Harness


Drag in a sample screenshot


Provide telemetry JSON (URL, app, idle status)


Verify the streamed result and the final structured JSON validates


Save & Promote


Save as draft → test → Promote to v1.0.0


Optionally enable canary (% of traffic) for new versions



4) Calling Alpha Gate (OpenAI Responses-compatible)
Use any OpenAI SDK, swap the baseURL, and set model to your Endpoint name.
4.1 Simple (non-streaming) example (TypeScript)
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ALPHAGATE_API_KEY!,
  baseURL: "https://api.alphagate.ai/v1"
});

// Signed URL from your app upload step (see §5)
const screenshotUrl = "https://files.alphagate.ai/tmp/abc123.jpg";

const res = await client.responses.create({
  model: "vision-screencast-evaluator",
  input: [
    {
      role: "user",
      content: [
        { type: "input_text", text: "Analyze the attached screenshot with telemetry and return structured JSON." },
        { type: "input_image", image_url: screenshotUrl },
        { type: "input_text", text: JSON.stringify({
            telemetry: {
              active_app: "Chrome",
              url: "https://www.khanacademy.org/math/cc-fifth-grade-math",
              idle_ms: 0,
              clicks_last_15s: 4,
              keystrokes_last_15s: 12
            }
          })
        }
      ]
    }
  ],
  response_format: {
    type: "json_schema",
    json_schema: {
      name: "screentime_activity_v1",
      schema: SCHEMA_FROM_SECTION_6
    }
  }
});
console.log(res.output);

The Responses API accepts multimodal input parts (input_text, input_image with image_url) and supports structured JSON output via schemas. (OpenAI Platform)
4.2 Streaming SSE example (Node/Bun)
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.ALPHAGATE_API_KEY!,
  baseURL: "https://api.alphagate.ai/v1"
});

const stream = await client.responses.stream({
  model: "vision-screencast-evaluator",
  input: [
    { role: "user", content: [
      { type: "input_text", text: "Analyze and return structured JSON only." },
      { type: "input_image", image_url: "https://files.alphagate.ai/tmp/abc123.jpg" }
    ]}
  ],
  response_format: {
    type: "json_schema",
    json_schema: { name: "screentime_activity_v1", schema: SCHEMA_FROM_SECTION_6 }
  }
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
  }
  if (event.type === "response.completed") {
    // Final object also available via event.response
  }
}

Alpha Gate proxies SSE and sends keep-alive comments to keep edge connections healthy. The OpenAI Responses streaming model emits typed events (e.g., response.output_text.delta, response.completed). (OpenAI Platform)

5) Images & Uploads
Client-side pre-processing (recommended)
Downscale: longer edge ≤ 1024 px (often enough for VL UI comprehension)


Compress: JPEG/WebP ~70–85% quality; target <300–500 KB per frame


Redact: blur faces/PII/text blocks if required by org policy


Delta cache: if frame ≈ previous frame (perceptual hash distance below threshold), skip upload


Upload flow
Request signed upload URL from your own backend or from Alpha Gate (if enabled for your org).


PUT the file; receive image_url to use in input_image.


Alpha Gate also accepts base64 images in some cases; prefer URL for larger payloads.



6) Structured Output — JSON Schema (copy/paste)
Place this in your Endpoint’s response_format → json_schema and also share with the client so you can validate locally.
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "screentime_activity_v1",
  "type": "object",
  "required": ["session", "activities", "summary"],
  "properties": {
    "session": {
      "type": "object",
      "required": ["session_id", "student_id", "started_at"],
      "properties": {
        "session_id": { "type": "string" },
        "student_id": { "type": "string" },
        "started_at": { "type": "string", "format": "date-time" },
        "ended_at": { "type": "string", "format": "date-time" },
        "device": { "type": "string", "enum": ["mac", "windows", "chromebook", "unknown"] }
      }
    },
    "context": {
      "type": "object",
      "properties": {
        "active_app": { "type": "string" },
        "url": { "type": "string" },
        "window_title": { "type": "string" },
        "idle_ms_last_interval": { "type": "integer", "minimum": 0 },
        "clicks_last_interval": { "type": "integer", "minimum": 0 },
        "keystrokes_last_interval": { "type": "integer", "minimum": 0 }
      }
    },
    "activities": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["app", "type", "started_at", "status"],
        "properties": {
          "app": { "type": "string", "description": "Detected app/site, e.g. 'Khan Academy'" },
          "type": { "type": "string", "enum": ["lesson", "exercise", "video", "quiz", "search", "other"] },
          "topic": { "type": "string" },
          "lesson_title": { "type": "string" },
          "started_at": { "type": "string", "format": "date-time" },
          "ended_at": { "type": "string", "format": "date-time" },
          "duration_ms": { "type": "integer", "minimum": 0 },
          "score": { "type": "number", "minimum": 0, "maximum": 100 },
          "correct": { "type": "boolean" },
          "attempts": { "type": "integer", "minimum": 0 },
          "idle_ms": { "type": "integer", "minimum": 0 },
          "distractions": {
            "type": "array",
            "items": { "type": "string", "description": "e.g. app switches, unrelated sites" }
          },
          "evidence": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "image_url": { "type": "string" },
                "bbox": { "type": "array", "items": { "type": "number" }, "minItems": 4, "maxItems": 4 }
              }
            }
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "required": ["total_duration_ms", "idle_ms", "highlights"],
      "properties": {
        "total_duration_ms": { "type": "integer", "minimum": 0 },
        "idle_ms": { "type": "integer", "minimum": 0 },
        "lessons_completed": { "type": "integer", "minimum": 0 },
        "highlights": { "type": "array", "items": { "type": "string" } },
        "concerns": { "type": "array", "items": { "type": "string" } }
      }
    }
  }
}

This schema enforces auditable outputs and supports evidence linking (cropped regions).
 Use response_format.type = "json_schema" to force schema-valid JSON. (OpenAI Platform)

7) Events API (optional, for richer analytics)
Use this to push non-image telemetry (session lifecycle; app/window switches; input cadence). It complements the model outputs and helps detect idle time and distractions.
7.1 Authentication
Same API key as /v1/responses.


Endpoint path: POST https://api.alphagate.ai/v1/events


7.2 Event payloads
// session.start
{
  "type": "session.start",
  "session_id": "ulid-123",
  "student_id": "student-42",
  "started_at": "2025-09-06T14:32:00Z",
  "device": "mac",
  "meta": { "app_version": "1.0.0" }
}

// session.pause / session.resume
{ "type": "session.pause", "session_id": "ulid-123", "at": "2025-09-06T15:03:00Z" }
{ "type": "session.resume", "session_id": "ulid-123", "at": "2025-09-06T15:08:00Z" }

// session.end
{
  "type": "session.end",
  "session_id": "ulid-123",
  "ended_at": "2025-09-06T16:05:00Z",
  "duration_ms": 5580000
}

// app/window/url changes
{
  "type": "context.update",
  "session_id": "ulid-123",
  "at": "2025-09-06T14:45:00Z",
  "active_app": "Chrome",
  "url": "https://www.khanacademy.org/...",
  "window_title": "Subtracting Fractions"
}

// activity snapshot (optional)
{
  "type": "activity.snapshot",
  "session_id": "ulid-123",
  "at": "2025-09-06T14:50:00Z",
  "clicks_last_15s": 5,
  "keystrokes_last_15s": 14,
  "idle_ms_last_15s": 0
}

Response: 202 Accepted (events are queued).


Alpha Gate correlates Events with model outputs (by session_id + timestamps) to improve summaries and audits.



8) Rate limits, quotas, and cadence (practical guidance)
Screenshot cadence: start at one every 15–30s while active; pause when no UI change (perceptual hash near-match).


Max image size: aim <500KB (post-downscale/compress).


Quota planning: e.g., 20k images/day per org to start; request increases as needed.


SSE timeouts: Alpha Gate sends keep-alive comments every ~10–20s; client should tolerate intermittent stalls and reconnect on network errors.


Backoff: exponential on 429/5xx, with jitter.



9) Guardrails & Privacy
Grade band policies moderate outputs and flag unsafe content.


PII redaction is enabled by default for Screentime; perform on-device blur when possible.


Retention: set images to expire (e.g., 24h). Keep only structured JSON + lightweight evidence pointers for audits.


Opt-in consent: your installer flow must obtain consent and expose controls (sampling rate, redaction level).



10) Example: End-to-End Screentime call (curl)
curl https://api.alphagate.ai/v1/responses \
  -H "Authorization: Bearer $ALPHAGATE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "vision-screencast-evaluator",
    "input": [{
      "role": "user",
      "content": [
        { "type": "input_text", "text": "Analyze this frame and return JSON per schema." },
        { "type": "input_image", "image_url": "https://files.alphagate.ai/tmp/abc123.jpg" },
        { "type": "input_text", "text": "{\"telemetry\":{\"active_app\":\"Chrome\",\"url\":\"https://khanacademy.org\"}}"}
      ]
    }],
    "response_format": {
      "type": "json_schema",
      "json_schema": { "name": "screentime_activity_v1", "schema": SCHEMA_FROM_SECTION_6 }
    }
  }'


11) Admin & Console APIs (selected)
These are Alpha Gate admin APIs (not public OpenAI surface). Use our generated typed client from OpenAPI in the dashboard or your backend.
POST /admin/endpoints — create endpoint (identity, routing, policies, quotas, schema)


PUT /admin/endpoints/:id — update (creates a new version)


POST /admin/endpoints/:id/promote — promote draft → active


GET /admin/endpoints/:id — detail (resolves active config)


POST /admin/api-keys — create key; scope to endpoints; rotate


GET /admin/usage?org_id=...&from=...&to=... — usage summary from ClickHouse/Postgres


GET /admin/logs?endpoint_id=... — redacted logs (searchable)


POST /admin/byok — store provider secret (encrypted)



12) Error handling (common)
Code
Meaning
Action
400
Invalid payload / schema validation failed
Fix request; ensure JSON Schema matches
401
Invalid API key
Rotate or use correct org key
403
Endpoint not accessible by key
Check endpoint visibility/scopes
404
Endpoint/model not found
Verify endpoint name/version
409
Endpoint version conflict
Re-fetch and retry update
413
Payload too large
Downscale/compress images
422
Output failed schema validation
Adjust prompt or retry; inspect violations
429
Quota exceeded / rate limited
Backoff w/ jitter; consider quota raise
5xx
Provider/gateway error
Retry with backoff; failover will auto-kick if configured


13) Security notes (Screentime focus)
Don’t ship raw provider keys in clients.


Do use org-scoped Alpha Gate keys, and if you must call a partner API directly, mint short-lived tokens from your backend.


Do store only derived JSON + evidence pointers long-term.


Do honor retention settings and allow per-student opt-out.



14) What you’ll put in your Endpoint prompt (guidance)
Explain exact JSON required (no prose) and include the schema summary.


Provide few-shot examples from common UIs (Khan Academy, etc.).


Tell the model to infer activity boundaries (start/stop, topic, lesson title) from UI elements.


Instruct to estimate durations using session timestamps and to tag idle segments using telemetry deltas.


Require evidence (bbox + frame URL) for claims about score/progress.



15) Coming features you can adopt later
Catalog: publish your endpoint publicly for other orgs; add pricing or mark free.


Stripe metered billing: automatic invoicing.


Failover policies: per-endpoint auto switch (e.g., from Qwen-VL to a different VL) on error/latency.


Partner API connectors: correlate first-party APIs with vision inferences for higher accuracy.


Marketplace “Product” tile: ship Screentime as a first-party app powered by your endpoint.



16) Quick checklist to go live (Screentime)
Create Endpoint vision-screencast-evaluator (Qwen-VL primary).


Paste JSON Schema (Section 6) into response_format.


Set Policies: grade band, PII redaction ON, image retention 24h.


Set Quotas (images/day).


Build pre-processing (downscale/compress/redact + delta cache).


Implement upload to signed URL; use returned image_url in input_image.


Integrate /v1/responses call + optional /v1/events.


Verify structured JSON validates; wire dashboards to summaries.


Turn on usage charts and alerts.


Release to pilot orgs; iterate prompts and policies.



References (OpenAI Responses)
OpenAI Migrate to Responses and Responses API (multimodal input_text / input_image with image_url; streaming events). (OpenAI Platform)




