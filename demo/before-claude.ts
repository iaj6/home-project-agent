// ═════════════════════════════════════════════════════════════════════════
// PRE-MIGRATION VERSION (~60 lines now deleted).
//
// Pattern: "Output ONLY raw JSON" in the prompt + regex stripper + a
// forced-finalization retry branch. Looked defensive, was actually a
// silent failure-masking machine.
//
// This file is for the AI Tinkerers demo (Tuesday 2026-05-26). Not used
// in production. See agent-worker/src/util/claude.ts for the current
// structured-outputs version.
// ═════════════════════════════════════════════════════════════════════════

import { anthropic, AGENT_MODEL } from '../agent-worker/src/config';

// ─── The JSON extractor ──────────────────────────────────────────────
// "Find the first {, find the last }, JSON.parse between them."
// Tolerates markdown fences, leading prose, trailing prose.
// Tolerates truncated JSON in the worst possible way: by silently
// producing a *partial* object that looks valid until something asks
// for the missing tail.
export function extractJson<T>(text: string): T {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('Claude response did not contain JSON');
  }
  const jsonStr = trimmed.slice(jsonStart, jsonEnd + 1);
  return JSON.parse(jsonStr) as T;
}

// ─── The forced-finalization fallback ────────────────────────────────
// Called inside runPhase() when extractJson() throws on the initial
// response. Makes a SECOND call to Claude, this time outside the loop's
// iteration cap AND outside the cumulative token budget guard, begging
// it to emit JSON. Almost always "worked" — by hiding the underlying
// bug that caused the first response to be unparseable.
async function forceFinalize<T>(messages: any[], opts: any): Promise<T> {
  messages.push({
    role: 'user',
    content:
      "Stop calling tools. Emit the final JSON output now using only the " +
      "information you already have. Any items you were unable to resolve " +
      "should be included with resolved=false and a short unresolvedReason. " +
      "Respond with ONLY the JSON object — no prose.",
  });

  // NOTE the omissions vs. the main loop:
  //   - no iteration counter increment
  //   - no input-token budget check
  //   - no tool_choice constraint
  // This branch always ran, even when synthesize had already exhausted
  // its budget and would have failed loudly. That "always ran" is what
  // hid the three bugs.
  const forced = await anthropic.messages.create({
    model: AGENT_MODEL,
    max_tokens: opts.maxTokens, // same as parent — also too low, also masked
    system: opts.systemPrompt,
    messages,
  });

  const forcedText = (forced.content[0] as { type: 'text'; text: string }).text;
  try {
    return extractJson<T>(forcedText);
  } catch (err) {
    throw new Error(
      `Phase ${opts.phase} did not return valid JSON after forced ` +
      `finalization: ${err instanceof Error ? err.message : String(err)}\n` +
      `Got: ${forcedText.slice(0, 500)}`,
    );
  }
}

// ─── In runPhase()… ──────────────────────────────────────────────────
// The fallback was wired in like this (sketched):
//
//   if (opts.enforceJsonOutput) {
//     try {
//       parsedOutput = extractJson<T>(finalText);
//     } catch {
//       // The mask
//       parsedOutput = await forceFinalize<T>(messages, opts);
//     }
//   }
//
// What this hid, in production, for weeks:
//   1. max_tokens=4096 truncating the plan phase mid-array on richer
//      projects. The retry happened to emit a shorter (still truncated)
//      JSON that parsed.
//   2. Synthesize burning all 3 iterations on URL-liveness checks
//      instead of emitting the report. The retry made the extra call
//      that actually produced the report.
//   3. Cumulative input-token budget exhausted by the price phase
//      (1.5MB HD pages × 16). Synthesize never got a first turn in
//      the main loop; the retry was the entire synthesize output.
