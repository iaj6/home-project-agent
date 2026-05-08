import { z } from 'zod';
import { through } from '../cassette/cassette';
import { fetchHtml } from '../pricing/fetcher';
import type { ToolDefinition } from './types';
import { log } from '../util/logger';

const CostGuideInput = z.object({
  category: z.string().min(3),
  zipCode: z.string().min(5).max(10),
  site: z.enum(['homeadvisor', 'fixr', 'any']).default('any'),
});

export interface CostGuideResult {
  category: string;
  zipCode: string;
  sites: CostGuideSiteResult[];
}

export interface CostGuideSiteResult {
  siteName: string;
  sourceUrl: string;
  status: number;
  snippet: string;
  lowUsd?: number;
  highUsd?: number;
  nationalAvgUsd?: number;
  regionalMultiplier?: number;
  warnings: string[];
}

const STATE_MULTIPLIERS: Record<string, number> = {
  CA: 1.25, NY: 1.22, MA: 1.18, NJ: 1.15, CT: 1.14, WA: 1.13, HI: 1.3,
  DC: 1.2, MD: 1.08, OR: 1.1, CO: 1.08, IL: 1.05, FL: 1.02,
  GA: 0.96, TX: 0.98, NC: 0.95, SC: 0.94, AZ: 0.98, PA: 1.0, OH: 0.93,
  MI: 0.93, VA: 1.02, TN: 0.9, AL: 0.87, MS: 0.85, LA: 0.9, AR: 0.86,
  OK: 0.88, KS: 0.9, MO: 0.92, IA: 0.9, NE: 0.9, ND: 0.93, SD: 0.9,
  MT: 0.95, ID: 0.96, UT: 0.98, NM: 0.94, NV: 1.05, WY: 0.95,
  MN: 0.98, WI: 0.95, IN: 0.93, KY: 0.9, WV: 0.9, ME: 1.02, NH: 1.08,
  VT: 1.05, RI: 1.12, DE: 1.0, AK: 1.15,
};

const ZIP_TO_STATE: Array<{ re: RegExp; state: string }> = [
  { re: /^00[6-9]/, state: 'PR' },
  { re: /^01[0-9]/, state: 'MA' },
  { re: /^02[0-9]/, state: 'MA' },
  { re: /^03[0-9]/, state: 'NH' },
  { re: /^04[0-9]/, state: 'ME' },
  { re: /^05[0-9]/, state: 'VT' },
  { re: /^06[0-9]/, state: 'CT' },
  { re: /^07[0-9]/, state: 'NJ' },
  { re: /^08[0-9]/, state: 'NJ' },
  { re: /^1[0-4]/, state: 'NY' },
  { re: /^15[0-9]|^16[0-9]|^17[0-9]|^18[0-9]|^19[0-5]/, state: 'PA' },
  { re: /^19[6-9]/, state: 'DE' },
  { re: /^20[0-5]/, state: 'DC' },
  { re: /^20[6-9]|^21[0-9]/, state: 'MD' },
  { re: /^22[0-4]|^23[0-9]|^24[0-6]/, state: 'VA' },
  { re: /^24[7-9]|^25[0-9]|^26[0-8]/, state: 'WV' },
  { re: /^27[0-9]|^28[0-9]/, state: 'NC' },
  { re: /^29[0-9]/, state: 'SC' },
  { re: /^30[0-9]|^31[0-9]/, state: 'GA' },
  { re: /^32[0-3]|^33[0-9]|^34[0-9]/, state: 'FL' },
  { re: /^35[0-9]|^36[0-9]/, state: 'AL' },
  { re: /^37[0-9]|^38[0-5]/, state: 'TN' },
  { re: /^38[6-9]|^39[0-7]/, state: 'MS' },
  { re: /^40[0-9]|^41[0-2]/, state: 'KY' },
  { re: /^43[0-9]|^44[0-5]/, state: 'OH' },
  { re: /^46[0-9]|^47[0-9]/, state: 'IN' },
  { re: /^48[0-9]|^49[0-9]/, state: 'MI' },
  { re: /^50[0-2]|^51[0-4]|^52[0-8]/, state: 'IA' },
  { re: /^53[0-9]|^54[0-9]/, state: 'WI' },
  { re: /^55[0-9]|^56[0-5]/, state: 'MN' },
  { re: /^57[0-9]/, state: 'SD' },
  { re: /^58[0-9]/, state: 'ND' },
  { re: /^59[0-9]/, state: 'MT' },
  { re: /^60[0-9]|^61[0-9]|^62[0-9]/, state: 'IL' },
  { re: /^63[0-9]|^64[0-9]|^65[0-8]/, state: 'MO' },
  { re: /^66[0-9]|^67[0-9]/, state: 'KS' },
  { re: /^68[0-9]|^69[0-9]/, state: 'NE' },
  { re: /^70[0-9]|^71[0-4]/, state: 'LA' },
  { re: /^71[5-9]|^72[0-9]/, state: 'AR' },
  { re: /^73[0-9]|^74[0-9]/, state: 'OK' },
  { re: /^75[0-9]|^76[0-9]|^77[0-9]|^78[0-9]|^79[0-9]|^88[5-9]/, state: 'TX' },
  { re: /^80[0-9]|^81[0-9]/, state: 'CO' },
  { re: /^82[0-9]|^83[0-1]/, state: 'WY' },
  { re: /^83[2-9]/, state: 'ID' },
  { re: /^84[0-9]/, state: 'UT' },
  { re: /^85[0-9]|^86[0-5]/, state: 'AZ' },
  { re: /^87[0-9]|^88[0-4]/, state: 'NM' },
  { re: /^89[0-9]/, state: 'NV' },
  { re: /^9[0-6]/, state: 'CA' },
  { re: /^97[0-9]/, state: 'OR' },
  { re: /^98[0-9]|^99[0-4]/, state: 'WA' },
  { re: /^995|^996|^997|^998|^999/, state: 'AK' },
  { re: /^96[7-9]/, state: 'HI' },
];

export function zipToState(zipCode: string): string | null {
  const clean = zipCode.replace(/\D/g, '').slice(0, 5);
  if (!clean) return null;
  for (const { re, state } of ZIP_TO_STATE) {
    if (re.test(clean)) return state;
  }
  return null;
}

export function regionalMultiplierForZip(zipCode: string): number {
  const state = zipToState(zipCode);
  if (state && STATE_MULTIPLIERS[state] !== undefined) return STATE_MULTIPLIERS[state];
  return 1.0;
}

// Verified live 2026-05-04. URL paths drift; if a guide 404s, re-discover and update here.
// Fixr lacks a dedicated vanity guide — entry intentionally omits `fixr` for that category.
const COST_GUIDE_URLS: Record<string, { homeadvisor?: string; fixr?: string }> = {
  'deck-building': {
    homeadvisor: 'outdoor-living/build-a-deck',
    fixr: 'build-deck',
  },
  'bathroom-vanity': {
    homeadvisor: 'bathrooms/install-a-vanity',
  },
};

function guessUrls(category: string, site: 'homeadvisor' | 'fixr' | 'any'): string[] {
  const entry = COST_GUIDE_URLS[category];
  if (!entry) return [];
  const urls: string[] = [];
  if ((site === 'homeadvisor' || site === 'any') && entry.homeadvisor) {
    urls.push(`https://www.homeadvisor.com/cost/${entry.homeadvisor}/`);
  }
  if ((site === 'fixr' || site === 'any') && entry.fixr) {
    urls.push(`https://www.fixr.com/costs/${entry.fixr}`);
  }
  return urls;
}

async function fetchOne(url: string): Promise<{ html: string; status: number }> {
  try {
    const result = await fetchHtml(url, { renderJs: false });
    return { html: result.html, status: result.status };
  } catch {
    return { html: '', status: 0 };
  }
}

const NUM = /\$\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/g;

export function extractCostRange(html: string): {
  lowUsd?: number;
  highUsd?: number;
  nationalAvgUsd?: number;
  snippet: string;
} {
  if (!html) return { snippet: '' };
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const rangeRe =
    /(?:cost|price|average|range|typically|generally)[^$]{0,140}?\$\s*([0-9]{1,3}(?:,[0-9]{3})*)(?:\.[0-9]{2})?\s*(?:to|-|–|and)\s*\$\s*([0-9]{1,3}(?:,[0-9]{3})*)(?:\.[0-9]{2})?/i;
  const rangeMatch = text.match(rangeRe);
  // Explicit "average/typical" phrases that point at a single figure.
  const avgRe =
    /(?:around|roughly|averaging|spending|average (?:of|is|is about))[^$]{0,50}?\$\s*([0-9]{1,3}(?:,[0-9]{3})*)(?:\.[0-9]{2})?/i;
  const avgMatch = text.match(avgRe);

  const toNum = (s?: string) => (s ? parseFloat(s.replace(/,/g, '')) : undefined);

  let snippet = '';
  if (rangeMatch) {
    const idx = Math.max(0, text.indexOf(rangeMatch[0]) - 60);
    snippet = text.slice(idx, idx + rangeMatch[0].length + 180).trim();
  } else {
    const priceIdx = text.search(NUM);
    snippet = priceIdx > -1 ? text.slice(Math.max(0, priceIdx - 80), priceIdx + 180).trim() : text.slice(0, 240);
  }

  return {
    lowUsd: toNum(rangeMatch?.[1]),
    highUsd: toNum(rangeMatch?.[2]),
    nationalAvgUsd: toNum(avgMatch?.[1]),
    snippet,
  };
}

async function fetchCostGuide(
  input: z.infer<typeof CostGuideInput>,
): Promise<CostGuideResult> {
  const urls = guessUrls(input.category, input.site);
  const regionalMultiplier = regionalMultiplierForZip(input.zipCode);

  const siteResults = await Promise.all(
    urls.map(async (url): Promise<CostGuideSiteResult> => {
      const siteName = url.includes('homeadvisor')
        ? 'HomeAdvisor'
        : url.includes('fixr')
        ? 'Fixr'
        : new URL(url).hostname;
      const warnings: string[] = [];
      const cassetteKey = { url, category: input.category, zipCode: input.zipCode };
      const page = await through(
        'cost-guide-html',
        cassetteKey,
        () => fetchOne(url),
        { label: `${siteName}-${input.category}` },
      );
      if (!page.html) warnings.push(`no html from ${siteName}`);
      const costs = extractCostRange(page.html);
      if (!costs.lowUsd && !costs.highUsd) warnings.push(`no cost range found in ${siteName}`);
      return {
        siteName,
        sourceUrl: url,
        status: page.status,
        snippet: costs.snippet,
        lowUsd: costs.lowUsd,
        highUsd: costs.highUsd,
        nationalAvgUsd: costs.nationalAvgUsd,
        regionalMultiplier,
        warnings,
      };
    }),
  );

  log.info('cost-guide results', {
    category: input.category,
    zipCode: input.zipCode,
    sites: siteResults.map((s) => ({
      site: s.siteName,
      low: s.lowUsd,
      high: s.highUsd,
      status: s.status,
    })),
  });

  return {
    category: input.category,
    zipCode: input.zipCode,
    sites: siteResults,
  };
}

export const fetchCostGuideTool: ToolDefinition<
  z.infer<typeof CostGuideInput>,
  CostGuideResult
> = {
  name: 'fetch_cost_guide',
  description:
    'Fetch professional labor cost ranges for a project category from HomeAdvisor and Fixr. Includes a regional-multiplier estimate from ZIP.',
  inputSchema: CostGuideInput,
  jsonSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Project category — typically the kebab-case id like "deck-building".',
      },
      zipCode: { type: 'string' },
      site: { type: 'string', enum: ['homeadvisor', 'fixr', 'any'] },
    },
    required: ['category', 'zipCode'],
  },
  run: fetchCostGuide,
};
