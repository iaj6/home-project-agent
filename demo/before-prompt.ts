// ═════════════════════════════════════════════════════════════════════════
// PRE-MIGRATION VERSION of the price-phase prompt — every phase ended
// with a block like this. ~30% of every prompt's tokens were begging
// Claude to format right.
//
// The current code (agent-worker/src/prompts/price.ts) is much shorter.
// All the JSON-format guidance is gone, because the API guarantees it.
// ═════════════════════════════════════════════════════════════════════════

export function buildPricePromptOLD(zipCode: string): string {
  return `PHASE 2 — PRICE. (...workflow guidance elided for the demo...)

Output a single JSON object matching this shape. Respond with ONLY the
JSON — no prose.

{
  "items": [
    {
      "id": "<echo the plan material id>",
      "name": "<resolved product title OR generic name if unresolved>",
      "spec": "<spec from plan>",
      "qty": <number>,
      "unit": "<unit from plan>",
      "unitPrice": <number>,
      "totalPrice": <qty*unitPrice>,
      "sku": "<sku if resolved, else empty>",
      "productUrl": "<tool-returned url if resolved, else empty>",
      "imageUrl": "<optional>",
      "retailer": "home_depot" | "lowes" | null,
      "inStock": <boolean>,
      "confidence": "high" | "medium" | "low",
      "reasoning": "<one line>",
      "resolved": <boolean>,
      "unresolvedReason": "<required if resolved=false>"
    }
  ],
  "subtotal": <sum of totalPrice for resolved items>,
  "retailerMix": { "home_depot": <count>, "lowes": <count> },
  "zipCode": "${zipCode}"
}

Output formatting rules (HARD):
- Output ONLY the raw JSON object. NO markdown code fences, no \`\`\`json, no prose.
- Keep the optional "reasoning" field to ONE short sentence per item. The
  "spec" field can echo back the plan's spec verbatim — don't rewrite it.
- If you have many items (10+), bias toward terseness in every string
  field; the JSON must fit in your output budget.`;
}

// ─── Reality check ──────────────────────────────────────────────────
// Claude complied most of the time. When it didn't (markdown fence,
// trailing prose, truncation mid-array), the regex stripper in
// before-claude.ts caught the first two. The third was caught by the
// forced-finalization branch. Three different defenses for one class
// of problem.
//
// All three are gone now. The API does the work.
