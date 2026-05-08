import type { Retailer } from '@home-advisor/shared';
import type { RetailerProduct } from './types';

const HOSTS: Record<Retailer, string> = {
  home_depot: 'www.homedepot.com',
  lowes: 'www.lowes.com',
};

export function absUrlFor(retailer: Retailer, urlOrPath: string): string {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http')) return urlOrPath;
  return `https://${HOSTS[retailer]}${urlOrPath.startsWith('/') ? '' : '/'}${urlOrPath}`;
}

export function priceToNumber(raw: string | number | undefined | null): number {
  if (typeof raw === 'number') return raw;
  if (!raw) return 0;
  const clean = String(raw).replace(/[^0-9.]/g, '');
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

export function isBotChallenge(html: string): boolean {
  const markers = [
    'Pardon Our Interruption',
    'Access Denied',
    'are you a human',
    'data-distil-challenge',
    'challenge-platform',
  ];
  const lower = html.toLowerCase();
  return markers.some((m) => lower.includes(m.toLowerCase()));
}

export function looksLikeProduct(o: Record<string, unknown>): boolean {
  const keys = Object.keys(o).map((k) => k.toLowerCase());
  const hasName =
    keys.includes('name') || keys.includes('title') || keys.includes('productname');
  const hasPrice =
    keys.includes('price') ||
    keys.includes('priceinfo') ||
    keys.includes('pricing') ||
    keys.includes('offers');
  const hasId =
    keys.includes('sku') ||
    keys.includes('itemid') ||
    keys.includes('productid') ||
    keys.includes('omsid') ||
    keys.includes('modelnumber');
  return (hasName && (hasPrice || hasId)) || (hasPrice && hasId);
}

export function normalizeProduct(
  retailer: Retailer,
  o: Record<string, unknown>,
): RetailerProduct | null {
  const name =
    (o['name'] as string | undefined) ||
    (o['title'] as string | undefined) ||
    (o['productName'] as string | undefined) ||
    (o['productLabel'] as string | undefined);
  if (!name) return null;

  const sku =
    (o['sku'] as string | undefined) ||
    (o['itemId'] as string | undefined) ||
    (o['productId'] as string | undefined) ||
    (o['omsId'] as string | undefined) ||
    (o['modelNumber'] as string | undefined) ||
    '';

  let price = 0;
  const priceInfo = o['pricing'] ?? o['priceInfo'] ?? o['price'] ?? o['offers'];
  if (typeof priceInfo === 'number' || typeof priceInfo === 'string') {
    price = priceToNumber(priceInfo);
  } else if (priceInfo && typeof priceInfo === 'object') {
    const pi = priceInfo as Record<string, unknown>;
    price = priceToNumber(
      (pi['value'] as number | string | undefined) ??
        (pi['price'] as number | string | undefined) ??
        (pi['current'] as number | string | undefined) ??
        (pi['lowPrice'] as number | string | undefined),
    );
  }

  const url =
    (o['url'] as string | undefined) ||
    (o['productUrl'] as string | undefined) ||
    (o['canonicalUrl'] as string | undefined) ||
    ((o['offers'] && typeof o['offers'] === 'object'
      ? ((o['offers'] as Record<string, unknown>)['url'] as string | undefined)
      : undefined) ?? '');

  const image =
    (o['image'] as string | undefined) ||
    (o['imageUrl'] as string | undefined) ||
    (() => {
      const arr = o['images'] as Array<Record<string, unknown>> | undefined;
      if (arr && arr[0]) return arr[0]['url'] as string | undefined;
      return undefined;
    })();

  const offerObj =
    (o['offers'] && typeof o['offers'] === 'object'
      ? (o['offers'] as Record<string, unknown>)
      : undefined);
  const availability =
    (o['availability'] as string | undefined) ??
    (offerObj?.['availability'] as string | undefined) ??
    ((o['fulfillment'] as Record<string, unknown> | undefined)?.['inStock'] as
      | boolean
      | string
      | undefined);
  const inStock =
    availability === true ||
    (typeof availability === 'string' &&
      /in[ _-]?stock|available|https:\/\/schema\.org\/instock/i.test(availability));

  return {
    retailer,
    name,
    sku,
    unitPrice: price,
    productUrl: absUrlFor(retailer, url),
    imageUrl: image,
    inStock,
  };
}

export function findProductArrays(
  obj: unknown,
  depth = 0,
): Array<Record<string, unknown>[]> {
  if (depth > 12 || obj === null || typeof obj !== 'object') return [];
  const out: Array<Record<string, unknown>[]> = [];
  const o = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(o)) {
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((v): v is Record<string, unknown> => !!v && typeof v === 'object')
    ) {
      const sample = value[0] as Record<string, unknown>;
      if (
        looksLikeProduct(sample) ||
        key === 'products' ||
        key === 'productList' ||
        key === 'itemListElement' ||
        key === 'items'
      ) {
        if (value.some((v) => looksLikeProduct(v as Record<string, unknown>))) {
          out.push(value as Record<string, unknown>[]);
        }
      }
    } else if (value && typeof value === 'object') {
      out.push(...findProductArrays(value, depth + 1));
    }
  }
  return out;
}

export interface ParseOutcome {
  products: RetailerProduct[];
  warnings: string[];
  strategyUsed: 'next-data' | 'json-ld' | 'regex' | 'none';
}

export function parseSearchHtml(
  retailer: Retailer,
  html: string,
  limit = 3,
  regexStrategy?: (html: string, limit: number) => RetailerProduct[],
): ParseOutcome {
  if (!html || html.length < 100) {
    return { products: [], warnings: ['empty html'], strategyUsed: 'none' };
  }

  const nextData = tryNextData(retailer, html, limit);
  if (nextData.products.length) {
    return { ...nextData, strategyUsed: 'next-data' };
  }

  const jsonLd = tryJsonLd(retailer, html, limit);
  if (jsonLd.products.length) {
    return { ...jsonLd, strategyUsed: 'json-ld' };
  }

  if (regexStrategy) {
    const products = regexStrategy(html, limit);
    if (products.length) {
      return { products, warnings: [], strategyUsed: 'regex' };
    }
  }

  return {
    products: [],
    warnings: ['no parser strategy produced results'],
    strategyUsed: 'none',
  };
}

function tryNextData(
  retailer: Retailer,
  html: string,
  limit: number,
): { products: RetailerProduct[]; warnings: string[] } {
  const match = html.match(
    /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (!match) return { products: [], warnings: [] };
  try {
    const parsed = JSON.parse(match[1]);
    const arrays = findProductArrays(parsed);
    const products: RetailerProduct[] = [];
    for (const arr of arrays) {
      for (const p of arr) {
        const product = normalizeProduct(retailer, p);
        if (product) products.push(product);
        if (products.length >= limit) break;
      }
      if (products.length >= limit) break;
    }
    return { products: products.slice(0, limit), warnings: [] };
  } catch (err: unknown) {
    return {
      products: [],
      warnings: [`__NEXT_DATA__ parse error: ${err instanceof Error ? err.message : String(err)}`],
    };
  }
}

function tryJsonLd(
  retailer: Retailer,
  html: string,
  limit: number,
): { products: RetailerProduct[]; warnings: string[] } {
  const matches = [
    ...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const products: RetailerProduct[] = [];
  const warnings: string[] = [];
  for (const m of matches) {
    try {
      const data = JSON.parse(m[1]);
      const found = findJsonLdProducts(data);
      for (const raw of found) {
        const p = normalizeProduct(retailer, raw);
        if (p) products.push(p);
        if (products.length >= limit) return { products, warnings };
      }
    } catch (err: unknown) {
      warnings.push(
        `json-ld parse error: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return { products, warnings };
}

/** Recursively walk a JSON-LD blob and collect every `@type: "Product"` object,
 * regardless of where it's nested (top-level, ItemList.itemListElement[].item,
 * mainEntity.offers.itemOffered[], etc.). */
function findJsonLdProducts(
  node: unknown,
  out: Array<Record<string, unknown>> = [],
  depth = 0,
): Array<Record<string, unknown>> {
  if (depth > 10 || node === null || typeof node !== 'object') return out;
  if (Array.isArray(node)) {
    for (const v of node) findJsonLdProducts(v, out, depth + 1);
    return out;
  }
  const o = node as Record<string, unknown>;
  if (o['@type'] === 'Product') {
    out.push(o);
    return out;
  }
  // ItemList.itemListElement entries are wrapped — unwrap to inspect inner items.
  if (o['@type'] === 'ItemList' && Array.isArray(o['itemListElement'])) {
    for (const el of o['itemListElement'] as unknown[]) {
      const wrap = el as Record<string, unknown> | undefined;
      const inner = wrap?.['item'] ?? wrap;
      findJsonLdProducts(inner, out, depth + 1);
    }
    return out;
  }
  for (const v of Object.values(o)) findJsonLdProducts(v, out, depth + 1);
  return out;
}
