import app from "./src/index";

const port = Number(process.env.PORT || 8787);
console.log(`edge-worker dev server listening on http://localhost:${port}`);

export default {
  port,
};

Bun.serve({
  port,
  fetch: app.fetch,
});
