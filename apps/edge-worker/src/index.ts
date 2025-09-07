import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Hono } from "hono";
import type { Context } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { ulid } from "ulid";
import { zEvent, zUploadSignRequest, zScreentimePayload } from "@screentime/contracts";
import {
  createDb,
  ensureStudent,
  insertActivities,
  insertSummary,
  upsertSession,
  listRecentSummaries,
  getSummaryAndActivities,
  mintDeviceToken,
  revokeDeviceToken,
  listDeviceTokens,
} from "@screentime/db";
import { AlphaGateClient } from "@screentime/alphagate-client";

const app = new Hono();

const HTTP_ACCEPTED = 202 as const;
const HTTP_BAD_REQUEST = 400 as const;
const HTTP_UNAUTHORIZED = 401 as const;
const HTTP_TOO_MANY = 429 as const;
const HTTP_INTERNAL_ERROR = 500 as const;
const DEFAULT_EXPIRES_SECONDS = 600;

function requestId(): string {
  return ulid();
}

function parseKeys(): Set<string> {
  const { EDGE_API_KEYS } = process.env;
  const keys = new Set<string>();
  if (EDGE_API_KEYS) {
    for (const k of EDGE_API_KEYS.split(",")) {
      const t = k.trim();
      if (t.length > 0) keys.add(t);
    }
  }
  return keys;
}

const apiKeys = parseKeys();

function auth(c: Context): { ok: true; key: string } | { ok: false } {
  // If no keys configured, allow all (dev mode)
  if (apiKeys.size === 0) return { ok: true, key: "" };
  const authz = c.req.header("authorization") || c.req.header("Authorization");
  if (!authz || !authz.startsWith("Bearer ")) return { ok: false };
  const token = authz.slice("Bearer ".length).trim();
  if (!apiKeys.has(token)) return { ok: false };
  return { ok: true, key: token };
}

type WindowCounter = { windowStart: number; count: number };
const KEY_WINDOW: Map<string, WindowCounter> = new Map();
const REQUESTS_PER_MINUTE = Number(process.env.REQUESTS_PER_MINUTE || "120");

function rateLimit(key: string): boolean {
  if (!key) return false; // if no keys configured, do not rate limit by key
  const now = Date.now();
  const minute = 60_000;
  const cur = KEY_WINDOW.get(key);
  if (!cur || now - cur.windowStart >= minute) {
    KEY_WINDOW.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (cur.count >= REQUESTS_PER_MINUTE) return false;
  cur.count += 1;
  return true;
}

function jsonError(c: Context, status: StatusCode, message: string, rid: string) {
  c.header("x-request-id", rid);
  c.status(status);
  return c.json({ error: message, request_id: rid });
}

app.get("/healthz", (c) => c.json({ ok: true }));

app.post("/v1/events", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  if (!rateLimit(a.key)) return jsonError(c, HTTP_TOO_MANY, "Rate limit exceeded", rid);
  let payload: unknown;
  try {
    payload = await c.req.json();
  } catch {
    return jsonError(c, HTTP_BAD_REQUEST, "Invalid JSON", rid);
  }
  try {
    zEvent.parse(payload);
  } catch (err) {
    return jsonError(c, HTTP_BAD_REQUEST, `Invalid event payload: ${(err as Error).message}`, rid);
  }
  c.header("x-request-id", rid);
  c.status(HTTP_ACCEPTED as StatusCode);
  return c.json({ accepted: true, request_id: rid });
});

app.post("/api/uploads/sign", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  if (!rateLimit(a.key)) return jsonError(c, HTTP_TOO_MANY, "Rate limit exceeded", rid);

  const {
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_S3_PREFIX = "frames/",
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    UPLOAD_SIGN_TTL_SECONDS = "600",
  } = process.env;

  if (!(AWS_REGION && AWS_S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY)) {
    return jsonError(
      c,
      HTTP_INTERNAL_ERROR,
      "Missing AWS env. Require AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.",
      rid
    );
  }

  let bodyUnknown: unknown = undefined;
  try {
    bodyUnknown = await c.req.json();
  } catch {
    // allow empty body; defaults apply
  }

  let parsed: { contentType?: string; ext?: string } = {};
  if (bodyUnknown) {
    try {
      parsed = zUploadSignRequest.parse(bodyUnknown);
    } catch (err) {
      return jsonError(c, HTTP_BAD_REQUEST, `Invalid request body: ${(err as Error).message}`, rid);
    }
  }

  const contentType = parsed.contentType ?? "image/jpeg";
  const extFromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = parsed.ext ?? extFromMime[contentType];
  if (!ext) {
    return jsonError(c, HTTP_BAD_REQUEST, `Unsupported contentType: ${contentType}`, rid);
  }

  const key = `${AWS_S3_PREFIX}${ulid()}.${ext}`;
  const expiresIn = Number(UPLOAD_SIGN_TTL_SECONDS) || DEFAULT_EXPIRES_SECONDS;

  const s3 = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  const putCmd = new PutObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const getCmd = new GetObjectCommand({
    Bucket: AWS_S3_BUCKET,
    Key: key,
  });

  const [putUrl, getUrl] = await Promise.all([
    getSignedUrl(s3, putCmd, { expiresIn }),
    getSignedUrl(s3, getCmd, { expiresIn }),
  ]);

  c.header("x-request-id", rid);
  return c.json({
    putUrl,
    getUrl,
    key,
    headers: { "Content-Type": contentType },
    expiresIn,
    request_id: rid,
  });
});

app.post("/v1/persist", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  let payloadUnknown: unknown;
  try {
    payloadUnknown = await c.req.json();
  } catch {
    return jsonError(c, HTTP_BAD_REQUEST, "Invalid JSON", rid);
  }
  let payload: unknown;
  try {
    payload = zScreentimePayload.parse(payloadUnknown);
  } catch (err) {
    return jsonError(c, HTTP_BAD_REQUEST, `Invalid Screentime payload: ${(err as Error).message}`, rid);
  }
  const db = createDb();
  const p = payload as ReturnType<typeof zScreentimePayload.parse>;
  const { session, activities, summary } = p;
  // MVP persistence path
  await ensureStudent(db, session.student_id);
  await upsertSession(db, session);
  await insertActivities(
    db,
    activities.map((a) => ({
      session_id: session.session_id,
      student_id: session.student_id,
      app: a.app,
      type: a.type,
      topic: a.topic,
      lesson_title: a.lesson_title,
      started_at: a.started_at,
      ended_at: a.ended_at,
      duration_ms: a.duration_ms,
      score: a.score,
      correct: a.correct,
      attempts: a.attempts,
      idle_ms: a.idle_ms,
      distractions: a.distractions,
      evidence: a.evidence,
    }))
  );
  const day = new Date(new Date(session.started_at).toISOString().slice(0, 10));
  const summaryId = await insertSummary(db, {
    student_id: session.student_id,
    day,
    total_duration_ms: summary.total_duration_ms,
    idle_ms: summary.idle_ms,
    lessons_completed: summary.lessons_completed ?? undefined,
    highlights: summary.highlights,
    concerns: summary.concerns ?? undefined,
  });
  c.header("x-request-id", rid);
  return c.json({ ok: true, request_id: rid, summary_id: summaryId });
});

// Orchestrated Responses call + persistence
app.post("/v1/responses/proxy", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  const { ALPHAGATE_API_KEY, ALPHAGATE_BASE_URL = "https://api.alphagate.ai/v1" } = process.env;
  if (!ALPHAGATE_API_KEY) return jsonError(c, HTTP_INTERNAL_ERROR, "Missing ALPHAGATE_API_KEY", rid);

  type Body = { image_url: string; telemetry?: Record<string, unknown>; session?: Record<string, unknown> };
  let body: Body;
  try {
    body = (await c.req.json()) as Body;
  } catch {
    return jsonError(c, HTTP_BAD_REQUEST, "Invalid JSON", rid);
  }
  if (!body?.image_url) return jsonError(c, HTTP_BAD_REQUEST, "image_url required", rid);

  const client = new AlphaGateClient({ apiKey: ALPHAGATE_API_KEY, baseURL: ALPHAGATE_BASE_URL });
  const payload = {
    model: "vision-screencast-evaluator",
    input: [
      {
        role: "user" as const,
        content: [
          { type: "input_text", text: "Analyze this frame and return structured JSON only." },
          { type: "input_image", image_url: body.image_url },
          { type: "input_text", text: JSON.stringify({ telemetry: body.telemetry ?? {}, session: body.session ?? {} }) },
        ],
      },
    ],
  };

  let result: unknown;
  try {
    result = await client.responsesCreateJson(payload);
  } catch (err) {
    return jsonError(c, HTTP_INTERNAL_ERROR, `Alpha Gate error: ${(err as Error).message}`, rid);
  }
  const output = (result as { output?: unknown })?.output ?? result;
  let screentime;
  try {
    screentime = zScreentimePayload.parse(output);
  } catch (err) {
    return jsonError(c, HTTP_INTERNAL_ERROR, `Model output validation failed: ${(err as Error).message}`, rid);
  }

  const db = createDb();
  const { session, activities, summary } = screentime;
  await ensureStudent(db, session.student_id);
  await upsertSession(db, session);
  await insertActivities(
    db,
    activities.map((a) => ({
      session_id: session.session_id,
      student_id: session.student_id,
      app: a.app,
      type: a.type,
      topic: a.topic,
      lesson_title: a.lesson_title,
      started_at: a.started_at,
      ended_at: a.ended_at,
      duration_ms: a.duration_ms,
      score: a.score,
      correct: a.correct,
      attempts: a.attempts,
      idle_ms: a.idle_ms,
      distractions: a.distractions,
      evidence: a.evidence,
    }))
  );
  const day = new Date(new Date(session.started_at).toISOString().slice(0, 10));
  const summaryId = await insertSummary(db, {
    student_id: session.student_id,
    day,
    total_duration_ms: summary.total_duration_ms,
    idle_ms: summary.idle_ms,
    lessons_completed: summary.lessons_completed ?? undefined,
    highlights: summary.highlights,
    concerns: summary.concerns ?? undefined,
  });

  c.header("x-request-id", rid);
  return c.json({ ok: true, request_id: rid, summary_id: summaryId });
});

// Admin APIs (protected by Bearer key):
app.get("/api/summaries", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  const db = createDb();
  const limit = Number(new URL(c.req.url).searchParams.get("limit") || "20");
  const rows = await listRecentSummaries(db, Number.isFinite(limit) ? limit : 20);
  c.header("x-request-id", rid);
  return c.json({ rows });
});

app.get("/api/summaries/:id", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  const db = createDb();
  const id = c.req.param("id");
  const data = await getSummaryAndActivities(db, id);
  if (!data) return jsonError(c, 404 as any, "Not found", rid);
  c.header("x-request-id", rid);
  return c.json(data);
});

// Device token management
app.post("/v1/device-tokens/mint", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  const db = createDb();
  const body = (await c.req.json().catch(() => ({}))) as {
    org_id?: string;
    device_id?: string;
    ttl_hours?: number;
    note?: string;
  };
  const token = await mintDeviceToken(db, body);
  c.header("x-request-id", rid);
  return c.json({ token });
});

app.post("/v1/device-tokens/revoke", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  const db = createDb();
  const body = (await c.req.json().catch(() => ({}))) as { token?: string };
  if (!body.token) return jsonError(c, HTTP_BAD_REQUEST, "token required", rid);
  await revokeDeviceToken(db, body.token);
  c.header("x-request-id", rid);
  return c.json({ ok: true });
});

app.get("/api/device-tokens", async (c) => {
  const rid = requestId();
  const a = auth(c);
  if (!a.ok) return jsonError(c, HTTP_UNAUTHORIZED, "Unauthorized", rid);
  const db = createDb();
  const rows = await listDeviceTokens(db, 100);
  c.header("x-request-id", rid);
  return c.json({ rows });
});

export default app;
