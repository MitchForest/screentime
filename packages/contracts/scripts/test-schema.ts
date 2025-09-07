import { readFileSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { zScreentimePayload } from "../src/schema";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const schemaPath = "packages/contracts/dist/screentime_activity_v1.json";
const raw = readFileSync(schemaPath, "utf8");
const jsonSchema = JSON.parse(raw);

const ajv = new Ajv({ allErrors: true, strictSchema: false });
addFormats(ajv);
const validate = ajv.compile(jsonSchema);

const validPayload = {
  session: {
    session_id: "01HZX1YH3Z0D5V4S8TNQ3WJ9KM",
    student_id: "01HZX1YH3Z0D5V4S8TNQ3WJ9KN",
    started_at: new Date().toISOString(),
    device: "mac",
  },
  context: {
    active_app: "Chrome",
  },
  activities: [
    {
      app: "Khan Academy",
      type: "lesson",
      started_at: new Date().toISOString(),
    },
  ],
  summary: {
    total_duration_ms: 1000,
    idle_ms: 0,
    highlights: ["Did lesson"],
  },
};

// Zod should pass
zScreentimePayload.parse(validPayload);

// Ajv should pass
let ok = validate(validPayload);
assert(ok, `AJV expected pass: ${ajv.errorsText(validate.errors)}`);

// Invalid: missing session_id
const invalidPayload = {
  ...validPayload,
  session: {
    ...validPayload.session,
    // intentionally break schema
    session_id: undefined as unknown as string,
  },
};

let threw = false;
try {
  // Zod should throw
  zScreentimePayload.parse(invalidPayload);
} catch {
  threw = true;
}
assert(threw, "Zod expected to throw for invalid payload");

ok = validate(invalidPayload);
assert(!ok, "AJV expected to fail for invalid payload");

console.log("Schema round-trip tests passed.");
