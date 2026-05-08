import type { z } from 'zod';

export interface ToolDefinition<I, O> {
  name: string;
  description: string;
  inputSchema: z.ZodTypeAny;
  jsonSchema: Record<string, unknown>;
  run: (input: I, ctx: ToolRunContext) => Promise<O>;
}

export interface ToolRunContext {
  runId: string;
  projectId: string;
  zipCode: string;
}

export interface ToolBundle {
  [name: string]: ToolDefinition<unknown, unknown>;
}
