# Claude Code prompts for setting this repo up

Copy any of these into [Claude Code](https://claude.ai/code) with the repo opened. Each prompt is self-contained — Claude will read the relevant files itself.

The repo's `CLAUDE.md` (at the root) is the master architectural brief Claude will pick up automatically.

---

## "Get me running locally"

```
I just cloned this repo. Walk me through getting it running locally with
Firebase emulators, my own keys, and the agent-worker.

I have: a Google account, Node 20+, npm, and the firebase + gcloud CLIs
installed. I do NOT yet have a Firebase project, secret keys, or anything else.

Please:
1. Tell me what I need to create (Firebase project, API keys) and where.
2. Read docs/SETUP.md and follow it with me step by step.
3. After I create each key, ask me to paste it and put it in the right
   gitignored file.
4. Verify each step works before moving on — emulator boots, agent-worker
   starts, frontend serves, anonymous auth works.

Don't deploy to production yet. We're stopping at "it works locally."
```

---

## "Deploy this to my own Firebase project"

```
The local setup is working. Now deploy this to my own Firebase project end
to end: Cloud Run agent-worker, Cloud Functions, Firestore rules + indexes,
and Hosting.

Follow docs/SETUP.md sections 7 and 8. Specifically:
1. Stash my keys (already in functions/.env.local) into Google Secret Manager.
2. Deploy the agent-worker to Cloud Run with --no-allow-unauthenticated and
   secrets mounted.
3. Lock down the Cloud Run IAM so only the compute service account can
   invoke it. Verify a direct curl returns 403.
4. Create the functions/.env.<my-project-id> file pointing AGENT_WORKER_URL
   at the Cloud Run URL you just got.
5. firebase deploy --project <my-project-id>
6. Smoke test by hitting the hosting URL and triggering one agent run.

If anything fails, read the relevant log (gcloud run services logs read,
gcloud functions logs read) and tell me what broke before retrying.
```

---

## "Add a new project category"

Adding a third category beyond `deck-building` and `bathroom-vanity`:

```
Add a new project category called <YOUR_CATEGORY_ID> for <human-readable>.

This needs to touch:
1. shared/src/constants/categories.ts — add the metadata block including
   clarificationGuidance + youtubeQuery (hand-tuned per category — make
   sure YouTube doesn't return off-topic content like card games).
2. shared/src/types/project.ts — extend the ProjectCategory union.
3. agent-worker/src/tools/cost-guide.ts — add a COST_GUIDE_URLS entry with
   verified HomeAdvisor + Fixr slugs. Use WebFetch to verify the URLs
   actually 200 before committing them.
4. Optional: add a category icon. Run
   `python3 scripts/generate-assets.py icon-<id>` after editing the prompt
   in that script. Then wire it into frontend/src/lib/assets.ts.

For each step, run the relevant typecheck (`cd <pkg> && npx tsc --noEmit`)
after making the change. Tests don't need to extend (categories are
data-driven) but a quick `cd agent-worker && npm test` is wise.
```

---

## "Swap Anthropic for a different LLM provider"

The agent-worker is hard-coupled to Anthropic's API for structured outputs (a real feature dependency, not just SDK ergonomics). But if you want to try:

```
I want to swap the agent-worker's Claude calls for <provider, e.g. OpenAI>.

Read agent-worker/src/util/claude.ts — that's the only file that imports
the Anthropic SDK directly. Everything else uses callClaude() which is
provider-agnostic at the type level.

The hard parts:
- output_config.format with zodOutputFormat (structured outputs). Find the
  equivalent for the provider — OpenAI has response_format with json_schema,
  Gemini has responseSchema. Make sure schemas match what we already have
  in agent-worker/src/schemas/phase-outputs.ts.
- Tool use loop. The phase loop in src/phases/loop.ts expects Anthropic's
  tool_use / tool_result block format. The provider's equivalent will need
  shape adapters.
- 28 cassettes are recorded against Anthropic responses — they'll break.
  Decide whether to re-record (CASSETTE_MODE=record) or write a separate
  cassette format.

Recommend you write a minimal proof-of-concept against ONE phase first
(plan, since it has no tools) before touching the loop driver.
```

---

## "Audit the security posture"

Useful before forking + putting your version on the public internet:

```
Audit this codebase for production-deployment security issues before I
post a link to mine on social media. Focus on:

1. Cost runaway: can someone bypass the usage gate? Look at every entry
   point that triggers an Anthropic call. Confirm the Cloud Run service
   requires IAM auth (not --allow-unauthenticated) and that functions/
   src/queue/job-queue.ts mints an OIDC token.

2. SSRF: can a user-controlled URL leak the GCE metadata server token?
   Check agent-worker/src/tools/fetch-url.ts and check-url-live.ts use
   assertPublicUrl().

3. Prompt injection: can a user get the bot to break character (write
   code, roleplay, leak the system prompt)? Read functions/src/prompts/
   system.ts and try to think of bypasses. Test by typing them into the
   running app.

4. Secret leakage: scan git history for accidentally-committed keys.
   `git log -p | grep -iE 'sk-|api[_-]?key.*[a-z0-9]{20}'` (excluding
   the agent-worker cassettes which are HD HTML).

5. Firestore rules: confirm cross-user reads are blocked.

Report findings ordered by impact. Don't fix anything yet — show me
the findings first.
```

---

## "Investigate a stuck agent run"

```
I just kicked off an agent run from my deployed UI and it's stuck at
"queued" status for >2 minutes. Diagnose.

Check in order:
1. Cloud Run agent-worker logs (gcloud run services logs read agent-worker
   --region us-central1 --limit 30) — did the worker receive the job?
2. Functions logs for the recent sendMessage / retryProject call — did it
   try to POST to the worker, and did it succeed?
3. If functions tried but failed, look at the error. 401/403 means OIDC
   token rejected, check IAM on agent-worker. 500 means JobQueue threw,
   check google-auth-library is installed in functions/.
4. If functions succeeded but worker has no logs, check the AGENT_WORKER_URL
   in functions/.env.<project-id> matches the actual deployed Cloud Run URL.
5. If worker IS logging but nothing happens after "agent run starting",
   the run silently crashed. Check --no-cpu-throttling is set on the
   Cloud Run service — without it, async work after the 202 response gets
   suspended.

Don't redeploy until you have a hypothesis.
```

---

## "Just walk me through the code"

For onboarding, no setup goal:

```
I want to understand this codebase. I have an hour. Walk me through it
in the order someone would learn it best.

Starting points I care about most:
- The four-phase agent loop architecture
- The structured-outputs migration story
- The cassette record/replay pattern
- The cost-cap layer
- The streaming UX via Firestore onSnapshot

For each, point me at the actual file and explain what's clever about
the design. WRITEUP.md is a good starting summary but I want to see the
real code paths.
```

---

## Tips for prompting Claude Code on this repo

- **`CLAUDE.md` at the repo root** is the master architectural brief. Claude Code reads it automatically.
- **Tests are the smoke check.** When you ask Claude to make a change, end the prompt with "run `npm test` in the affected package after". Catches 80% of typos.
- **The cassette pattern means you can iterate prompts without burning real API budget.** When iterating on agent prompts, run agent-worker tests against cassettes instead of hitting Anthropic.
- **Don't ask Claude to run `firebase deploy` for you blindly.** Each deploy is a real-money action. Have it propose the command, you run it.
- **For prompt-engineering changes**, ask Claude to update `agent-worker/src/prompts/*.ts` or `functions/src/prompts/*.ts`, *then* run the smoke (`cd agent-worker && npm run smoke` with API keys present).
