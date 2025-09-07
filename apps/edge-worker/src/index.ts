import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Hono } from "hono";
import { ulid } from "ulid";

const app = new Hono();

const HTTP_ACCEPTED = 202;
const HTTP_BAD_REQUEST = 400;
const HTTP_INTERNAL_ERROR = 500;
const DEFAULT_EXPIRES_SECONDS = 600;

app.get("/healthz", (c) => c.json({ ok: true }));

app.post("/v1/events", (c) => {
  // TODO: validate payload (Zod in packages/contracts)
  return c.json({ accepted: true }, HTTP_ACCEPTED);
});

app.post("/api/uploads/sign", async (c) => {
  const {
    AWS_REGION,
    AWS_S3_BUCKET,
    AWS_S3_PREFIX = "frames/",
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    UPLOAD_SIGN_TTL_SECONDS = "600",
  } = process.env;

  if (!(AWS_REGION && AWS_S3_BUCKET && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY)) {
    return c.json(
      {
        error:
          "Missing AWS env. Require AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.",
      },
      HTTP_INTERNAL_ERROR
    );
  }

  type Body = { contentType?: string; ext?: string };
  let body: Body | undefined;
  try {
    body = await c.req.json<Body>();
  } catch {
    // ignore: default contentType will be used
  }

  const contentType = body?.contentType ?? "image/jpeg";
  const extFromMime: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const ext = body?.ext ?? extFromMime[contentType];
  if (!ext) {
    return c.json({ error: `Unsupported contentType: ${contentType}` }, HTTP_BAD_REQUEST);
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

  return c.json({
    putUrl,
    getUrl,
    key,
    headers: { "Content-Type": contentType },
    expiresIn,
  });
});

export default app;
