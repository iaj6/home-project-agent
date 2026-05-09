# Home Helper

An agentic home-improvement project planner. The agent inside it — named **Handy** — describes your project, asks a few clarifying questions, then runs a four-phase Claude tool-use loop live, pulling real Home Depot prices and regional labor cost ranges. You land on a sourced project blueprint with materials, tasks, tradeoffs, and tutorial videos.

(Repo is named `home-project-agent` for now since the product name was decided after the repo was created.)

**Live demo:** [home-helper-706a8.web.app](https://home-helper-706a8.web.app)

The product side is a fun POC, not a startup. The interesting parts are the engineering choices — see below.

## What it actually does

Given a category (deck-building or bathroom-vanity), a ZIP, and a one-sentence description, the agent:

1. **Plans** — breaks the project into tasks, materials list, and an open-questions list. Pure reasoning, no tools.
2. **Prices** — for each generic material, runs a Home Depot search via Crawlbase, parses real SKUs + prices + product URLs.
3. **Labor** — pulls cost-guide ranges from HomeAdvisor and Fixr; layers a state-level regional multiplier from ZIP.
4. **Synthesizes** — emits a structured `ProjectReport` with cost summary, tradeoffs, confidence scoring, and code-aware warnings. A post-hoc YouTube enrichment step appends 4 tutorial videos.

Every step streams to Firestore in real time; the Vue frontend subscribes via `onSnapshot` so the user watches the agent think rather than staring at a spinner.

## Engineering highlights

- **Anthropic structured outputs** — every phase emits JSON via `output_config.format` + a Zod schema. No "ask Claude for JSON, hope it parses" prompt-and-pray. See `agent-worker/src/schemas/phase-outputs.ts` and `src/util/claude.ts`.
- **Cassette record/replay** — `agent-worker/src/cassette/cassette.ts` lets every external tool call (Crawlbase, HomeAdvisor, YouTube, Anthropic) be recorded once and replayed in tests. CI never hits real services.
- **Three-layer scraper fallback** — Crawlbase → ScrapingBee → bare Playwright+stealth. See `agent-worker/src/pricing/fetcher.ts`. Crawlbase plain token cleanly bypasses Akamai on Home Depot; Lowe's was blocked by every tier and is dropped.
- **ZIP enrichment** — state, frost-depth, climate band, coastal flag fed into plan + synthesize prompts so Claude doesn't hallucinate climate facts. See `agent-worker/src/zip/enrichment.ts`.
- **Cost-cap usage gate** — per-user concurrent limit, per-user daily limit, global daily limit. Enforced in Firestore via a transaction before every agent enqueue. See `functions/src/services/usage.ts`.
- **Anonymous auth** — zero-friction landing; UID persists in localStorage.

## Stack

- `shared/` — TypeScript types, category constants, Zod-friendly. Dual exports (TS source for Vite, compiled CJS for Node).
- `functions/` — Firebase Cloud Functions v2. Thin orchestration: clarification dialog, project CRUD, agent-run enqueue.
- `agent-worker/` — Long-running agent (Hono + tsx in dev, Node 20 in prod). Deployed to Cloud Run.
- `frontend/` — Vue 3 + Vite. Pinia stores, vue-router, Firebase JS SDK, scoped CSS.

## Run locally

```bash
npm install                                # workspace install

# in three terminals
firebase emulators:start --only firestore,auth,functions --project home-helper-706a8
cd agent-worker && npm run dev             # tsx watch on :8787
cd frontend && npm run dev                 # Vite on :5177
```

Required env: `functions/.env.local` with `ANTHROPIC_API_KEY`, `CRAWLBASE_TOKEN`, `CRAWLBASE_JS_TOKEN`, `YOUTUBE_API_KEY`. Both functions and agent-worker pick these up.

For tests:

```bash
cd agent-worker && npm test                # 28 tests, all cassette-backed
```

## Deploy

```bash
# agent-worker → Cloud Run (uses repo-root Dockerfile)
gcloud run deploy agent-worker --source . --region us-central1 --no-cpu-throttling \
  --update-secrets ANTHROPIC_API_KEY=ANTHROPIC_API_KEY:latest,CRAWLBASE_TOKEN=CRAWLBASE_TOKEN:latest,CRAWLBASE_JS_TOKEN=CRAWLBASE_JS_TOKEN:latest,YOUTUBE_API_KEY=YOUTUBE_API_KEY:latest

# functions + firestore + hosting
firebase deploy --project home-helper-706a8
```

`functions/.env.home-helper-706a8` (gitignored) sets `AGENT_WORKER_URL` to the Cloud Run URL.

## Status

- ✅ End-to-end working in production at the URL above
- ✅ Two categories: `deck-building`, `bathroom-vanity`
- ⏳ Coming: UI polish pass with custom assets, project rename
- ❌ Not planned: contractor discovery, payments, multi-user collaboration

## Writeup

Notes on the build are coming.
