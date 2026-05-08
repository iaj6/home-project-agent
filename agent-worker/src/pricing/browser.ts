import { chromium as rawChromium, type Browser, type BrowserContext } from 'playwright';
import { log } from '../util/logger';

// Lazy-load stealth plugin. It's optional — if anything wires wrong we fall back to
// vanilla Chromium which is usually enough for low-volume POC scraping.
type StealthFactory = () => unknown;

let _browserPromise: Promise<Browser> | null = null;

async function ensureBrowser(): Promise<Browser> {
  if (_browserPromise) return _browserPromise;
  _browserPromise = launchStealthy();
  return _browserPromise;
}

async function launchStealthy(): Promise<Browser> {
  try {
    const { chromium } = (await import('playwright-extra')) as {
      chromium: typeof rawChromium & { use: (plugin: unknown) => void };
    };
    const stealthMod = (await import('puppeteer-extra-plugin-stealth')) as {
      default: StealthFactory;
    };
    chromium.use(stealthMod.default());
    return await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
  } catch (err: unknown) {
    log.warn('stealth plugin unavailable, falling back to vanilla chromium', {
      error: err instanceof Error ? err.message : String(err),
    });
    return rawChromium.launch({ headless: true });
  }
}

export async function newStealthContext(opts: {
  zipCode?: string;
  extraCookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
  }>;
}): Promise<{ context: BrowserContext; close: () => Promise<void> }> {
  const browser = await ensureBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (opts.extraCookies?.length) {
    await context.addCookies(
      opts.extraCookies.map((c) => ({
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: c.path ?? '/',
      })),
    );
  }
  return { context, close: () => context.close() };
}

export async function shutdownBrowser(): Promise<void> {
  if (!_browserPromise) return;
  const b = await _browserPromise;
  await b.close();
  _browserPromise = null;
}
