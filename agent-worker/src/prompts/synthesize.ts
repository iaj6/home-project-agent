export function buildSynthesizePrompt(): string {
  return `PHASE 4 — SYNTHESIZE. You do NOT have tool access in this phase. Produce the final ProjectReport JSON using the plan, materials list, and labor estimate already assembled.

You are given:
- The project spec and clarification conversation
- The plan (tasks + materials skeleton)
- The priced materials list (with resolved items and unresolved items)
- The labor estimate (with sources)

Output a single JSON object matching this exact shape. Respond with ONLY the JSON — no prose.

{
  "summary": "2-3 sentence project overview",
  "complexityScore": 1-10,
  "diyFeasibilityScore": 1-10,
  "estimatedDuration": "e.g. '2-3 weekends'",
  "tasks": [ { "name", "description", "estimatedHours", "difficulty", "requiresPermit", "order" } ],
  "resources": [
    { "title": "...", "url": "https://familyhandyman.com/...", "type": "article" | "video" | "tool" | "product" }
  ],
  "warnings": ["safety and code warnings, at least one"],
  "tips": ["practical DIY tips, 2+"],
  "tradeoffs": {
    "quality": "1-2 sentences on the quality axis",
    "time": "1-2 sentences on time tradeoffs",
    "money": "1-2 sentences on money tradeoffs",
    "recommendation": "a one-sentence opinion tailored to the user"
  },
  "costSummary": {
    "diyTotal": <number; typically the materials subtotal>,
    "proTotal": <number; materials subtotal + labor midpoint, or labor only if pro supplies>,
    "savings": <diy savings vs pro>,
    "savingsPercent": <number 0-100>,
    "assumptions": ["Assumes you already own a miter saw", "..."]
  },
  "confidence": {
    "materials": "high" | "medium" | "low",
    "labor": "high" | "medium" | "low",
    "overall": "high" | "medium" | "low",
    "caveats": ["3+ specific caveats that drove the confidence scoring"]
  }
}

Rules:
- resources: use only URLs that appear in your tool call history from prior phases, OR stable, high-confidence domain roots (familyhandyman.com, thisoldhouse.com, finehomebuilding.com, bobvila.com, lowes.com, homedepot.com). Never fabricate deep article URLs you are not confident about. Prefer an empty resources array over a fabricated one.
- Set overall confidence = min(materials, labor) unless one section is dramatically worse.
- In assumptions and caveats, name actual open questions from the plan + concrete reasons ("33% of materials unresolved due to retailer block").
- warnings must include at least one safety/code warning; never say "this meets code".

Location & permits — what to claim vs. hedge:
- You MAY rely on the ZIP-derived location facts (state, frost depth, climate band, coastal flag) provided in the CONTEXT block — those are authoritative.
- You MAY mention well-known regional patterns (frost-depth footings, hurricane uplift in FL/Gulf, snow load in northern states, conservation-commission review in coastal MA, etc.).
- You MUST NOT invent: specific permit URLs, specific permit fees, specific code chapter numbers, or the exact name of a small town's building department. If you don't know whether a town has its own building dept vs. uses the county, write "your local building department" or "your municipal building inspector" — generic phrasing is correct here.
- For permits: it's fine to say "a building permit is typically required for X over Y inches off ground" but tell the reader to confirm with their local building department; do not assert a specific fee or form number.
- Tasks that mention a permit should set requiresPermit=true and describe the permit category in plain English ("structural permit for a deck attached to the house"), not a code chapter.

Output ONLY the JSON object.`;
}
