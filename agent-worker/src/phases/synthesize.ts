import type {
  ConfidenceReport,
  CostSummary,
  LaborEstimate,
  MaterialsList,
  PlanDraft,
  ProjectReport,
} from '@home-helper/shared';
import { buildSystemPrompt } from '../prompts/system';
import { buildSynthesizePrompt } from '../prompts/synthesize';
import { runPhase } from './loop';
import { checkUrlLiveTool } from '../tools';
import type { RunContext } from './context';
import type { Resource } from '@home-helper/shared';
import { enrichZip, formatEnrichmentForPrompt } from '../zip/enrichment';
import { searchYouTubeVideos } from '../services/youtube';
import { CATEGORIES } from '@home-helper/shared';
import { SynthesizeOutputSchema } from '../schemas/phase-outputs';
import type { z } from 'zod/v4';

type RawSynthesizeOutput = z.infer<typeof SynthesizeOutputSchema>;

const TRUSTED_DOMAINS = [
  'familyhandyman.com',
  'thisoldhouse.com',
  'finehomebuilding.com',
  'bobvila.com',
  'lowes.com',
  'homedepot.com',
];

function isTrustedUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return TRUSTED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
  } catch {
    return false;
  }
}

export async function runSynthesizePhase(
  ctx: RunContext,
  parts: { plan: PlanDraft; materials: MaterialsList; labor: LaborEstimate },
): Promise<ProjectReport> {
  const { plan, materials, labor } = parts;

  const unresolvedCount = materials.items.filter((i) => !i.resolved).length;
  const materialsSubtotal = materials.subtotal;
  const laborMid = (labor.lowUsd + labor.highUsd) / 2;

  const system = buildSystemPrompt({
    zipCode: ctx.zipCode,
    category: ctx.project.category,
    phase: 'synthesize',
  });

  const prompt = `You have everything needed to synthesize the final report.

== PLAN ==
${JSON.stringify(plan, null, 2)}

== PRICED MATERIALS ==
subtotal=$${materialsSubtotal.toFixed(2)}, unresolved=${unresolvedCount}, retailerMix=${JSON.stringify(materials.retailerMix)}
items:
${materials.items
  .map(
    (i) =>
      `- ${i.id} | ${i.name} | qty=${i.qty} | unitPrice=$${i.unitPrice} | total=$${i.totalPrice} | resolved=${i.resolved}${i.productUrl ? ` | url=${i.productUrl}` : ''}`,
  )
  .join('\n')}

== LABOR ==
${JSON.stringify(labor, null, 2)}

== CONTEXT ==
${formatEnrichmentForPrompt(enrichZip(ctx.zipCode))}
Materials subtotal: $${materialsSubtotal.toFixed(2)}
Labor midpoint (for proTotal reference): $${laborMid.toFixed(2)}

${buildSynthesizePrompt()}`;

  const result = await runPhase<RawSynthesizeOutput>(ctx, {
    phase: 'synthesize',
    systemPrompt: system,
    initialUserMessage: prompt,
    tools: [],
    maxIterations: 2,
    maxTokens: 6144,
    outputSchema: SynthesizeOutputSchema,
    cassetteLabel: 'synthesize',
  });

  if (!result.parsedOutput) {
    throw new Error('Synthesize phase produced no parsed report');
  }
  const raw = result.parsedOutput;

  const claudeResources = await filterLiveResources(
    (raw.resources ?? []).filter((r) => r.url && isTrustedUrl(r.url)),
    ctx,
  );

  // Post-hoc YouTube enrichment — one search.list call per run.
  // Use category-specific query (hand-tuned to disambiguate, e.g. "Deck Building"
  // → MTG/Clash Royale on YouTube without explicit "wood deck DIY" framing).
  const videoQuery =
    CATEGORIES[ctx.project.category]?.youtubeQuery ?? ctx.project.category;
  const videoResources = await searchYouTubeVideos(videoQuery, { maxResults: 4 });

  const filteredResources = [...videoResources, ...claudeResources];

  const report: ProjectReport = {
    projectId: ctx.projectId,
    summary: raw.summary,
    complexityScore: clamp(raw.complexityScore, 1, 10),
    diyFeasibilityScore: clamp(raw.diyFeasibilityScore, 1, 10),
    estimatedDuration: raw.estimatedDuration,
    tasks: raw.tasks,
    materials,
    labor,
    costSummary: normalizeCostSummary(raw.costSummary, materialsSubtotal, laborMid),
    resources: filteredResources,
    warnings: raw.warnings ?? [],
    tips: raw.tips ?? [],
    tradeoffs: raw.tradeoffs,
    confidence: normalizeConfidence(raw.confidence, materials, labor),
    generatedAt: new Date(),
    generatedByRunId: ctx.runId,
  };

  return report;
}

async function filterLiveResources(
  resources: Resource[],
  ctx: RunContext,
): Promise<Resource[]> {
  if (!resources.length) return [];
  const checks = await Promise.all(
    resources.map((r) =>
      checkUrlLiveTool
        .run(
          { url: r.url },
          { runId: ctx.runId, projectId: ctx.projectId, zipCode: ctx.zipCode },
        )
        .then((res) => res.live)
        .catch(() => false),
    ),
  );
  return resources.filter((_, i) => checks[i]);
}

export function clamp(n: number, lo: number, hi: number): number {
  if (typeof n !== 'number' || Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export function normalizeCostSummary(
  raw: Partial<CostSummary> | undefined,
  materialsSubtotal: number,
  laborMid: number,
): CostSummary {
  const diyTotal = raw?.diyTotal ?? materialsSubtotal;
  const proTotal = raw?.proTotal ?? Math.round(materialsSubtotal + laborMid);
  const savings = Math.max(0, proTotal - diyTotal);
  const savingsPercent = proTotal > 0 ? Math.round((savings / proTotal) * 100) : 0;
  return {
    diyTotal: Math.round(diyTotal),
    proTotal: Math.round(proTotal),
    savings: Math.round(savings),
    savingsPercent,
    assumptions: raw?.assumptions ?? [],
  };
}

export function normalizeConfidence(
  raw: Partial<ConfidenceReport> | undefined,
  materials: MaterialsList,
  labor: LaborEstimate,
): ConfidenceReport {
  const resolvedRatio =
    materials.items.length > 0
      ? materials.items.filter((i) => i.resolved).length / materials.items.length
      : 0;
  const materialsConf =
    raw?.materials ?? (resolvedRatio >= 0.8 ? 'high' : resolvedRatio >= 0.5 ? 'medium' : 'low');
  const laborConf = raw?.labor ?? labor.confidence;
  const order = { high: 3, medium: 2, low: 1 } as const;
  const overall =
    raw?.overall ??
    (order[materialsConf] <= order[laborConf] ? materialsConf : laborConf);
  return {
    materials: materialsConf,
    labor: laborConf,
    overall,
    caveats: raw?.caveats ?? [],
  };
}
