/* global Bun */
import app from "./src/index";

const DEFAULT_PORT = 8787;
const port = Number(process.env.PORT || DEFAULT_PORT);
/* biome-ignore lint/suspicious/noConsole: startup log */
console.log(`edge-worker dev server listening on http://localhost:${port}`);

export default { port };

Bun.serve({ port, fetch: app.fetch });
