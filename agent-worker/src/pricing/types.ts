import type { Retailer } from '@home-advisor/shared';

export interface RetailerProduct {
  retailer: Retailer;
  name: string;
  sku: string;
  unitPrice: number;
  productUrl: string;
  imageUrl?: string;
  inStock: boolean;
  matchReasoning?: string;
}

export interface FetchRetailerInput {
  query: string;
  zipCode: string;
  maxResults?: number;
}

export interface FetchRetailerOutput {
  retailer: Retailer;
  query: string;
  zipCode: string;
  products: RetailerProduct[];
  source: 'cassette' | 'live';
  warnings: string[];
}
