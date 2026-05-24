# AI Tinkerers Boston — 5-minute demo script

**Talk title:** *The duct tape was hiding three bugs: an agent migration story*

**Project:** Home Helper · github.com/iaj6/home-project-agent · home-helper-706a8.web.app

---

## Setup before you go on stage

1. **Editor open.** Cursor / VS Code. Font size **24pt minimum**. Dark theme. Three tabs pre-opened, in this order (so cmd-1/2/3 navigates):
   - `demo/before-claude.ts`
   - `agent-worker/src/util/claude.ts`
   - `agent-worker/src/schemas/phase-outputs.ts`
2. **Browser open.** Two tabs:
   - `https://home-helper-706a8.web.app/sample` — the sample blueprint
   - GitHub repo page (for the close — `iaj6/home-project-agent`)
3. **Terminal open.** Big font (`Cmd+Plus` in iTerm/Terminal until it reads from row 5 in the audience). One pane. Clear it.
4. **A printed cue card** with the timestamps below — glance at it once mid-demo to stay on pace.
5. **Mouse pointer big.** macOS → System Settings → Accessibility → Display → Pointer size → up two notches.

---

## The script

### Beat 1 · Hook (0:00 → 0:30) — *browser*

> "Hi, I'm Ian. I built a four-phase Claude tool-use agent that prices home projects against real Home Depot SKUs and labor cost ranges."

**Screen:** browser at `/sample`. Scroll once — past the title block, past the materials cart with the real SKUs.

> "What I want to show you is the three bugs I had for **weeks** that I never found, until I deleted my safety-net code."

**Switch to editor — 0:30 sharp.**

---

### Beat 2 · The duct tape (0:30 → 1:30) — *demo/before-claude.ts*

> "Old code, simplified. Every phase ended with this in the prompt — *'Output ONLY the raw JSON object, no markdown, no prose.'*"

**Screen:** open `demo/before-prompt.ts`. Scroll to the "Output formatting rules (HARD)" block. Read it out loud — it's funny.

> "When Claude complied, great. When it didn't — markdown fences, trailing prose — my regex stripped it. Find the first `{`, find the last `}`, JSON.parse."

**Screen:** switch to `demo/before-claude.ts`. Highlight the `extractJson` function. ~5 sec.

> "When THAT failed — truncated JSON, mid-array invalid syntax — there was a forced-finalization branch. Sixty more lines. Made a second call to Claude, begging it to emit JSON this time."

**Screen:** scroll to `forceFinalize`. Spend ~15 sec on it. Read out the user message: *'Stop calling tools. Emit the final JSON output now using only the information you already have.'*

> "It usually worked. That's the part that's going to matter in a second."

**Pause. ~1:30 mark.**

---

### Beat 3 · The deletion (1:30 → 2:30) — *real claude.ts + schema*

> "Then Anthropic shipped structured outputs."

**Screen:** switch to `agent-worker/src/util/claude.ts`. Point at the `output_config.format` line — line 48-ish.

> "API guarantees a Zod-schema-shaped JSON object. Coexists with tool use. The `zodOutputFormat` helper translates the Zod schema to JSON-schema and the API constrains decoding."

**Screen:** switch to `agent-worker/src/schemas/phase-outputs.ts`. Show `PlanDraftSchema` — top of file.

> "Plan-phase schema. Same shape as the old prompt JSON example, but it's a real type. The Claude call returns `parsed_output` already typed."

**Pause. Then the punchline:**

> "I deleted the `extractJson` regex. I deleted the 60-line forced-finalization branch. I deleted the 'Output ONLY raw JSON' boilerplate from every prompt. Migration took 30 minutes. **The next time I ran the agent, three bugs surfaced in the same session that I'd never seen before.**"

**Switch to terminal — 2:30 sharp.**

---

### Beat 4 · The three bugs (2:30 → 4:15) — *terminal*

Each bug: ~35 sec. Show the symptom, name the cause, show the fix file path. Keep it tight.

#### Bug 1 — Plan phase truncating mid-array (2:30 → 3:05)

> "Bug 1. I ran a richer project — Cape Cod cedar deck with cable railings. New code threw immediately:"

**Run:**
```bash
cat demo/bugs/01-plan-truncation.txt
```

> "Plan phase max_tokens was 4096. Truncated mid-array. The old code happily parsed the truncated JSON and produced a partial plan that I never noticed was missing 6 materials. Fix: bumped to 16000. That's `agent-worker/src/phases/plan.ts`."

#### Bug 2 — Synthesize burning iterations on URL probing (3:05 → 3:40)

> "Bug 2. Same run, next phase. Synthesize phase has `maxIterations: 3`. It was supposed to emit the report directly. New code threw 'phase ended without parsed_output'."

**Run:**
```bash
cat demo/bugs/02-synthesize-iteration-burn.txt
```

> "I'd given synthesize a `check_url_live` tool. It was using all 3 iterations checking URLs in the report's resources section — never reached the final emit. The old forced-finalization branch ran AFTER the loop, OUTSIDE the iteration cap. That extra call was producing the entire report. Fix: removed `check_url_live` from the agent's tool set. URL liveness is now a Promise.all post-hoc filter in code — `agent-worker/src/phases/synthesize.ts`."

#### Bug 3 — Cumulative input-token budget (3:40 → 4:15)

> "Bug 3. Different run. New code threw 'phase ended without parsed_output' at synthesize again — different cause."

**Run:**
```bash
cat demo/bugs/03-budget-exhaustion.txt
```

> "Cumulative input-token budget across phases was 250k. The price phase fetches 16 HD product pages at ~1.5MB each — Crawlbase returns the full HTML. By the time synthesize starts, budget is exhausted. Loop's first guard kicks the synthesize phase out before its first turn. Old forced-finalization ran outside this guard too. Fix: bumped to 1M, Sonnet's full context. `agent-worker/src/config.ts` — BUDGET.maxInputTokens."

**Pause. ~4:15.**

---

### Beat 5 · Takeaway (4:15 → 5:00) — *terminal, then browser*

> "One pattern across three bugs: every retry path I had was bypassing the normal budget and iteration controls. Each retry was a hidden working branch that masked the actual failure."

> "Takeaway: when an LLM-output retry path exists, log how often it fires. If 'often,' it's not a safety net — it's glaucoma. You're losing the signal that something's wrong."

> "API-guaranteed structured outputs make this whole class of code go away. Output_config.format + Zod, 30-minute migration, three weeks of latent bugs surfaced in one session."

**Screen:** browser tab → GitHub repo, full screen the URL bar so the address reads.

> "github dot com slash i a j six slash home dash project dash agent. Writeup is in the repo root. Find me after."

**End at 5:00.**

---

## Three things to memorize cold

1. **The exact line in the takeaway**: *"when an LLM-output retry path exists, log how often it fires. If 'often,' it's not a safety net — it's glaucoma."* Land that beat clean.
2. **The repo URL spoken out loud**: practice it. "github dot com slash i a j six slash home dash project dash agent."
3. **The transitions between beats**: 0:30, 1:30, 2:30, 4:15. Each transition is a single physical action — switch app, switch tab, run a command. Drill those four switches.

## Practice runs to do

- **Cold full run.** With the editor + terminal + browser already set up. Time yourself with a phone stopwatch. Target 4:45 — leaves buffer.
- **No-net version.** Unplug wifi, can you still do everything? (Yes if all files are local and you don't reload `/sample` mid-demo. Cache it first.)
- **Recovery rehearsal.** What if `cat demo/bugs/01-...` doesn't exist? You read the bug story from memory. What if the editor freezes? You switch to the terminal and `cat` the same files. Plan B for every beat is "describe instead of show."

## Q&A prep (if there's time)

Likely questions:
- **"What models?"** → Sonnet 4.6 for the agent loop and clarification; structured outputs work on 4.5+.
- **"Why not just use better tests?"** → Tests test the code paths you write. The bugs were in the paths the retry hid. Adding tests for the retry branch would have passed. The fix is removing the branch, not testing it.
- **"How do you handle cost?"** → Per-user daily cap (5 runs), global daily cap (75 runs), per-user concurrent (1, with a stale-run filter). Plus input-length caps to bound context stuffing. `functions/src/services/usage.ts`.
- **"How do you stream the agent live?"** → Agent writes step docs to Firestore. Frontend subscribes via `onSnapshot`. No SSE. No polling. Cloud Run on `--no-cpu-throttling` so the async runAgent keeps making progress after the 202 returns.
- **"Open source?"** → Yes, MIT, link's up there.
