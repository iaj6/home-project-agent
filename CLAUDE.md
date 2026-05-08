# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Handy** — an agentic home-project research assistant. The user describes a project, answers a short clarification dialog, and a Claude tool-use loop plans → prices real materials at Home Depot/Lowe's → pulls labor ranges → synthesizes a sourced Project Report with confidence scores. Full vision captured in `PRD.md`. v1 MVP scope covers two categories (bathroom-vanity, deck-building) and two verticals of real-data research (materials + labor).

## Build & Development Commands

```bash
# Install all workspace dependencies (from root)
npm install

# Frontend (from frontend/)
npm run dev          # Vite dev server
npm run build        # vue-tsc + vite build → frontend/dist/

# Backend — Cloud Functions (from functions/)
npm run build        # tsc → functions/lib/
npm run serve        # Build + start emulators (functions only)

# Agent worker (from agent-worker/)
npm run dev          # tsx watch — HTTP server on :8787
npm run build        # tsc → agent-worker/lib/
npm run start        # node lib/server.js
npm run test         # vitest run (28 tests: parsers, cost guide, cassette, synthesize, phase loop)
npm run smoke        # End-to-end smoke against Firestore emulator (requires ANTHROPIC_API_KEY)

# Type checking
cd shared && npm run typecheck
cd functions && npx tsc --noEmit
cd agent-worker && npx tsc --noEmit
cd frontend && npx vue-tsc --noEmit
```

## Architecture

**Monorepo** using npm workspaces with four packages:

- `shared/` (`@home-advisor/shared`) — TypeScript types + category constants. Source-exposed, no build output.
- `functions/` — Firebase Cloud Functions (Node 20, CommonJS). Thin orchestration only. Outputs to `lib/`.
- `agent-worker/` (`@home-advisor/agent-worker`) — Long-running agent loop (Cloud Run / Docker). Outputs to `lib/`.
- `frontend/` — Vue 3 + TypeScript + Vite SPA. Outputs to `dist/`.

### Cloud Functions — thin orchestration

Callable functions in `functions/src/functions/`:

| Function | Purpose |
|---|---|
| `startProject` | Validates input, auto-creates a home if user has none, seeds conversation with first Claude clarification question |
| `sendMessage` | Appends user msg, calls Claude for clarification, if response contains `<report_ready>` strips the tag and enqueues an agent run via JobQueue |
| `getProject` | Fetches project + messages + report + currentRun in one call |
| `createHome` | Creates a home doc and sets as primary |
| `requestFollowup` | Enqueues a scoped agent re-run for a follow-up question after a completed report |

All require `request.auth` and verify project ownership.

**JobQueue** (`functions/src/queue/job-queue.ts`) — abstracts publishing agent jobs:
- `local` (default): POSTs to `http://127.0.0.1:8787/agent-run`. Set `AGENT_WORKER_URL` to point elsewhere.
- `pubsub`: publishes to `agent-jobs` topic (requires `@google-cloud/pubsub` install).
- Select with `AGENT_QUEUE=local|pubsub`.

### Agent Worker — four-phase Claude tool-use loop

Entry point: `agent-worker/src/server.ts` (Hono HTTP on :8787). Accepts POST `/agent-run`, dispatches to `runAgent` in `src/runner.ts`.

**Phases** (each in `src/phases/`):
1. **Plan** — no tools, pure reasoning. Produces `PlanDraft` (tasks + generic materials list + open questions).
2. **Price** — tools: `fetch_home_depot_sku`, `fetch_lowes_sku`. Resolves each generic material to a real SKU + price.
3. **Labor** — tools: `fetch_cost_guide`, `fetch_url`. Pulls HomeAdvisor/Fixr ranges + regional multiplier.
4. **Synthesize** — tool: `check_url_live`. Produces final `ProjectReport` with cost summary, tradeoffs, confidence.

The phase loop (`src/phases/loop.ts`) implements a generic Anthropic tool-use loop: call Claude → execute tool calls in parallel → append `tool_result` blocks → re-call until `stop_reason=end_turn`. Budget caps enforced (40 tool calls, 250k input tokens, 15min wall clock).

**Streaming protocol**: agent-worker writes status + steps to Firestore. Frontend subscribes via `onSnapshot` to:
- `projects/{id}` — status transitions (clarifying → planning → pricing → synthesizing → complete).
- `agentRuns/{runId}` — tokens, cost, phase.
- `agentRuns/{runId}/steps` — live activity trace (every `think` / `tool_call` / `tool_result`).
- `projects/{id}/report/main` — report doc appears atomically on completion.

### Pricing — DIY Playwright + stealth

`agent-worker/src/pricing/{home-depot,lowes}.ts` use Playwright + `puppeteer-extra-plugin-stealth`. Parser in `src/pricing/parse.ts` tries three strategies in order: `__NEXT_DATA__` JSON extraction, `application/ld+json` blocks, then a regex fallback for product cards. Everything goes through `src/cassette/cassette.ts` so tests/CI run against recorded HTML without real browser work.

### Cassette harness

`src/cassette/cassette.ts` — `through(bucket, key, realFn)` records real tool responses to JSON files when `CASSETTE_MODE=record`, replays in `replay` mode, pass-through in `off`. Default mode is `replay` in tests, `off` in production. Cassettes live in `agent-worker/tests/cassettes/` (bucketed per tool).

### Firestore Data Model

```
users/{uid}                                — UserProfile (primaryHomeId, projectCount)
homes/{homeId}                             — Home (nickname, zipCode, systems?)
projects/{projectId}                       — Project (homeId, category, status, currentAgentRunId)
projects/{projectId}/messages/             — ConversationMessage stream
projects/{projectId}/report/main           — ProjectReport (materials, labor, costSummary, confidence, tradeoffs)
agentRuns/{runId}                          — AgentRun (status, tokens, tool calls, cost, phase)
agentRuns/{runId}/steps/{stepId}           — AgentStep (think, tool_call, tool_result, phase_transition, final)
```

Security rules: users can only read their own data; all writes go through admin-SDK backends.

### Key conventions

- **Shared type imports**: frontend uses `@home-advisor/shared` workspace package. Functions/agent-worker use relative paths via `rootDirs` in tsconfig.
- **Firestore dates**: backend stores `Date`. Frontend converts via a `toDate()` helper in `stores/project.ts` that handles both `Timestamp` and raw `Date` shapes.
- **Resource URL validation**: `services/synthesize.ts` filters resources to the trusted-domain allowlist (familyhandyman, thisoldhouse, finehomebuilding, bobvila, lowes, homedepot). The `check_url_live` tool liveness-probes before citing.
- **Model IDs**: `claude-sonnet-4-6` for the agent loop + clarification; `claude-haiku-4-5-20251001` available for sub-tasks (not used yet in v1).
- **Categories**: kebab-case (`bathroom-vanity`, `deck-building`). Extend by adding to `shared/src/constants/categories.ts`.

## Deployment

```bash
firebase deploy                     # functions + firestore + hosting
gcloud run deploy agent-worker \
  --source ./agent-worker \
  --region us-central1              # agent worker (Dockerfile provided)
```

Cloud Run needs `ANTHROPIC_API_KEY` in Secret Manager, plus `FIREBASE_PROJECT_ID` / `GCLOUD_PROJECT`. Functions need `ANTHROPIC_API_KEY` in the Cloud Functions environment and `AGENT_WORKER_URL` (or `AGENT_QUEUE=pubsub`) to reach the worker.
