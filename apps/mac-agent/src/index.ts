/* global Bun */
/**
 * Mac Agent (prototype)
 * - Captures a screenshot using macOS `screencapture`
 * - Uploads via our /api/uploads/sign to S3 (presigned PUT)
 * - Prints the image getUrl
 *
 * Usage:
 *   bun run apps/mac-agent/src/index.ts
 */

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const baseUrl = `http://localhost:${process.env.PORT || "8787"}`;
  const dir = mkdtempSync(join(tmpdir(), "screentime-"));
  const file = join(dir, `frame-${Date.now()}.jpg`);

  // Capture fullscreen JPG without UI sounds/prompts
  const proc = Bun.spawn(["screencapture", "-x", "-t", "jpg", file]);
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`screencapture failed (code ${code})`);
  }

  const buf = readFileSync(file);

  const signRes = await fetch(`${baseUrl}/api/uploads/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: "image/jpeg" }),
  });
  if (!signRes.ok) {
    const txt = await signRes.text();
    throw new Error(`sign failed ${signRes.status}: ${txt}`);
  }
  const { putUrl, getUrl, headers } = await signRes.json();

  const putRes = await fetch(putUrl, { method: "PUT", headers, body: buf });
  if (!putRes.ok) {
    const txt = await putRes.text();
    throw new Error(`upload failed ${putRes.status}: ${txt}`);
  }

  /* biome-ignore lint/suspicious/noConsole: CLI output */
  console.log("Uploaded frame to:", getUrl);

  try {
    rmSync(file, { force: true });
  } catch {
    // ignore cleanup errors
  }
}

main().catch((err) => {
  // biome-ignore lint/suspicious/noConsole: CLI output
  console.error(err);
  process.exit(1);
});
