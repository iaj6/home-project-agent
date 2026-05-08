import { newStealthContext } from './browser';
import { log } from '../util/logger';

export interface FetchHtmlOpts {
  cookies?: Array<{ name: string; value: string; domain: string; path?: string }>;
  zipCode?: string;
  renderJs?: boolean;
  waitForMs?: number;
  timeoutMs?: number;
  /** ScrapingBee: use premium residential proxies for heavy anti-bot sites. */
  premiumProxy?: boolean;
  /** ScrapingBee: block images/CSS/fonts to save credits. Default true. */
  blockResources?: boolean;
}

export type FetchedVia = 'crawlbase' | 'scrapingbee' | 'playwright';

export interface FetchHtmlResult {
  url: string;
  status: number;
  html: string;
  fetchedVia: FetchedVia;
  warnings: string[];
}

export function preferredFetcher(): FetchedVia {
  if (process.env.CRAWLBASE_JS_TOKEN || process.env.CRAWLBASE_TOKEN) return 'crawlbase';
  if (process.env.SCRAPING_BEE_API_KEY) return 'scrapingbee';
  return 'playwright';
}

export async function fetchHtml(url: string, opts: FetchHtmlOpts = {}): Promise<FetchHtmlResult> {
  const pref = preferredFetcher();
  if (pref === 'crawlbase') {
    try {
      return await fetchViaCrawlbase(url, opts);
    } catch (err: unknown) {
      log.warn('crawlbase failed, falling back to playwright', {
        url,
        error: err instanceof Error ? err.message : String(err),
      });
      return fetchViaPlaywright(url, opts);
    }
  }
  if (pref === 'scrapingbee') {
    try {
      return await fetchViaScrapingBee(url, opts);
    } catch (err: unknown) {
      log.warn('scrapingbee failed, falling back to playwright', {
        url,
        error: err instanceof Error ? err.message : String(err),
      });
      return fetchViaPlaywright(url, opts);
    }
  }
  return fetchViaPlaywright(url, opts);
}

async function fetchViaCrawlbase(url: string, opts: FetchHtmlOpts): Promise<FetchHtmlResult> {
  // Crawlbase has two tokens: the JavaScript token handles JS rendering and heavy
  // anti-bot; the plain token is cheaper and good for simple sites. Prefer the JS
  // token when the caller asked for JS rendering or when only one is configured.
  const jsToken = process.env.CRAWLBASE_JS_TOKEN;
  const plainToken = process.env.CRAWLBASE_TOKEN;
  const useJs = opts.renderJs ?? true;
  const token = useJs ? jsToken ?? plainToken : plainToken ?? jsToken;
  if (!token) throw new Error('No Crawlbase token configured');

  const timeoutMs = opts.timeoutMs ?? 90_000;
  const params = new URLSearchParams({
    token,
    url,
    country: 'US',
  });

  // page_wait / ajax_wait are JS-token-only per Crawlbase docs.
  if (useJs && opts.waitForMs && opts.waitForMs > 0) {
    params.append('page_wait', String(opts.waitForMs));
    params.append('ajax_wait', 'true');
  }

  if (opts.cookies?.length) {
    // Crawlbase expects "name=value; name=value" as a URL-encoded single string.
    const cookieStr = opts.cookies.map((c) => `${c.name}=${c.value}`).join('; ');
    params.append('cookies', cookieStr);
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.crawlbase.com/?${params.toString()}`, {
      signal: ctrl.signal,
    });
    const html = await res.text();
    const warnings: string[] = [];

    // Crawlbase exposes upstream status in original_status header; its own status
    // goes in pc_status. Crawlbase only charges for successful requests.
    const originalStatus = Number(res.headers.get('original_status') ?? res.status);
    const pcStatus = res.headers.get('pc_status');
    log.debug('crawlbase fetch', {
      url,
      httpStatus: res.status,
      originalStatus,
      pcStatus,
      bytes: html.length,
      tokenKind: useJs ? 'js' : 'plain',
    });

    if (res.status >= 400) {
      warnings.push(`crawlbase returned ${res.status}: ${html.slice(0, 200)}`);
      return { url, status: res.status, html: '', fetchedVia: 'crawlbase', warnings };
    }

    return {
      url,
      status: originalStatus,
      html,
      fetchedVia: 'crawlbase',
      warnings,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaScrapingBee(url: string, opts: FetchHtmlOpts): Promise<FetchHtmlResult> {
  const apiKey = process.env.SCRAPING_BEE_API_KEY!;
  // Premium proxy + JS rendering can take 30-60s; default high.
  const timeoutMs = opts.timeoutMs ?? 90_000;

  const params = new URLSearchParams({
    api_key: apiKey,
    url,
    render_js: opts.renderJs ? 'true' : 'false',
    block_resources: opts.blockResources === false ? 'false' : 'true',
    country_code: 'us',
  });
  if (opts.premiumProxy) {
    params.append('premium_proxy', 'true');
  }

  if (opts.cookies?.length) {
    // ScrapingBee accepts cookies as a single semicolon-separated name=value string.
    params.append('cookies', opts.cookies.map((c) => `${c.name}=${c.value}`).join(';'));
  }
  if (opts.waitForMs && opts.waitForMs > 0) {
    params.append('wait', String(opts.waitForMs));
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params.toString()}`, {
      signal: ctrl.signal,
    });
    const html = await res.text();
    const warnings: string[] = [];

    // ScrapingBee returns its own 200 even when the upstream had issues.
    // Spb-original-status carries the upstream code.
    const upstreamStatus = Number(res.headers.get('Spb-original-status') ?? res.status);
    const credits = res.headers.get('Spb-cost');
    log.debug('scrapingbee fetch', {
      url,
      sbStatus: res.status,
      upstream: upstreamStatus,
      credits,
      bytes: html.length,
    });

    if (res.status >= 400) {
      // ScrapingBee error — body is JSON, not HTML.
      warnings.push(`scrapingbee returned ${res.status}: ${html.slice(0, 200)}`);
      return { url, status: res.status, html: '', fetchedVia: 'scrapingbee', warnings };
    }

    return {
      url,
      status: upstreamStatus,
      html,
      fetchedVia: 'scrapingbee',
      warnings,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchViaPlaywright(url: string, opts: FetchHtmlOpts): Promise<FetchHtmlResult> {
  const { context, close } = await newStealthContext({
    zipCode: opts.zipCode,
    extraCookies: opts.cookies,
  });
  try {
    const page = await context.newPage();
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: opts.timeoutMs ?? 20_000,
    });
    const status = response?.status() ?? 0;
    if (opts.waitForMs && opts.waitForMs > 0) {
      await page.waitForTimeout(opts.waitForMs).catch(() => undefined);
    }
    const html = await page.content();
    return { url, status, html, fetchedVia: 'playwright', warnings: [] };
  } finally {
    await close();
  }
}
