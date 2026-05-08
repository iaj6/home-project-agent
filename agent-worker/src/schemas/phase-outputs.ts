import { z } from 'zod/v4';

const Difficulty = z.enum(['easy', 'moderate', 'hard']);
const Confidence = z.enum(['high', 'medium', 'low']);

const Task = z.object({
  name: z.string(),
  description: z.string(),
  estimatedHours: z.number(),
  difficulty: Difficulty,
  requiresPermit: z.boolean(),
  order: z.number(),
}).strict();

const PlannedMaterial = z.object({
  id: z.string(),
  genericName: z.string(),
  spec: z.string(),
  qty: z.number(),
  unit: z.string(),
  reasoning: z.string(),
}).strict();

export const PlanDraftSchema = z.object({
  summary: z.string(),
  complexityScore: z.number(),
  diyFeasibilityScore: z.number(),
  estimatedDuration: z.string(),
  tasks: z.array(Task),
  materials: z.array(PlannedMaterial),
  laborCategory: z.string(),
  openQuestions: z.array(z.string()),
}).strict();

const PricedItem = z.object({
  id: z.string(),
  name: z.string(),
  spec: z.string().optional(),
  qty: z.number(),
  unit: z.string().optional(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  sku: z.string().optional(),
  productUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  retailer: z.enum(['home_depot', 'lowes']).nullable().optional(),
  inStock: z.boolean(),
  confidence: Confidence,
  reasoning: z.string().optional(),
  resolved: z.boolean(),
  unresolvedReason: z.string().optional(),
}).strict();

export const PriceOutputSchema = z.object({
  items: z.array(PricedItem),
  subtotal: z.number(),
  retailerMix: z.object({
    home_depot: z.number(),
    lowes: z.number(),
  }).strict(),
  zipCode: z.string(),
}).strict();

const LaborSource = z.object({
  siteName: z.string(),
  url: z.string(),
  snippet: z.string(),
  fetchedAt: z.string().optional(),
}).strict();

const LaborBreakdown = z.object({
  task: z.string(),
  lowUsd: z.number(),
  highUsd: z.number(),
}).strict();

export const LaborOutputSchema = z.object({
  lowUsd: z.number(),
  highUsd: z.number(),
  nationalAverage: z.number().optional(),
  regionalMultiplier: z.number().optional(),
  sources: z.array(LaborSource),
  breakdown: z.array(LaborBreakdown).optional(),
  confidence: Confidence,
}).strict();

const Resource = z.object({
  title: z.string(),
  url: z.string(),
  type: z.enum(['video', 'article', 'tool', 'product']),
}).strict();

const Tradeoffs = z.object({
  quality: z.string(),
  time: z.string(),
  money: z.string(),
  recommendation: z.string().optional(),
}).strict();

const CostSummary = z.object({
  diyTotal: z.number(),
  proTotal: z.number(),
  savings: z.number(),
  savingsPercent: z.number(),
  assumptions: z.array(z.string()),
}).strict();

const ConfidenceReport = z.object({
  materials: Confidence,
  labor: Confidence,
  overall: Confidence,
  caveats: z.array(z.string()),
}).strict();

export const SynthesizeOutputSchema = z.object({
  summary: z.string(),
  complexityScore: z.number(),
  diyFeasibilityScore: z.number(),
  estimatedDuration: z.string(),
  tasks: z.array(Task),
  resources: z.array(Resource),
  warnings: z.array(z.string()),
  tips: z.array(z.string()),
  tradeoffs: Tradeoffs.optional(),
  costSummary: CostSummary,
  confidence: ConfidenceReport,
}).strict();
