import { fetchUrlTool } from './fetch-url';
import { checkUrlLiveTool } from './check-url-live';
import { fetchHomeDepotSkuTool, fetchLowesSkuTool } from './pricing-tools';
import { fetchCostGuideTool } from './cost-guide';
import type { ToolDefinition } from './types';

// Lowe's tool stays exported but is not registered in ALL_TOOLS — Crawlbase 520s on
// lowes.com search. Re-add to enable.
export const ALL_TOOLS: ToolDefinition<unknown, unknown>[] = [
  fetchUrlTool,
  checkUrlLiveTool,
  fetchHomeDepotSkuTool,
  fetchCostGuideTool,
] as ToolDefinition<unknown, unknown>[];

export const TOOLS_BY_NAME: Record<string, ToolDefinition<unknown, unknown>> = Object.fromEntries(
  ALL_TOOLS.map((t) => [t.name, t]),
);

export {
  fetchUrlTool,
  checkUrlLiveTool,
  fetchHomeDepotSkuTool,
  fetchLowesSkuTool,
  fetchCostGuideTool,
};
