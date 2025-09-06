import { Hono } from "hono";

const app = new Hono();

const HTTP_ACCEPTED = 202;

app.get("/healthz", (c) => c.json({ ok: true }));

app.post("/v1/events", (c) => {
  // TODO: validate payload (Zod in packages/contracts)
  return c.json({ accepted: true }, HTTP_ACCEPTED);
});

app.post("/api/uploads/sign", (c) => {
  // TODO: return signed URL (stub for now)
  return c.json({ url: "signed://stub" });
});

export default app;
