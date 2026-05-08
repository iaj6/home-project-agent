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

const HD_HOST = 'www.homedepot.com';

function hdSearchUrl(query: string): string {
  return `https://${HD_HOST}/s/${encodeURIComponent(query)}`;
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
  const url = hdSearchUrl(query);
  const result = await fetchHtml(url, {
    zipCode,
    cookies: [
      { name: 'THD_LOCSTORE', value: `0121+${zipCode}`, domain: '.homedepot.com' },
      {
        name: 'THD_USER_PREFERENCES',
        value: JSON.stringify({ zip: zipCode }),
        domain: '.homedepot.com',
      },
    ],
    // Counter-intuitive: HD's anti-bot (Akamai) returns a decoy "Oops!" page when
    // it detects a headless browser, but lets through plain HTTP requests.
    // The plain SSR'd page contains the full LD+JSON product list we need.
    renderJs: false,
    premiumProxy: true,
    blockResources: false,
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

function hdRegexStrategy(html: string, limit: number): RetailerProduct[] {
  const products: RetailerProduct[] = [];
  const cardRegex =
    /data-testid="product-pod"[\s\S]{0,4000}?<a[^>]+href="(\/p\/[^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,2000}?\$([0-9]+\.[0-9]{2})/gi;
  let m: RegExpExecArray | null;
  while ((m = cardRegex.exec(html)) !== null && products.length < limit) {
    const path = m[1];
    const name = m[2].replace(/<[^>]*>/g, '').trim();
    const price = priceToNumber(m[3]);
    const skuMatch = path.match(/\/(\d{7,12})$/);
    products.push({
      retailer: 'home_depot',
      name,
      sku: skuMatch?.[1] ?? '',
      unitPrice: price,
      productUrl: absUrlFor('home_depot', path),
      inStock: true,
    });
  }
  return products;
}

export function parseHomeDepotSearchHtml(html: string, limit = 3): ParseOutcome {
  return parseSearchHtml('home_depot', html, limit, hdRegexStrategy);
}

export async function fetchHomeDepot(
  input: FetchRetailerInput,
): Promise<FetchRetailerOutput> {
  const limit = input.maxResults ?? 3;
  const key = { retailer: 'home_depot', query: input.query.toLowerCase(), zipCode: input.zipCode };

  const htmlFetch = await through<HtmlFetch>(
    'home-depot-html',
    key,
    () => fetchSearchPage(input.query, input.zipCode),
    { label: `${input.query}-${input.zipCode}` },
  );

  const warnings: string[] = [...htmlFetch.warnings];
  if (htmlFetch.botBlocked) {
    warnings.push('Home Depot returned a bot-challenge page; results may be empty.');
  }
  if (htmlFetch.status !== 0 && (htmlFetch.status < 200 || htmlFetch.status >= 400)) {
    warnings.push(`HTTP ${htmlFetch.status} from ${htmlFetch.url}`);
  }

  const parsed = parseHomeDepotSearchHtml(htmlFetch.html, limit);
  warnings.push(...parsed.warnings);

  if (parsed.products.length === 0) {
    log.warn('home-depot returned zero products', {
      query: input.query,
      zipCode: input.zipCode,
      status: htmlFetch.status,
      botBlocked: htmlFetch.botBlocked,
      fetchedVia: htmlFetch.fetchedVia,
      strategyUsed: parsed.strategyUsed,
    });
  }

  return {
    retailer: 'home_depot',
    query: input.query,
    zipCode: input.zipCode,
    products: parsed.products,
    source: 'live',
    warnings,
  };
}
