import { z } from 'zod';
import { fetchHomeDepot } from '../pricing/home-depot';
import { fetchLowes } from '../pricing/lowes';
import type { FetchRetailerOutput } from '../pricing/types';
import type { ToolDefinition } from './types';

const PricingInput = z.object({
  query: z.string().min(2),
  zipCode: z.string().min(5).max(10),
  maxResults: z.number().int().min(1).max(5).optional(),
});

const pricingSchema = {
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'Search term — be specific. Example: "pressure treated 2x6x8 lumber".',
    },
    zipCode: { type: 'string', description: 'US ZIP code for localized pricing.' },
    maxResults: { type: 'integer', minimum: 1, maximum: 5 },
  },
  required: ['query', 'zipCode'],
};

export const fetchHomeDepotSkuTool: ToolDefinition<
  z.infer<typeof PricingInput>,
  FetchRetailerOutput
> = {
  name: 'fetch_home_depot_sku',
  description:
    'Search Home Depot for a product near the given ZIP code. Returns up to N matching products with real SKUs, prices, and URLs. Use first for every material.',
  inputSchema: PricingInput,
  jsonSchema: pricingSchema,
  run: (input) => fetchHomeDepot(input),
};

export const fetchLowesSkuTool: ToolDefinition<
  z.infer<typeof PricingInput>,
  FetchRetailerOutput
> = {
  name: 'fetch_lowes_sku',
  description:
    "Search Lowe's for a product near the given ZIP code. Use as a fallback when Home Depot returns no matches.",
  inputSchema: PricingInput,
  jsonSchema: pricingSchema,
  run: (input) => fetchLowes(input),
};
