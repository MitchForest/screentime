import app from "./src/index";

async function main() {
  const res = await app.fetch(new Request("http://localhost/healthz"));
  const ok = res.ok;
  const json = await res.json().catch(() => ({}));
  if (ok && json?.ok === true) {
    /* biome-ignore lint/suspicious/noConsole: test output */
    console.log("healthz: ok");
    process.exit(0);
  }
  /* biome-ignore lint/suspicious/noConsole: test output */
  console.error("healthz: fail", { status: res.status, json });
  process.exit(1);
}

main();
