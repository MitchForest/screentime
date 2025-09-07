import { zodToJsonSchema } from "zod-to-json-schema";
import { zScreentimePayload } from "../src/schema";

// biome-ignore lint/suspicious/noExplicitAny: Casting to bridge zod typing across tooling versions
const schema = zodToJsonSchema(zScreentimePayload as any, {
  name: "screentime_activity_v1",
});

const outPath = "packages/contracts/dist/screentime_activity_v1.json";
await Bun.write(outPath, JSON.stringify(schema, null, 2));
