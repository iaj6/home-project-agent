export function buildFollowupPrompt(question: string): string {
  return `FOLLOWUP MODE. The user already has a generated report and is asking a scoped question:

"${question}"

Determine which parts of the existing report change and re-run only those. Typical patterns:
- "What if I use quartz instead?" → re-price only affected materials; recompute cost summary.
- "Can I skip the permit?" → update warnings + tasks only.
- "How much more for composite decking?" → swap relevant material entries; recompute subtotal.

Output a single JSON object:

{
  "scope": "pricing" | "tasks" | "text" | "full_rerun",
  "modifiedMaterials": [ /* MaterialItem objects to replace by id */ ],
  "addedWarnings": ["..."],
  "updatedTips": ["..."],
  "answer": "One paragraph directly answering the user's question."
}

If the scope is "full_rerun", only return { "scope": "full_rerun", "answer": "..." } and the orchestrator will start a fresh run.

Output ONLY the JSON.`;
}
