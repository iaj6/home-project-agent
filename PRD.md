# PRD — Home Agent (working title: *Handy*)

> Status: design doc. Intended to be dense enough that a fresh Claude (or a human) can implement most of it in one pass. This is a personal / fun project — bias toward "try something cool" over "ship safe" where it's a tossup.

---

## 1. Elevator Pitch

Home ownership is drowning in low-stakes, high-cognitive-load bullshit: deciding if you should DIY the deck or hire out, figuring out what a vanity swap actually costs in *your* ZIP, remembering to flush your water heater, keeping track of which contractor quoted what for which room. **Handy is an agentic assistant for homeowners that actually does the research.** You describe a project or a recurring concern; the agent plans, browses, prices, sanity-checks across sources, and hands you a shoppable materials cart, a location-aware labor estimate, and a tradeoff view on the quality / time / money axis. Eventually it holds your whole home — systems, maintenance schedule, warranty vault, contractor roster — and nudges you at the right time.

This PRD covers the full vision, but is scoped to a concrete MVP slice you could realistically one-shot.

---

## 2. Problem & Vision

### The mess today
- Homeowner Googles "how much to replace bathroom vanity" → generic national averages, 4 blog ads, no SKUs.
- Goes to Home Depot → 40 vanities, no guidance on which fits the project scope described three tabs ago.
- Tries to price a deck → can't figure out how many joist hangers or the right lumber grade.
- Gets a $6,200 contractor quote → no idea if that's fair in their area.
- Bought a water heater in 2022 → has no idea when to flush it, when the warranty lapses, or who installed it.

### What we want
One place that:
1. Understands the project the way a knowledgeable friend would — after a short conversation, not a 40-field form.
2. Does the actual research — real SKUs, real local prices, real labor estimates, real sourcing.
3. Shows its work — every number has a justification, every link resolves.
4. Helps the human decide — DIY vs pro, cheap vs durable, fast vs phased.
5. Remembers the house — systems, maintenance cadence, past projects, receipts, warranties.
6. Nudges — "your HVAC filter is due," "your water heater warranty expires next month," "here are three well-rated handymen nearby for that stuck garbage disposal."

### Why now
- Agentic tool use with Claude is finally good enough that multi-step research actually works.
- Homeowners already tolerate 20-tab browsing sessions; replacing that with "describe it, wait 90 seconds, get a sourced report" is a step-change.
- Affiliate + lead-gen economics are built-in revenue if it ever matters.

---

## 3. Non-Goals (for MVP)

To keep scope tight for the one-shot attempt:

- **Not building**: permit/code compliance automation (varies too much per municipality — we surface guidance, not file forms).
- **Not building**: contractor marketplace / quote submission. We point users *at* Angi/Thumbtack/etc, we don't intermediate.
- **Not building**: smart-home integration (no Nest/Ring/etc ingestion in v1).
- **Not building**: multi-user households (one user = one home for v1).
- **Not building**: mobile app (responsive web only).
- **Not building**: any payment processing. Affiliate links only; never a card form.
- **Not building**: auto-ordering materials. Agent builds a cart, user clicks through to HD/Lowe's to purchase.

---

## 4. MVP Scope (the one-shot target)

Strict definition of "v1 done":

A signed-in user can:
1. Create a **project** in one of two verticals — **deck build** or **bathroom vanity replacement**.
2. Answer a short clarification dialog with the agent.
3. Watch the agent run (streaming status updates) as it:
   - Builds a materials list grounded in the project spec.
   - Fetches real current prices for each material at the user's ZIP (Home Depot primary, Lowe's fallback).
   - Pulls labor cost ranges from at least one national cost guide (HomeAdvisor or Fixr), regionally adjusted by ZIP.
   - Sanity-checks totals across at least two sources; flags low-confidence numbers.
4. Receive a **Project Report** with:
   - Shoppable materials cart (real product titles, prices, links, quantities).
   - Labor estimate (range, with source citation).
   - DIY vs pro total with a confidence badge per number.
   - Ordered task list with time estimates.
   - Curated resource links (validated, allowlist-gated — already built).
   - Plain-language reasoning about quality / time / money tradeoffs.
5. Optionally **re-ask** the agent follow-ups ("what if I upgrade to quartz?") that re-run only the affected portions.

Everything past this slice is Phase 2+ (see §13).

---

## 5. Target User & Use Cases

### Personas
- **First-time homeowner (Priya, 32)** — owns for 2 years, never swung a hammer, anxious about being ripped off. Needs: translate contractor-speak, validate quotes, find DIY wins that won't burn the house down.
- **Handy hobbyist (Mark, 48)** — will DIY anything mid-complexity, wants a materials list and real prices, not hand-holding. Needs: tight shopping list, accurate quantities, good YouTube references.
- **Time-poor professional (Dana, 40)** — will always hire out, wants to know "is this quote fair and who else should I call." Needs: price calibration, vetted contractor shortlist, questions to ask.

### Top 5 v1 flows
1. **Price a project** — the MVP loop above.
2. **Calibrate a quote** — "A contractor quoted me $5,400 for this vanity. Thoughts?" → agent re-runs the pricing pipeline and returns a range with commentary.
3. **Compare options** — "Compare a $400 vanity vs an $1,100 one over 10 years." → quality/durability/resale reasoning.
4. **DIY feasibility check** — scored on skill level, tool access, time budget. Returns "do it," "hire it," or "hybrid" with reasoning.
5. **Next-step prompt** — after a report, agent offers: "Want me to find 3 well-rated installers nearby?" (Google Places + rating filter).

---

## 6. System Architecture (locked decisions)

```
┌───────────────────────────────┐
│        Browser (Vue 3)        │
│  - SPA, already built         │
│  - Firestore onSnapshot for   │
│    streaming agent updates    │
└──────┬────────────────────────┘
       │ HTTPS / callable
       ▼
┌───────────────────────────────┐        ┌──────────────────────────┐
│   Firebase Cloud Functions    │───────▶│ Cloud Pub/Sub: agent-jobs│
│   (thin orchestration)        │        └──────┬───────────────────┘
│  - startProject (callable)    │               │
│  - sendMessage  (callable)    │               ▼
│  - getProject   (callable)    │        ┌──────────────────────────┐
│  - enqueueAgentRun            │        │  Cloud Run: agent-worker │
└───────────────────────────────┘        │  - Long-running (15m cap)│
       │                                 │  - Claude tool-use loop  │
       │                                 │  - Writes status +       │
       ▼                                 │    deltas to Firestore   │
┌───────────────────────────────┐        └──────┬───────────────────┘
│         Firestore             │◀──────────────┘
│  - projects                   │
│  - messages                   │        ┌──────────────────────────┐
│  - reports                    │◀───────│ Scheduled Cloud Function │
│  - homes                      │        │  - Daily link re-check   │
│  - resources (curated)        │        │  - Maintenance nudges    │
│  - agentRuns (trace)          │        └──────────────────────────┘
└───────────────────────────────┘
```

### Decisions locked for v1
- **Frontend**: Vue 3 + Vite (existing). No rewrite. Keep the warm/blueprint design language.
- **Auth**: Firebase Auth (existing).
- **State**: Firestore (existing).
- **Short orchestration (seconds)**: Firebase Cloud Functions (existing).
- **Long agent runs (minutes)**: **Cloud Run service**, TypeScript, Node 20. Triggered via Pub/Sub from a function. Streams status back to Firestore.
- **LLM**: Claude Sonnet 4.6 (`claude-sonnet-4-6`) for agent loop. Haiku 4.5 for cheap sub-tasks (search query formulation, JSON extraction from pages).
- **Search**: Anthropic native `web_search` tool.
- **Fetch / browse**: ScrapingBee (paid, stealth, HTML + JS rendering) for Home Depot / Lowe's. Custom fetcher with rotating UA for plain content sites.
- **Contractor lookup**: Google Places API (New).
- **YouTube (Phase 2)**: YouTube Data API v3.
- **Secrets**: Google Secret Manager, injected as env vars into Cloud Run.
- **Observability**: structured logs to Cloud Logging; agent traces stored in `agentRuns/{runId}/steps/*` Firestore subcollection for user-visible "what did it do" panel.
- **Language**: TypeScript end-to-end; shared types in `shared/` workspace (existing pattern).

### Rejected / deferred
- LangChain, LangGraph, LlamaIndex — agent logic here is narrow enough to write directly against Anthropic's SDK. Less magic, easier to debug.
- Bright Data — overkill for v1.
- Self-hosted headless browser — ScrapingBee first; move to Playwright on Cloud Run if it hits limits.
- Vector DB — no RAG in v1. Prompts carry context.

---

## 7. Data Model

All schemas in `shared/src/types/*.ts`. Firestore serves `Date` as `Timestamp`; convert at boundaries.

### `users/{uid}`
```ts
interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  createdAt: Date;
  primaryHomeId?: string;
}
```

### `homes/{homeId}`
One home per user for v1. Foundation for the "remember the house" vision.
```ts
interface Home {
  id: string;
  userId: string;
  nickname: string;           // "Main house"
  zipCode: string;            // required — drives all pricing
  address?: string;           // optional until v2
  yearBuilt?: number;
  squareFeet?: number;
  bedrooms?: number;
  bathrooms?: number;
  systems?: HomeSystem[];     // HVAC, water heater, roof, etc. — Phase 3
  createdAt: Date;
  updatedAt: Date;
}

interface HomeSystem {
  kind: 'hvac' | 'water_heater' | 'roof' | 'appliance' | 'other';
  label: string;
  installedDate?: Date;
  brand?: string;
  model?: string;
  warrantyExpires?: Date;
  lastServiced?: Date;
  notes?: string;
}
```

### `projects/{projectId}`
```ts
interface Project {
  id: string;
  userId: string;
  homeId: string;
  category: ProjectCategory;   // 'bathroom_vanity' | 'deck_build' for v1
  title: string;               // auto-generated from convo
  status: ProjectStatus;
  // 'clarifying'  — agent asking questions
  // 'planning'    — agent building materials list + plan
  // 'pricing'     — agent fetching real prices
  // 'synthesizing'— agent writing the report
  // 'complete'    — done
  // 'error'       — failed
  createdAt: Date;
  updatedAt: Date;
  currentAgentRunId?: string;  // pointer to the latest run
}
```

### `projects/{projectId}/messages/{messageId}`
```ts
interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  phase: 'clarification' | 'report' | 'followup';
  createdAt: Date;
}
```

### `projects/{projectId}/report/main`
```ts
interface ProjectReport {
  projectId: string;
  summary: string;
  complexityScore: number;        // 1-10
  diyFeasibilityScore: number;    // 1-10
  estimatedDuration: string;

  tasks: TaskItem[];
  materials: MaterialsList;       // NEW — real SKUs, real prices
  labor: LaborEstimate;           // NEW — sourced, ZIP-adjusted
  costSummary: CostSummary;       // NEW — rolls up materials + labor
  resources: Resource[];          // existing, allowlist-filtered
  warnings: string[];
  tips: string[];

  confidence: ConfidenceReport;   // NEW — per-section confidence
  generatedAt: Date;
  generatedByRunId: string;
}

interface MaterialsList {
  items: MaterialItem[];
  subtotal: number;
  fetchedAt: Date;
  source: 'home_depot' | 'lowes';
  zipCode: string;
}

interface MaterialItem {
  id: string;                     // internal uuid
  name: string;                   // "Pressure-treated 2x6x8 lumber"
  qty: number;
  unitPrice: number;
  totalPrice: number;
  sku: string;
  productUrl: string;             // deep link to HD/Lowe's PDP
  inStock: boolean;
  confidence: 'high' | 'medium' | 'low';
  reasoning?: string;             // why this SKU, why this quantity
}

interface LaborEstimate {
  lowUsd: number;
  highUsd: number;
  nationalAverage?: number;
  regionalMultiplier?: number;    // multiplier applied for ZIP
  sources: CostSource[];          // at least one; ideally 2+
  breakdown?: LaborLine[];        // optional: demo, install, finish
}

interface CostSource {
  siteName: string;               // "HomeAdvisor"
  url: string;
  snippet: string;                // short quote Claude pulled
  fetchedAt: Date;
}

interface LaborLine {
  task: string;
  lowUsd: number;
  highUsd: number;
}

interface CostSummary {
  diyTotal: number;               // materials only
  proTotal: number;               // materials + labor (or labor-only if pro supplies)
  savings: number;
  savingsPercent: number;
  assumptions: string[];          // "Assumes you have a miter saw"
}

interface ConfidenceReport {
  materials: 'high' | 'medium' | 'low';
  labor: 'high' | 'medium' | 'low';
  overall: 'high' | 'medium' | 'low';
  caveats: string[];
}
```

### `agentRuns/{runId}`
Transparency surface. Every step the agent took, user-visible.
```ts
interface AgentRun {
  id: string;
  projectId: string;
  userId: string;
  status: 'queued' | 'running' | 'complete' | 'error';
  startedAt: Date;
  completedAt?: Date;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number;
  errorMessage?: string;
}
```

### `agentRuns/{runId}/steps/{stepId}`
```ts
interface AgentStep {
  id: string;
  index: number;
  kind: 'think' | 'tool_call' | 'tool_result' | 'final';
  tool?: string;                  // 'web_search', 'fetch_home_depot_price', etc.
  input?: unknown;
  output?: unknown;
  summary: string;                // human-readable, shown in UI
  startedAt: Date;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
}
```

### `resources/{resourceId}` (shared curation pool — Phase 2)
```ts
interface CuratedResource {
  id: string;
  url: string;                    // unique
  domain: string;
  title: string;
  categories: ProjectCategory[];
  kind: 'article' | 'video' | 'tool' | 'product';
  upvotes: number;
  downvotes: number;
  lastCheckedAt: Date;
  live: boolean;
}
```

### Firestore security rules (v1)
- `users/{uid}` — read if `auth.uid == uid`. Write: never from client.
- `homes/{homeId}` — read if `resource.data.userId == auth.uid`. Write: never from client.
- `projects/{projectId}` — read + list if `resource.data.userId == auth.uid`, list requires `query.limit <= 100`. Write: never from client.
- `projects/{projectId}/**` subcollections — read if parent's `userId == auth.uid`. Write: never from client.
- `agentRuns/{runId}` — read if `userId == auth.uid`. Write: never from client.
- `resources/{resourceId}` — read: authenticated. Write: never from client (agent updates via admin SDK).

All writes go through admin-SDK backends. This is already the model.

---

## 8. Agent Design (the interesting part)

### Anatomy of a run
A project report run is a tool-using Claude loop with four phases. The phases are explicit in the orchestrator because it lets us stream meaningful status to the UI (`planning → pricing → synthesizing`) and budget tokens/cost per phase.

```
PHASE 1: PLAN
  Prompt: "You have a project spec. Produce a structured plan:
           task list, materials list (generic names + quantities + reasoning),
           labor categories, and a list of questions to resolve via tools."
  Tools allowed: none (pure reasoning)
  Output: PlanDraft JSON

PHASE 2: PRICE
  Prompt: "For each material in the plan, find the best SKU match at Home Depot
           for ZIP {zip}. If unavailable, try Lowe's. Return structured prices."
  Tools allowed: fetch_home_depot_sku, fetch_lowes_sku, web_search
  Output: MaterialsList (validated, filtered)

PHASE 3: LABOR
  Prompt: "Find current labor cost ranges for {category} from at least 2 cost
           guides. Adjust for ZIP using regional multipliers. Quote snippets."
  Tools allowed: fetch_cost_guide, web_search
  Output: LaborEstimate

PHASE 4: SYNTHESIZE
  Prompt: "Given the plan, materials, labor, and the conversation, produce the
           final ProjectReport JSON. Assign confidence per section."
  Tools allowed: none
  Output: ProjectReport
```

### Tool catalog

All tools return structured JSON. All have timeouts and retries. All log to `agentRuns/{runId}/steps`.

```ts
// === Search ===
tool web_search(query: string): SearchResult[]
// Anthropic native tool. 5 results max. Each: {title, url, snippet}.

// === Fetching ===
tool fetch_url(url: string, render_js?: boolean): { html: string, text: string }
// ScrapingBee for HD/Lowe's, plain fetch otherwise. 10s timeout.

// === Pricing ===
tool fetch_home_depot_sku(args: {
  query: string,        // "pressure treated 2x6x8"
  zipCode: string,
  maxResults?: number   // default 3
}): HomeDepotProduct[]
// Internally: ScrapingBee fetch of HD search URL with zipCode cookie,
// parse first N results into {name, sku, price, url, inStock, image}.

tool fetch_lowes_sku(...): LowesProduct[]
// Same shape, Lowe's equivalent.

tool fetch_cost_guide(args: {
  category: string,     // "deck building"
  zipCode: string,
  site?: 'homeadvisor' | 'fixr' | 'any'
}): CostGuideResult
// Returns: { lowUsd, highUsd, nationalAvg, regionalAdj, sourceUrl, snippet }

// === Validation ===
tool check_url_live(url: string): boolean
// HEAD → GET fallback. 5s timeout.

// === Contractor discovery (Phase 2) ===
tool find_contractors(args: {
  zipCode: string,
  category: string,
  minRating?: number,
  maxResults?: number
}): Contractor[]
// Google Places API. Filter by type + rating.
```

### Prompt scaffolds (live in `agent-worker/src/prompts/`)

**System prompt (shared across phases):**
```
You are Handy, a home-project research agent. You help homeowners understand
projects by doing real research — not by guessing.

Operating rules:
- Every factual claim about pricing must come from a tool call result. No
  pricing from memory.
- URLs you cite must have been returned by a tool. Never fabricate URLs.
- If a tool fails or returns empty, say so; do not fill the gap with
  guesses. Mark the affected section low-confidence.
- Prefer two sources over one. Flag when sources disagree by >30%.
- Units: USD for money, inches/feet for lumber, hours for labor.
- Location context: ZIP {zipCode}, region {regionLabel}.

You are currently in phase: {phase}. Stay focused on the phase's output.
```

**Plan phase prompt:** details the expected PlanDraft JSON, with a one-shot example of a bathroom vanity plan.

**Price phase prompt:** "For each generic material, search HD first. Take the first result that matches the spec (dimensions, grade). If out of stock or no result, try Lowe's. Record the SKU, price, URL, and qty. If you cannot find a match after 2 tool calls, mark the item unresolved."

**Labor phase prompt:** "Fetch at least two cost guides. Extract low/high/avg. Note the regional multiplier (usually on the same page). If national only, use hardcoded regional multipliers from this table: {table}."

**Synthesize phase prompt:** strict JSON schema, confidence rubric, tradeoff-reasoning guidelines.

### Stop conditions & budget
Per project run, hard caps:
- Max 40 tool calls total.
- Max 250k total input tokens.
- Max 15 minutes wall clock.
- On cap hit: finalize with what we have, mark confidence `low`, return.

Per tool call:
- 10s fetch timeout, 2 retries with backoff.
- 5s for `check_url_live`.

### Cost targets
Sanity estimate per project report (Sonnet 4.6 at current pricing):
- Input: ~80k tokens (system prompts, tool results, conversation).
- Output: ~8k tokens.
- ≈ $0.36 in model spend.
- + ~15 ScrapingBee credits (~$0.03).
- **Target: under $0.50/report.**
Track actuals in `agentRuns.estimatedCostUsd` so we know if reality matches.

### Follow-up mode
When a user asks a follow-up after the report (e.g., "what if I use quartz instead?"), the orchestrator runs a lightweight variant: only PRICE + SYNTHESIZE phases, scoped to the changed items. Preserves original materials list except for modified entries.

### Agent run as source of truth
The UI should render the report from the `AgentRun` → its steps → the final synthesis output, not as a mystery box. Every number in the report links to the step that produced it. Users can click "where did this $47 come from" and see the tool call and source URL.

---

## 9. API Contracts

### Callable Cloud Functions (client-facing, same pattern as current code)

```ts
// startProject
input: {
  category: ProjectCategory;
  initialDescription: string;
  homeId?: string;            // if omitted and user has primaryHomeId, uses it
}
output: { projectId: string }
side effects: creates project doc, first assistant message (clarifying Q)

// sendMessage
input: { projectId: string; content: string; }
output: { projectId: string; nextPhase: ConversationPhase; }
side effects: appends user msg, triggers Claude reply, if report_ready -> enqueues agent run

// getProject
input: { projectId: string }
output: { project, messages, report?, currentRun? }

// createHome
input: { nickname: string; zipCode: string; ... }
output: { homeId: string }

// requestFollowup
input: { projectId: string; question: string; }
output: { runId: string }
side effects: enqueues scoped agent run

// rerunProject
input: { projectId: string; reason?: string; }
output: { runId: string }
```

### Cloud Run endpoints (internal, Pub/Sub-triggered)

```
POST /agent-run
body: { runId, projectId, userId, mode: 'full' | 'followup', followupQuestion? }
auth: OIDC token from Pub/Sub push
returns: 202 immediately; work continues; status streamed to Firestore
```

### Streaming protocol
The Cloud Run worker does NOT stream HTTP to the client. It writes progress to Firestore:

- On phase transition: update `projects/{id}.status` and append an `AgentStep` with kind=`think` and a one-line summary like "Pricing 23 items at Home Depot near 30303."
- On each tool call: append `AgentStep` with kind=`tool_call` (immediate) then update same step with kind=`tool_result` when it returns.
- On completion: write final `ProjectReport` doc, set project status to `complete`, mark run `complete`.
- On error: set status to `error`, write error message.

Frontend subscribes via `onSnapshot` to:
- `projects/{id}` (for status transitions).
- `agentRuns/{runId}/steps` (for live activity log).
- `projects/{id}/report/main` (appears atomically on success).

---

## 10. Frontend Specification

### Routes
```
/login                       — existing
/                            — dashboard: projects + nudges
/home/setup                  — one-time home/ZIP capture (gate before first project)
/new                         — pick category, kick off
/project/:id                 — conversation view (existing, enhanced)
/project/:id/report          — report view (existing, restructured)
/project/:id/run/:runId      — agent activity / "show your work" view (NEW)
/home                        — home profile (NEW, thin in v1)
```

### Key views

**Dashboard** — project cards + a "Quick Ask" box ("price something, check a quote, etc."). Empty state uses the blueprint aesthetic from the design notes.

**ConversationView** — existing two-column: messages left, summary right. Add a live **Agent Activity Panel** that appears when the agent is running; shows the last 5 steps with pulse animations on the active one. Clicking expands to full step detail.

**ReportView** — restructured around the new sections:
1. Header: confidence badge, total DIY vs pro, "show your work" link.
2. Materials Cart (new): table with image, name, qty, price, link. "Export to HD cart" and "Export to Lowe's cart" buttons (deep links). Each row shows a confidence dot with hover-tooltip explaining the call.
3. Labor Estimate (new): range with source citations. Hover shows the fetched snippet.
4. Task Timeline: existing TaskList, annotated with estimated hours.
5. Tradeoffs (new): a short block with quality / time / money reasoning.
6. Resources: existing.
7. Warnings + tips: existing.

**Agent Activity View** — full trace of an AgentRun. Every step, tool call, and result. Includes token counts and estimated cost for that run. This is both dogfooding transparency and a debugging surface.

**Home Profile** — in v1, basically a form: ZIP, year built, bed/bath count. Foundation for Phase 3.

### Components to add
- `AgentActivityPanel.vue` — live ticker of running steps.
- `AgentActivityView.vue` — full-trace inspector.
- `MaterialsCart.vue` — shoppable table with export actions.
- `LaborEstimate.vue` — range + sources component.
- `ConfidenceBadge.vue` — high/med/low pill with tooltip.
- `CostSourceChip.vue` — link-out chip with fetched snippet on hover.
- `TradeoffCard.vue` — quality/time/money prose block.

### Design continuity
Honor the existing warm/earthy palette and blueprint motifs from `memory/design-notes.md`. Agent activity animations should feel *mechanical* (gears, pulses) rather than "AI glow." Think: a contractor flipping through plans, not a chatbot typing.

---

## 11. Infrastructure & Deployment

### Repo layout (extends current)
```
/
├── frontend/                   existing Vue SPA
├── functions/                  existing Cloud Functions (thin orchestration)
├── agent-worker/               NEW: Cloud Run service
│   ├── src/
│   │   ├── server.ts           Express/Hono HTTP entry
│   │   ├── runner.ts           main agent loop
│   │   ├── prompts/
│   │   ├── tools/              one file per tool
│   │   ├── phases/             one file per phase
│   │   ├── firestore.ts        writer for steps/status
│   │   └── pricing/
│   │       ├── home-depot.ts   scraper + parser
│   │       └── lowes.ts
│   ├── Dockerfile
│   └── package.json
├── shared/                     existing
├── firestore.rules             updated per §7
├── firestore.indexes.json
├── firebase.json
├── cloudbuild.yaml             NEW: builds + deploys agent-worker
└── PRD.md                      (this file)
```

### Env vars (Secret Manager → Cloud Run)
```
ANTHROPIC_API_KEY               Claude access
SCRAPINGBEE_API_KEY             pricing scrapes
GOOGLE_PLACES_API_KEY           Phase 2+
YOUTUBE_API_KEY                 Phase 2+
FIREBASE_PROJECT_ID             admin SDK
GCP_PROJECT                     home-helper-706a8
PUBSUB_TOPIC_AGENT_JOBS         'agent-jobs'
```

### Deployment
- `firebase deploy --only functions,hosting,firestore` (existing).
- `gcloud run deploy agent-worker --source ./agent-worker ...` with Cloud Build.
- Pub/Sub push subscription from `agent-jobs` topic → Cloud Run `/agent-run` with OIDC auth.

### Local dev
- Firebase emulators (existing).
- `agent-worker`: `npm run dev` runs it at `localhost:8787` against the Firestore emulator. A dev-only "fake Pub/Sub" script can POST to `/agent-run` directly to exercise the loop without GCP.
- ScrapingBee + Claude calls hit real services even in dev (they're stateless and cheap; not worth mocking).

---

## 12. Safety, Trust & Quality

Rules of engagement the agent must not violate:

1. **Never fabricate URLs.** Every cited URL must have come from a tool call in this run.
2. **Never fabricate prices.** Every price in the report must trace to a `fetch_*_sku` or `fetch_cost_guide` step.
3. **Never silently drop failures.** If a materials item couldn't be priced, it appears in the cart with an "unresolved" badge and a reason, not omitted.
4. **Confidence is honest.** Low-confidence sections are labeled low — no inflating to "high" because the report looks nicer.
5. **No code compliance guarantees.** Warnings say "verify local code," never "this meets code."
6. **Affiliate links are disclosed.** Materials links that are affiliate-tagged say so in the footer.
7. **No ordering on behalf.** No API-level purchasing, ever, in v1. Cart exports only.

Validation pipelines (automated, on every report):
- Every URL in the final report is `check_url_live`'d before save. Dead ones are dropped.
- Every price re-parses cleanly as a number > 0.
- DIY total sanity check: within 3× of cost-guide low. If not, log for review and drop confidence.
- Labor range sanity: low < high, both > 0.

---

## 13. Phased Roadmap

### Phase 0 — Done (current codebase)
One-shot LLM advisor, two verticals, vibes-based numbers. Working MVP.

### Phase 1 — v1 / MVP target (this PRD's one-shot)
- Cloud Run agent worker with four-phase loop.
- Home profile + ZIP capture.
- Real materials pricing (HD primary, Lowe's fallback).
- Labor estimates from cost guides.
- Agent activity view.
- Follow-up mode.
- Confidence reporting.

### Phase 2 — Polish and depth
- Curated resources pool with user thumbs-up/down.
- YouTube integration (Data API + quality gating).
- Contractor discovery (Google Places).
- Third vertical (flooring or kitchen refresh).
- Quote calibration flow (paste a contractor quote, get validation).

### Phase 3 — The "remember the house" chapter
- Home systems inventory UI.
- Warranty vault + receipt OCR.
- Maintenance schedule with nudges (scheduled Cloud Function).
- Seasonal checklists.
- Past-project history that informs future recommendations.

### Phase 4 — Interactive & multi-player
- Household invites (partner / spouse).
- "Phone a friend" — agent drafts questions to ask contractors.
- Negotiation support.
- Side-by-side quote comparison.

### Phase 5 — Platform-y things
- Affiliate/lead-gen revenue.
- Contractor side of the market (maybe).
- Insurance / home-warranty integrations.
- Mobile app.

---

## 14. Business Model (light — for completeness)

This is a personal project; not optimizing for revenue. But the natural shape:
- **Free tier**: 3 projects / month.
- **Pro ($9/mo)**: unlimited projects, home profile, maintenance nudges, quote calibration.
- **Affiliate revenue**: Home Depot / Lowe's / Amazon links on materials.
- **Lead gen**: contractors pay for qualified leads from Phase 2+.

Any of these is optional — the project can exist purely as a portfolio piece.

---

## 15. Risks & Open Questions

| # | Risk / Question | Mitigation or decision needed |
|---|-----------------|-------------------------------|
| 1 | HD/Lowe's block ScrapingBee | Budget for retries, have a 3rd fallback (Menards), or switch to Playwright on Cloud Run |
| 2 | Cost per run balloons past budget | Hard caps on tool calls + tokens; aggressive Haiku routing for sub-tasks |
| 3 | Agent latency feels bad (>3 min) | Aggressive parallelism on pricing phase (all `fetch_*_sku` in parallel); streaming status so waiting feels informative |
| 4 | ZIP-to-region multiplier is hand-wavy | Use HomeAdvisor's regional pages when available; fallback to a static state-level multiplier table |
| 5 | SKU quantity math is wrong | Validate against known project formulas (sq ft × coverage); human-in-the-loop "edit quantity" in UI as a safety net |
| 6 | Legal exposure on cost estimates | Prominent "estimates only" disclaimer; confidence badges; no "guaranteed" language anywhere |
| 7 | Affiliate program sign-ups (HD is picky) | Proceed without affiliate tagging for v1; add once approved |
| 8 | Claude rate limits during long runs | Retry with backoff; spread over time windows |
| 9 | Should v1 include mobile-responsive polish? | Yes — but don't build a native app; ensure the Vue SPA works well on phone |
| 10 | Do we need auth beyond Firebase email? | Add Google SSO in v1 (low effort, big UX win) |
| 11 | How do we test agent runs without real fetches? | Cassette pattern — record real responses once, replay in tests |

---

## 16. Appendix A — Example Agent Run (deck project)

User: *"I want to build a 12x16 deck off my back door. I'm handy. ZIP 30303."*

1. **Clarify** (Cloud Function, 1 Claude call): agent asks attached vs freestanding, height off ground, desired material. User answers: attached, 36" above grade, PT lumber.
2. **Plan** (Cloud Run, Phase 1): agent produces materials list — ledger board, 10 joists, 4 posts, footings, decking boards, joist hangers, fasteners, flashing, railing components. Status: `planning`.
3. **Price** (Phase 2): parallel `fetch_home_depot_sku` for each material with ZIP 30303. 19 of 23 items resolve on first try. 2 unresolved (custom hardware), 2 fallback to Lowe's. Status: `pricing`.
4. **Labor** (Phase 3): `fetch_cost_guide` on homeadvisor.com and fixr.com for "deck installation 30303". Pulls $35-$60/sqft range. For 192 sqft → $6,720-$11,520 pro labor. Status: `synthesizing`.
5. **Synthesize** (Phase 4): final report — DIY total $3,140 (materials), Pro total $11,180 (national avg adjusted), savings $8,040 or 72%. Confidence: materials=high, labor=medium (only 2 sources, ranges disagreed by 35%), overall=medium. Warnings about permits. 4 resource links (validated).
6. UI renders report. Agent Activity view shows 27 tool calls, $0.41 total run cost, 92 seconds wall clock.

---

## 17. Appendix B — Prompt templates (abridged; full in code)

Located at `agent-worker/src/prompts/`:
- `system.ts` — shared system prompt, interpolates `{zipCode}`, `{regionLabel}`, `{phase}`.
- `plan.ts` — Plan phase prompt, with two-shot examples (vanity + deck).
- `price.ts` — Price phase prompt; emphasizes "search once, pick first good match, don't over-think."
- `labor.ts` — Labor phase prompt with cost-guide URL patterns and regional adjustment instructions.
- `synthesize.ts` — Final synthesis with strict JSON schema for `ProjectReport`.
- `followup.ts` — Scoped rerun for "what if" questions.

Each prompt file exports a function `(ctx) => string` that takes a typed context object and returns the prompt. Keeps interpolation safe and testable.

---

## 18. What "one-shot done" looks like

If we actually pulled this off in one shot, the deliverable is:
- Working Cloud Run agent-worker deployed (or at least runnable locally).
- Updated Cloud Functions for new callables.
- New Firestore collections and rules.
- Frontend has the new home-setup flow, agent activity panel, and restructured report.
- A test user can create a deck project, watch the agent run, and get a sourced report with real HD prices and labor citations.
- `README.md` covers local dev setup end-to-end.

The *one* thing worth not one-shotting: contractor discovery, YouTube, and the resources curation pool. Those are Phase 2 and should stay out of the v1 attempt to keep scope bounded.

---

## 19. Attack plan for the one-shot

When we actually try to slam this down in one go, rough order:

1. **Shared types first** — add all new types to `shared/src/types/*.ts`. The rest of the codebase flows from these.
2. **Firestore rules + indexes** — update in place.
3. **Cloud Run agent-worker scaffolding** — package.json, Dockerfile, Express/Hono server, Pub/Sub handler, Firestore writer.
4. **Tool implementations** — start with `fetch_url` + `check_url_live` + `web_search`, then `fetch_home_depot_sku`, then `fetch_cost_guide`. Each tool is a self-contained file with a typed input/output.
5. **Phase runners** — plan/price/labor/synthesize, each calling Claude with the phase's prompt and tools.
6. **Main loop** — orchestrates the phases, handles budget caps, writes status.
7. **Cloud Functions updates** — add `enqueueAgentRun`, update `sendMessage` to detect report-ready and publish to Pub/Sub instead of generating inline.
8. **Home setup flow** — `/home/setup` route, `createHome` callable.
9. **Frontend restructure** — new components (`AgentActivityPanel`, `MaterialsCart`, `LaborEstimate`, `ConfidenceBadge`, `CostSourceChip`, `TradeoffCard`), update `ReportView`, add `AgentActivityView`.
10. **Smoke test flow** — create deck project end-to-end locally. Confirm the loop runs. Iterate on whatever breaks first.

Fun mode engaged.
