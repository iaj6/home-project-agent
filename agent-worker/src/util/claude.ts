import { anthropic, AGENT_MODEL } from '../config';
import { through } from '../cassette/cassette';
import type Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { ZodType } from 'zod/v4';
import { log } from './logger';

function getCassetteMode(): 'off' | 'record' | 'replay' {
  const raw = process.env.CASSETTE_MODE ?? (process.env.NODE_ENV === 'test' ? 'replay' : 'off');
  if (raw === 'off' || raw === 'record' || raw === 'replay') return raw;
  return 'off';
}

type MessageCreateParams = Anthropic.Messages.MessageCreateParamsNonStreaming;
type Message = Anthropic.Messages.Message;

export interface ClaudeCallResult<P = unknown> {
  message: Message & { parsed_output?: P | null };
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

export async function callClaude<P = unknown>(
  params: MessageCreateParams,
  opts: {
    cassetteLabel?: string;
    cassetteKey?: unknown;
    outputSchema?: ZodType<P>;
  } = {},
): Promise<ClaudeCallResult<P>> {
  const key = opts.cassetteKey ?? {
    model: params.model,
    system: params.system,
    messages: params.messages,
    tools: (params as { tools?: unknown }).tools,
    max_tokens: params.max_tokens,
    outputSchema: opts.outputSchema ? 'present' : undefined,
  };

  const runReal = async (): Promise<ClaudeCallResult<P>> => {
    const t0 = Date.now();
    if (opts.outputSchema) {
      // SDK helper's .d.ts uses v3 ZodType; the runtime imports zod/v4 — cast bridges that.
      const format = zodOutputFormat(opts.outputSchema as never);
      const response = await anthropic.messages.parse({
        ...params,
        stream: false,
        output_config: { format },
      });
      const durationMs = Date.now() - t0;
      return {
        message: response as Message & { parsed_output?: P | null },
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: params.model ?? AGENT_MODEL,
        durationMs,
      };
    }
    const response = await anthropic.messages.create({
      ...params,
      stream: false,
    });
    const durationMs = Date.now() - t0;
    return {
      message: response,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: params.model ?? AGENT_MODEL,
      durationMs,
    };
  };

  if (getCassetteMode() === 'off') return runReal();

  const result = await through('claude', key, runReal, {
    label: opts.cassetteLabel ?? 'claude-call',
  });
  log.debug('claude call', {
    model: result.model,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  });
  return result;
}

export function extractText(msg: Message): string {
  const parts: string[] = [];
  for (const block of msg.content) {
    if (block.type === 'text') parts.push(block.text);
  }
  return parts.join('\n');
}

export function extractToolUses(msg: Message): Array<{
  id: string;
  name: string;
  input: unknown;
}> {
  const uses: Array<{ id: string; name: string; input: unknown }> = [];
  for (const block of msg.content) {
    if (block.type === 'tool_use') {
      uses.push({ id: block.id, name: block.name, input: block.input });
    }
  }
  return uses;
}

