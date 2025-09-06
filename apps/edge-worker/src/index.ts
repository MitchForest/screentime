import { Hono } from "hono";

const app = new Hono();

app.get("/healthz", (c) => c.json({ ok: true }));

app.post("/v1/events", async (c) => {
  // TODO: validate payload (Zod in packages/contracts)
  return c.json({ accepted: true }, 202);
});

app.post("/api/uploads/sign", async (c) => {
  // TODO: return signed URL (stub for now)
  return c.json({ url: "signed://stub" });
});

export default app;
