import type { PlanDraft } from '@home-helper/shared';
import { buildSystemPrompt } from '../prompts/system';
import { buildPlanPrompt } from '../prompts/plan';
import { runPhase } from './loop';
import type { RunContext } from './context';
import { getConversationHistory } from './history';
import { PlanDraftSchema } from '../schemas/phase-outputs';
import { enrichZip, formatEnrichmentForPrompt } from '../zip/enrichment';

export async function runPlanPhase(ctx: RunContext): Promise<PlanDraft> {
  const history = await getConversationHistory(ctx.projectId);
  const system = buildSystemPrompt({
    zipCode: ctx.zipCode,
    category: ctx.project.category,
    phase: 'plan',
    messageHistory: history,
  });

  const instruction = buildPlanPrompt(ctx.project.category);

  const enrichment = enrichZip(ctx.zipCode);
  const userPrompt = `Project spec:
- Title: ${ctx.project.title}
- Category: ${ctx.project.category}
- Description: ${ctx.project.description}
- Budget: ${ctx.project.budget ? `$${ctx.project.budget}` : 'not specified'}
- Timeline: ${ctx.project.timeline ?? 'not specified'}
- Experience: ${ctx.project.experienceLevel ?? 'not specified'}

Location facts (derived from ZIP — treat as authoritative for state, frost depth, and climate band):
${formatEnrichmentForPrompt(enrichment)}

${instruction}`;

  const result = await runPhase<PlanDraft>(ctx, {
    phase: 'plan',
    systemPrompt: system,
    initialUserMessage: userPrompt,
    tools: [],
    maxIterations: 2,
    maxTokens: 16000,
    outputSchema: PlanDraftSchema,
    cassetteLabel: 'plan',
  });

  if (!result.parsedOutput) {
    throw new Error('Plan phase produced no parsed plan');
  }
  return result.parsedOutput;
}
