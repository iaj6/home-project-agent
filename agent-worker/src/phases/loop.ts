import type Anthropic from '@anthropic-ai/sdk';
import type { ZodType } from 'zod/v4';
import { AGENT_MODEL, BUDGET, modelCost } from '../config';
import { callClaude, extractText, extractToolUses } from '../util/claude';
import { finalizeStep, updateAgentRun, writeStep } from '../firestore';
import type { AgentPhase } from '@home-advisor/shared';
import type { RunContext } from './context';
import type { ToolDefinition } from '../tools/types';

type ToolResultBlock = Anthropic.Messages.ToolResultBlockParam;
type MessageParam = Anthropic.Messages.MessageParam;

export interface RunPhaseOptions<T> {
  phase: AgentPhase;
  systemPrompt: string;
  initialUserMessage: string;
  tools: ToolDefinition<unknown, unknown>[];
  maxIterations?: number;
  maxTokens?: number;
  /** Zod schema constraining the final JSON output via output_config.format. */
  outputSchema?: ZodType<T>;
  cassetteLabel?: string;
}

export interface PhaseRunResult<T> {
  parsedOutput?: T;
  finalText: string;
  tokensIn: number;
  tokensOut: number;
  iterations: number;
}

function toolsJsonSchema(
  tools: ToolDefinition<unknown, unknown>[],
): Anthropic.Messages.Tool[] {
  return tools.map(
    (t): Anthropic.Messages.Tool => ({
      name: t.name,
      description: t.description,
      input_schema: t.jsonSchema as Anthropic.Messages.Tool['input_schema'],
    }),
  );
}

export async function runPhase<T>(
  ctx: RunContext,
  opts: RunPhaseOptions<T>,
): Promise<PhaseRunResult<T>> {
  const messages: MessageParam[] = [
    { role: 'user', content: opts.initialUserMessage },
  ];
  const tools = toolsJsonSchema(opts.tools);
  const toolByName = Object.fromEntries(opts.tools.map((t) => [t.name, t]));
  const maxIter = opts.maxIterations ?? 8;
  const maxTokens = opts.maxTokens ?? 4096;

  let tokensIn = 0;
  let tokensOut = 0;
  let finalText = '';
  let iterations = 0;
  let parsedOutput: T | undefined;

  for (let i = 0; i < maxIter; i++) {
    iterations = i + 1;

    if (ctx.tokenTally.toolCalls >= BUDGET.maxToolCalls) {
      ctx.budgetExhausted = true;
      break;
    }
    if (ctx.tokenTally.inputTokens >= BUDGET.maxInputTokens) {
      ctx.budgetExhausted = true;
      break;
    }

    const callKey = {
      phase: opts.phase,
      iter: i,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    const step = await writeStep(ctx.runId, {
      kind: 'think',
      phase: opts.phase,
      summary: `Claude turn ${i + 1}`,
    });

    const claude = await callClaude<T>(
      {
        model: AGENT_MODEL,
        max_tokens: maxTokens,
        system: opts.systemPrompt,
        messages,
        tools: tools.length ? tools : undefined,
      },
      {
        cassetteLabel: `${opts.cassetteLabel ?? opts.phase}-turn${i}`,
        cassetteKey: callKey,
        outputSchema: opts.outputSchema,
      },
    );

    tokensIn += claude.inputTokens;
    tokensOut += claude.outputTokens;
    ctx.tokenTally.inputTokens += claude.inputTokens;
    ctx.tokenTally.outputTokens += claude.outputTokens;
    ctx.tokenTally.estimatedCostUsd += modelCost(
      claude.inputTokens,
      claude.outputTokens,
      claude.model,
    );

    await finalizeStep(ctx.runId, step.id, {
      durationMs: claude.durationMs,
      inputTokens: claude.inputTokens,
      outputTokens: claude.outputTokens,
      summary: `Claude turn ${i + 1} — stop=${claude.message.stop_reason ?? '?'}`,
    });

    await updateAgentRun(ctx.runId, {
      totalInputTokens: ctx.tokenTally.inputTokens,
      totalOutputTokens: ctx.tokenTally.outputTokens,
      toolCallCount: ctx.tokenTally.toolCalls,
      estimatedCostUsd: ctx.tokenTally.estimatedCostUsd,
    });

    const toolUses = extractToolUses(claude.message);
    const text = extractText(claude.message);

    // Always record assistant content (text + tool_use blocks) in history.
    messages.push({ role: 'assistant', content: claude.message.content });

    if (claude.message.parsed_output != null) {
      parsedOutput = claude.message.parsed_output;
    }

    if (claude.message.stop_reason === 'end_turn' || toolUses.length === 0) {
      finalText = text;
      break;
    }

    if (claude.message.stop_reason === 'tool_use') {
      const toolResults: ToolResultBlock[] = [];
      for (const use of toolUses) {
        ctx.tokenTally.toolCalls++;
        const tool = toolByName[use.name];
        const callStep = await writeStep(ctx.runId, {
          kind: 'tool_call',
          phase: opts.phase,
          tool: use.name,
          input: use.input,
          summary: `${use.name}(${summarizeInput(use.input)})`,
        });
        const t0 = Date.now();
        let output: unknown;
        let error: string | undefined;
        try {
          if (!tool) throw new Error(`unknown tool: ${use.name}`);
          const parsed = tool.inputSchema.parse(use.input);
          output = await tool.run(parsed, {
            runId: ctx.runId,
            projectId: ctx.projectId,
            zipCode: ctx.zipCode,
          });
        } catch (err: unknown) {
          error = err instanceof Error ? err.message : String(err);
          output = { error };
        }
        const durationMs = Date.now() - t0;
        await finalizeStep(ctx.runId, callStep.id, {
          durationMs,
          kind: 'tool_result',
          output,
          errorMessage: error,
          summary: error
            ? `${use.name} failed: ${error}`
            : `${use.name} → ${summarizeOutput(output)}`,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: use.id,
          content: typeof output === 'string' ? output : JSON.stringify(output),
          is_error: !!error,
        });
      }

      messages.push({ role: 'user', content: toolResults });
      continue;
    }

    // Unknown stop reason — bail out with what we have.
    finalText = text;
    break;
  }

  if (opts.outputSchema && parsedOutput == null) {
    throw new Error(
      `Phase ${opts.phase} ended without parsed_output. stop_reason may indicate refusal or max_tokens; finalText=${finalText.slice(0, 300)}`,
    );
  }

  return {
    parsedOutput,
    finalText,
    tokensIn,
    tokensOut,
    iterations,
  };
}

function summarizeInput(input: unknown): string {
  try {
    const s = JSON.stringify(input);
    return s.length > 80 ? s.slice(0, 77) + '...' : s;
  } catch {
    return '?';
  }
}

function summarizeOutput(output: unknown): string {
  if (output && typeof output === 'object') {
    const o = output as Record<string, unknown>;
    if (Array.isArray(o.products)) return `${(o.products as unknown[]).length} products`;
    if (Array.isArray(o.sites)) return `${(o.sites as unknown[]).length} sites`;
    if (typeof o.status === 'number') return `status=${o.status}`;
    if (typeof o.live === 'boolean') return `live=${o.live}`;
  }
  return 'ok';
}
