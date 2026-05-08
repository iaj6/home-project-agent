export function buildPricePrompt(zipCode: string): string {
  return `PHASE 2 — PRICE. You have tool access. For each generic material in the plan, try to find a real SKU at ${zipCode}. It is OK — and expected — that some items will not resolve.

Workflow per material:
1. Call fetch_home_depot_sku with a short, consumer-friendly search query (see query rules below).
2. Pick the first product that plausibly matches the spec. Record sku, unitPrice, productUrl, inStock, and a one-line reasoning ("matches 2x6x8 PT spec").
3. If HD returns no plausible match, mark the material unresolved with unresolvedReason. DO NOT keep retrying.

Query construction rules (this is the #1 thing that went wrong in testing):
- Use 3-6 words. Consumer-friendly search terms, like a homeowner would type.
- GOOD: "pressure treated 2x6x8", "deck screws 3 inch", "joist hanger 2x10", "concrete tube form 12 inch", "fast setting concrete 80 lb".
- BAD: "pressure treated 2x6x8 lumber ACQ above ground UC3B", "5/4x6x16 radius edge decking", "Simpson LUS210 joist hanger 2x10 single galvanized".
- Do NOT include treatment codes (ACQ, UC3B, UC4B, etc.), "above ground", "radius edge", exact brand model numbers, or "lumber"/"board" as extra words.
- Use dimensions as "2x6x8" or "2x6x8 ft", not "2 in x 6 in x 8 ft".
- For fractions, use the bare form ("5/4x6x16" → "5/4 x 6 x 16" is fine) — but drop the fraction entirely on retry if it fails.

Retry rule: if a material's first query returned zero products, try ONE simplified variant (drop brand, drop qualifier). If that also fails, mark unresolved and move on.

Lumber length consolidation (IMPORTANT):
- For dimensional lumber and decking (PT, cedar, redwood, composite), prefer ONE canonical SKU per material spec, not a separate query per length.
- Example: a deck needs 12 boards of cedar 5/4x6x8 and 18 boards of cedar 5/4x6x16. Issue ONE query — "cedar 5/4x6 decking" or "cedar 5/4x6x16 decking" — pick a price, and apply that unit price across both lengths.
- If the plan has split a material into per-length items, consolidate them: pick the longest length your search returns and use that unit price; record the consolidation in the reasoning ("priced at 16ft length; shorter lengths typically cost slightly less").
- Rationale: shorter cedar/specialty lengths are often special-order or out-of-stock at HD even when the longer length is fully stocked. Splitting by length leaves real materials priced at $0 in the report.

Budget rules:
- You have roughly 12 tool-calling turns for this whole phase. Issue multiple fetch_home_depot_sku calls in a single turn to parallelize.
- NEVER call a tool more than 2 times for the same material id.
- If the retailer returns a bot-challenge warning, mark that attempt's items as unresolved with reason "retailer blocked"; don't retry the blocked retailer.

Finalization rule (IMPORTANT):
- After at most 2-3 turns of tool calls, emit the final JSON object below, with unresolved items clearly flagged.
- Do NOT keep looping hoping one more tool call will resolve something. A report with half the items unresolved is fine — a crash is not.
- If you have ANY resolved items by your final turn, emit the JSON. Unresolved items do not block the report.

Output a single JSON object matching this shape. Respond with ONLY the JSON — no prose.

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
      "retailer": "home_depot" | null,
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

Confidence rubric per item:
- "high": retailer returned >= 2 matching products; your chosen match is exact on spec.
- "medium": retailer returned 1 match or match on name but not full spec.
- "low": match via weak title similarity, or stock/availability unclear.

Output formatting rules (HARD):
- Output ONLY the raw JSON object. NO markdown code fences, no \`\`\`json, no prose.
- Keep the optional "reasoning" field to ONE short sentence per item. The "spec" field can echo back the plan's spec verbatim — don't rewrite it.
- If you have many items (10+), bias toward terseness in every string field; the JSON must fit in your output budget.`;
}
