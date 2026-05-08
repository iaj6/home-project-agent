export type Confidence = 'high' | 'medium' | 'low';

export type Retailer = 'home_depot' | 'lowes';

export interface TaskItem {
  name: string;
  description: string;
  estimatedHours: number;
  difficulty: 'easy' | 'moderate' | 'hard';
  requiresPermit: boolean;
  order: number;
}

export interface MaterialItem {
  id: string;
  name: string;
  spec?: string;
  qty: number;
  unit?: string;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  productUrl?: string;
  imageUrl?: string;
  retailer?: Retailer;
  inStock: boolean;
  confidence: Confidence;
  reasoning?: string;
  resolved: boolean;
  unresolvedReason?: string;
}

export interface MaterialsList {
  items: MaterialItem[];
  subtotal: number;
  retailerMix: Record<Retailer, number>;
  zipCode: string;
  fetchedAt: Date;
}

export interface CostSource {
  siteName: string;
  url: string;
  snippet: string;
  fetchedAt: Date;
}

export interface LaborLine {
  task: string;
  lowUsd: number;
  highUsd: number;
}

export interface LaborEstimate {
  lowUsd: number;
  highUsd: number;
  nationalAverage?: number;
  regionalMultiplier?: number;
  sources: CostSource[];
  breakdown?: LaborLine[];
  confidence: Confidence;
}

export interface CostSummary {
  diyTotal: number;
  proTotal: number;
  savings: number;
  savingsPercent: number;
  assumptions: string[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'tool' | 'product';
  /** Populated for type='video' from YouTube enrichment. */
  videoId?: string;
  /** Thumbnail URL (videos: from YouTube; articles: optional og:image-style). */
  thumbnail?: string;
  /** Channel/author display name (videos: YouTube channelTitle). */
  source?: string;
  /** View count for videos — used as a quality signal in UI. */
  viewCount?: number;
}

export interface ConfidenceReport {
  materials: Confidence;
  labor: Confidence;
  overall: Confidence;
  caveats: string[];
}

export interface Tradeoffs {
  quality: string;
  time: string;
  money: string;
  recommendation?: string;
}

export interface ProjectReport {
  projectId: string;
  summary: string;
  complexityScore: number;
  diyFeasibilityScore: number;
  estimatedDuration: string;

  tasks: TaskItem[];
  materials: MaterialsList;
  labor: LaborEstimate;
  costSummary: CostSummary;
  resources: Resource[];
  warnings: string[];
  tips: string[];
  tradeoffs?: Tradeoffs;

  confidence: ConfidenceReport;
  generatedAt: Date;
  generatedByRunId: string;
}
