import { zodToJsonSchema } from "zod-to-json-schema";
import { zScreentimePayload } from "../src/schema";

const schema = zodToJsonSchema(zScreentimePayload, {
  name: "screentime_activity_v1",
});

const outPath = "packages/contracts/dist/screentime_activity_v1.json";
await Bun.write(outPath, JSON.stringify(schema, null, 2));
