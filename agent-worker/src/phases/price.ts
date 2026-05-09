import type { MaterialsList, PlanDraft } from '@home-helper/shared';
import { buildSystemPrompt } from '../prompts/system';
import { buildPricePrompt } from '../prompts/price';
import { runPhase } from './loop';
import type { RunContext } from './context';
import { fetchHomeDepotSkuTool } from '../tools';
import { PriceOutputSchema } from '../schemas/phase-outputs';
import type { z } from 'zod/v4';

type RawPriceOutput = z.infer<typeof PriceOutputSchema>;

export async function runPricePhase(
  ctx: RunContext,
  plan: PlanDraft,
): Promise<MaterialsList> {
  const system = buildSystemPrompt({
    zipCode: ctx.zipCode,
    category: ctx.project.category,
    phase: 'price',
  });

  const prompt = `Priced materials list wanted. Work through the planned materials below one by one.

Planned materials:
${plan.materials.map((m) => `- id=${m.id} | ${m.genericName} | spec="${m.spec}" | qty=${m.qty} ${m.unit} | reasoning: ${m.reasoning}`).join('\n')}

${buildPricePrompt(ctx.zipCode)}`;

  const result = await runPhase<RawPriceOutput>(ctx, {
    phase: 'price',
    systemPrompt: system,
    initialUserMessage: prompt,
    tools: [fetchHomeDepotSkuTool as never],
    maxIterations: 12,
    maxTokens: 16000,
    outputSchema: PriceOutputSchema,
    cassetteLabel: 'price',
  });

  if (!result.parsedOutput) {
    throw new Error('Price phase produced no parsed materials list');
  }

  const raw = result.parsedOutput;
  const resolvedItems = raw.items.map((item) => ({
    id: item.id,
    name: item.name,
    spec: item.spec,
    qty: item.qty,
    unit: item.unit,
    unitPrice: item.unitPrice ?? 0,
    totalPrice: item.totalPrice ?? item.qty * (item.unitPrice ?? 0),
    sku: item.sku,
    productUrl: item.productUrl,
    imageUrl: item.imageUrl,
    retailer: item.retailer ?? undefined,
    inStock: !!item.inStock,
    confidence: item.confidence,
    reasoning: item.reasoning,
    resolved: !!item.resolved,
    unresolvedReason: item.unresolvedReason,
  }));

  const subtotal = resolvedItems
    .filter((i) => i.resolved)
    .reduce((sum, i) => sum + i.totalPrice, 0);

  return {
    items: resolvedItems,
    subtotal,
    retailerMix: {
      home_depot: raw.retailerMix?.home_depot ?? 0,
      lowes: raw.retailerMix?.lowes ?? 0,
    },
    zipCode: ctx.zipCode,
    fetchedAt: new Date(),
  };
}
