import { through } from '../cassette/cassette';
import { fetchHtml, type FetchedVia } from './fetcher';
import { log } from '../util/logger';
import {
  absUrlFor,
  isBotChallenge,
  parseSearchHtml,
  priceToNumber,
  type ParseOutcome,
} from './parse';
import type { FetchRetailerInput, FetchRetailerOutput, RetailerProduct } from './types';

const LOWES_HOST = 'www.lowes.com';

function lowesSearchUrl(query: string): string {
  return `https://${LOWES_HOST}/search?searchTerm=${encodeURIComponent(query)}`;
}

interface HtmlFetch {
  url: string;
  status: number;
  html: string;
  botBlocked: boolean;
  fetchedVia: FetchedVia;
  warnings: string[];
}

async function fetchSearchPage(query: string, zipCode: string): Promise<HtmlFetch> {
  const url = lowesSearchUrl(query);
  const result = await fetchHtml(url, {
    zipCode,
    cookies: [
      { name: 'sn', value: '2636', domain: '.lowes.com' },
      { name: 'zipcode', value: zipCode, domain: '.lowes.com' },
    ],
    renderJs: true,
    premiumProxy: true,
    blockResources: false,
    waitForMs: 5000,
  });
  return {
    url: result.url,
    status: result.status,
    html: result.html,
    botBlocked: isBotChallenge(result.html),
    fetchedVia: result.fetchedVia,
    warnings: result.warnings,
  };
}

function lowesRegexStrategy(html: string, limit: number): RetailerProduct[] {
  const products: RetailerProduct[] = [];
  const cardRegex =
    /data-selector="split-btn-package-details"[\s\S]{0,4000}?<a[^>]+href="(\/pd\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,2000}?\$([0-9]+\.[0-9]{2})/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRegex.exec(html)) !== null && products.length < limit) {
    const path = m[1];
    const name = m[2].replace(/<[^>]*>/g, '').trim();
    const price = priceToNumber(m[3]);
    const skuMatch = path.match(/\/(\d{7,12})$/);
    products.push({
      retailer: 'lowes',
      name,
      sku: skuMatch?.[1] ?? '',
      unitPrice: price,
      productUrl: absUrlFor('lowes', path),
      inStock: true,
    });
  }
  return products;
}

export function parseLowesSearchHtml(html: string, limit = 3): ParseOutcome {
  return parseSearchHtml('lowes', html, limit, lowesRegexStrategy);
}

export async function fetchLowes(input: FetchRetailerInput): Promise<FetchRetailerOutput> {
  const limit = input.maxResults ?? 3;
  const key = { retailer: 'lowes', query: input.query.toLowerCase(), zipCode: input.zipCode };

  const htmlFetch = await through<HtmlFetch>(
    'lowes-html',
    key,
    () => fetchSearchPage(input.query, input.zipCode),
    { label: `${input.query}-${input.zipCode}` },
  );

  const warnings: string[] = [...htmlFetch.warnings];
  if (htmlFetch.botBlocked) {
    warnings.push("Lowe's returned a bot-challenge page; results may be empty.");
  }
  if (htmlFetch.status !== 0 && (htmlFetch.status < 200 || htmlFetch.status >= 400)) {
    warnings.push(`HTTP ${htmlFetch.status} from ${htmlFetch.url}`);
  }

  const parsed = parseLowesSearchHtml(htmlFetch.html, limit);
  warnings.push(...parsed.warnings);

  if (parsed.products.length === 0) {
    log.warn('lowes returned zero products', {
      query: input.query,
      zipCode: input.zipCode,
      status: htmlFetch.status,
      botBlocked: htmlFetch.botBlocked,
      fetchedVia: htmlFetch.fetchedVia,
      strategyUsed: parsed.strategyUsed,
    });
  }

  return {
    retailer: 'lowes',
    query: input.query,
    zipCode: input.zipCode,
    products: parsed.products,
    source: 'live',
    warnings,
  };
}
