# Home Helper

An agentic home-improvement project planner. Describe a project, watch a four-phase Claude tool-use loop run live (plan → price real materials at Home Depot → labor cost ranges → synthesize), land on a sourced **Project Blueprint** with materials, tasks, tradeoffs, and tutorial videos.

The product is a wrapper. The interesting stuff is the engineering underneath — see [`WRITEUP.md`](WRITEUP.md) for the pattern walkthrough.

> **Live demo:** [home-helper-706a8.web.app](https://home-helper-706a8.web.app)
> **Status:** fun POC, not a startup. MIT licensed.

---

## Quick reference

```
shared/         TypeScript types + category constants (dual exports)
functions/      Firebase Cloud Functions v2 — thin orchestration + usage gate
agent-worker/   Long-running Claude tool-use loop, deployed to Cloud Run
frontend/       Vue 3 + Vite SPA
scripts/        Helpers (asset generation, curl smoke tests)
```

What's interesting if you're poking around:

| Path | What it does |
|---|---|
| `agent-worker/src/phases/loop.ts` | Generic Anthropic tool-use driver used by all four phases |
| `agent-worker/src/schemas/phase-outputs.ts` | Zod schemas that drive `output_config.format` structured outputs |
| `agent-worker/src/cassette/cassette.ts` | Record/replay harness for every external call |
| `agent-worker/src/pricing/fetcher.ts` | Crawlbase → ScrapingBee → Playwright fallback chain |
| `agent-worker/src/util/url-safety.ts` | SSRF guard for Claude-supplied URLs |
| `functions/src/services/usage.ts` | Cost-cap layer (per-user/global daily caps, stale-run filter) |
| `functions/src/queue/job-queue.ts` | OIDC service-to-service auth Functions → Cloud Run |
| `functions/src/prompts/system.ts` | Hardened clarification prompt (off-topic + injection refusals) |

---

## Want to run it yourself?

You'll need:
- **Node 20** (Cloud Functions requires it; agent-worker is fine on newer)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **gcloud CLI** (for the Cloud Run agent-worker deploy)
- **Anthropic API key**
- **Crawlbase token** — for HD pricing. New accounts get 1,000 free credits up front (one-time, not monthly). Each agent run uses ~20 credits, so the free allocation is enough for ~50 test runs. After that, pay-as-you-go (~$0.04/run at current rates).
- **YouTube Data API key** (free tier 10k/day) — for tutorial videos in reports
- Optional: **ScrapingBee API key** if you want the second-tier fetcher

Two paths from here:

### Path A — read the code, don't run it

Most of the engineering content is readable straight from the repo. Start with [`WRITEUP.md`](WRITEUP.md), then poke at the file paths in the table above. The agent loop, structured outputs migration, and money-guardrail tests are the highest-density bits.

### Path B — clone, configure, deploy your own

See [`docs/SETUP.md`](docs/SETUP.md) for the end-to-end runbook. Step-by-step instructions for creating your own Firebase project, dropping in keys, running local emulators, and deploying to Cloud Run + Firebase Hosting under your own GCP account.

There's also [`docs/CLAUDE-PROMPTS.md`](docs/CLAUDE-PROMPTS.md) — a set of ready-to-use prompts for [Claude Code](https://claude.ai/code) if you'd rather hand the setup off to an agent. Open the repo in your editor with Claude Code installed and paste one of the prompts.

---

## Local development

After setup (see `docs/SETUP.md`), three terminals:

```bash
firebase emulators:start --only firestore,auth,functions   # Firebase emulators
cd agent-worker && PORT=8787 npm run dev                   # agent-worker on :8787
cd frontend && npm run dev                                  # Vite on :5177
```

Open http://localhost:5177 and an anonymous session auto-signs in.

## Tests

```bash
cd agent-worker && npm test    # 49 tests
cd functions && npm test       # 38 tests
```

Highest-value areas (financial logic, SSRF guard, OIDC token minting) all have coverage. See `WRITEUP.md` for the time the tests caught a critical NaN bug in the cost cap.

## License

MIT. Use it, fork it, learn from it.

This is a personal project. No support promised, no roadmap, no PRs gatekept. If you find a bug or build something interesting on top, open an issue or a PR and I'll look.
