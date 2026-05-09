import type { LaborEstimate, PlanDraft } from '@home-helper/shared';
import { buildSystemPrompt } from '../prompts/system';
import { buildLaborPrompt } from '../prompts/labor';
import { runPhase } from './loop';
import type { RunContext } from './context';
import { fetchCostGuideTool, fetchUrlTool } from '../tools';
import { LaborOutputSchema } from '../schemas/phase-outputs';
import type { z } from 'zod/v4';

type RawLaborOutput = z.infer<typeof LaborOutputSchema>;

export async function runLaborPhase(
  ctx: RunContext,
  plan: PlanDraft,
): Promise<LaborEstimate> {
  const system = buildSystemPrompt({
    zipCode: ctx.zipCode,
    category: ctx.project.category,
    phase: 'labor',
  });

  const prompt = `Project category: ${ctx.project.category}. Region derived from ZIP ${ctx.zipCode}.

Plan snapshot (for scale): ${plan.tasks.length} tasks, ${plan.materials.length} materials. Summary: ${plan.summary}

${buildLaborPrompt(plan.laborCategory || ctx.project.category, ctx.zipCode)}`;

  const result = await runPhase<RawLaborOutput>(ctx, {
    phase: 'labor',
    systemPrompt: system,
    initialUserMessage: prompt,
    tools: [fetchCostGuideTool as never, fetchUrlTool as never],
    maxIterations: 6,
    maxTokens: 4096,
    outputSchema: LaborOutputSchema,
    cassetteLabel: 'labor',
  });

  if (!result.parsedOutput) {
    throw new Error('Labor phase produced no parsed estimate');
  }

  const raw = result.parsedOutput;
  return {
    lowUsd: raw.lowUsd,
    highUsd: raw.highUsd,
    nationalAverage: raw.nationalAverage,
    regionalMultiplier: raw.regionalMultiplier,
    sources: raw.sources.map((s) => ({
      siteName: s.siteName,
      url: s.url,
      snippet: s.snippet,
      fetchedAt: s.fetchedAt ? new Date(s.fetchedAt) : new Date(),
    })),
    breakdown: raw.breakdown,
    confidence: raw.confidence,
  };
}
