export function buildLaborPrompt(category: string, zipCode: string): string {
  return `PHASE 3 — LABOR. You have tool access. Find professional labor cost ranges for this project.

Workflow:
1. Call fetch_cost_guide({ category: "${category}", zipCode: "${zipCode}", site: "any" }). It will fetch HomeAdvisor and Fixr in parallel and include a ZIP-derived regional multiplier.
2. If fewer than 2 sites return usable ranges, call fetch_url on a specific cost-guide URL you found via any prior tool or that is clearly canonical for this category.
3. Extract low/high USD ranges and compute ZIP-adjusted values using the regional multiplier from the tool result.

Output a single JSON object matching this shape. Respond with ONLY the JSON — no prose.

{
  "lowUsd": <zip-adjusted low>,
  "highUsd": <zip-adjusted high>,
  "nationalAverage": <if available>,
  "regionalMultiplier": <from tool>,
  "sources": [
    {
      "siteName": "HomeAdvisor",
      "url": "<exact URL from tool result>",
      "snippet": "<quote from tool result proving the numbers>",
      "fetchedAt": "<ISO date from tool result or now>"
    }
  ],
  "breakdown": [
    { "task": "demo + haul-away", "lowUsd": <n>, "highUsd": <n> },
    { "task": "rough framing", "lowUsd": <n>, "highUsd": <n> }
  ],
  "confidence": "high" | "medium" | "low"
}

Confidence rubric:
- "high": 2+ sources agree within 25%, ranges present on both.
- "medium": 1 source with a clear range, or 2 sources disagreeing 25-50%.
- "low": only a national average available, or sources disagree > 50%.

Output ONLY the JSON object.`;
}
