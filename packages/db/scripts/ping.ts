import { dbNow } from "../src/client";

async function main() {
  const now = await dbNow();
  console.log("DB now:", now.toISOString());
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
