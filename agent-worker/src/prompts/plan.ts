export function buildPlanPrompt(category: string): string {
  return `PHASE 1 — PLAN. You do NOT have tool access in this phase. Reason purely from the project spec and conversation context to produce a structured plan.

Output a single JSON object matching this shape. Respond with ONLY the JSON — no surrounding prose.

{
  "summary": "2-3 sentence project description in plain language",
  "complexityScore": 1-10,
  "diyFeasibilityScore": 1-10,
  "estimatedDuration": "human-readable duration, e.g. '2-3 weekends'",
  "tasks": [
    {
      "name": "short title",
      "description": "what the task entails",
      "estimatedHours": <number>,
      "difficulty": "easy" | "moderate" | "hard",
      "requiresPermit": <boolean>,
      "order": <1-based index>
    }
  ],
  "materials": [
    {
      "id": "mat-{n}",
      "genericName": "pressure-treated 2x6x8 lumber",
      "spec": "specific dimensions / grade / count constraints",
      "qty": <integer>,
      "unit": "each | ft | lb | bag | sheet",
      "reasoning": "why this qty for this project"
    }
  ],
  "laborCategory": "${category}",
  "openQuestions": ["anything you wish you could ask the user next"]
}

Guidelines:
- Produce 3-8 tasks and 6-25 materials. Bias toward concrete, shoppable items.
- genericName is the text the next phase will type into Home Depot's search bar — it MUST be short (3-6 words), consumer-friendly, and free of treatment codes, brand model numbers, and "lumber"/"board" filler. "pressure treated 2x6x8" is good; "pressure-treated 2x6x8 lumber ACQ UC3B above ground" is bad.
- Use the "spec" field for the technical detail Claude needs to pick the right match (treatment codes, exact grades, minimum ratings) — but it will NOT be used as a search term.
- Use conservative quantity estimates; note waste factors in "reasoning".
- Score complexity/DIY feasibility on a 1-10 scale where 10 = hard.

Example of a good materials line for a deck build:
{
  "id": "mat-3",
  "genericName": "pressure treated 2x6x8",
  "spec": "ACQ or MCA-treated, ground-contact rated, #2 grade or better",
  "qty": 24,
  "unit": "each",
  "reasoning": "Joists for 12x16 deck spaced 16in O.C. plus 10% waste."
}

Output ONLY the JSON object.`;
}
