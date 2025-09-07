/**
 * E2E harness: upload a sample image to S3, call Alpha Gate Responses
 * with the presigned GET URL, validate shape, and print the result.
 *
 * Usage:
 *   bun run scripts/e2e-run.ts /absolute/or/relative/path/to/image.jpg
 * Requires .env with AWS_* and ALPHAGATE_* vars set and edge-worker running.
 */

import { readFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { AlphaGateClient } from "../packages/alphagate-client/src/index";
import { zScreentimePayload } from "../packages/contracts/src/schema";

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error("Usage: bun run scripts/e2e-run.ts <image-path>");
    process.exit(1);
  }
  const abs = resolve(imagePath);
  const buf = readFileSync(abs);

  const contentType = inferContentType(abs);
  const signRes = await fetch(`http://localhost:${process.env.PORT || "8787"}/api/uploads/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType }),
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

  const schemaJson = await (
    await fetch(`file://${resolve("packages/contracts/dist/screentime_activity_v1.json")}`)
  )
    .json()
    .catch(() => {
      // Bun file:// may not work with fetch in all envs, fallback to fs
      const raw = readFileSync(
        resolve("packages/contracts/dist/screentime_activity_v1.json"),
        "utf8"
      );
      return JSON.parse(raw);
    });
  const schema = schemaJson?.definitions?.screentime_activity_v1 ?? schemaJson;

  const client = new AlphaGateClient({
    apiKey: process.env.ALPHAGATE_API_KEY || "",
    baseURL: process.env.ALPHAGATE_BASE_URL || "https://api.alphagate.ai/v1",
  });

  const payload = {
    model: "vision-screencast-evaluator",
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Analyze this frame (${basename(abs)}) with telemetry and return structured JSON.`,
          },
          { type: "input_image", image_url: getUrl },
          {
            type: "input_text",
            text: JSON.stringify({
              telemetry: { active_app: "Chrome", url: "https://example.org", idle_ms: 0 },
            }),
          },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: { name: "screentime_activity_v1", schema },
    },
  };

  const result = await client.responsesCreateJson<unknown>(payload);
  // Alpha Gate Responses API returns an object; we expect the final content under result.output (per responses API spec).
  const output = (result as { output?: unknown })?.output ?? result;
  try {
    zScreentimePayload.parse(output);
  } catch (err) {
    console.error("Schema validation failed:", err);
    console.dir(output, { depth: 6 });
    process.exit(1);
  }

  console.log("E2E OK — validated Screentime payload:", JSON.stringify(output, null, 2));
}

function inferContentType(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  return "image/jpeg";
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
