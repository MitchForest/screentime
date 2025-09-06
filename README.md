# Screentime

Monorepo scaffold using Bun + Hono with Biome for lint/format.

Quickstart

- bun install
- bun run dev:edge

Endpoints (dev)

- GET http://localhost:8787/healthz → { ok: true }

Packages

- @screentime/contracts — domain contracts (Zod/JSON Schema) [stub]
- @screentime/shared — shared utils [stub]
- @screentime/alphagate-client — Alpha Gate API wrapper [stub]

Apps

- edge-worker — Hono app for events/upload signing (runs under Bun for dev)
- workers/{correlator,aggregator,retention} — job runners [stubs]

Notes

- Bun-only toolchain. Biome for lint/format. Cloudflare Wrangler is optional for later if we target Cloudflare Workers.

