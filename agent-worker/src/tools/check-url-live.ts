import { z } from 'zod';
import { through } from '../cassette/cassette';
import { BUDGET } from '../config';
import { assertPublicUrl, UnsafeUrlError } from '../util/url-safety';
import type { ToolDefinition } from './types';

const CheckUrlLiveInput = z.object({
  url: z.string().url(),
});

export interface CheckUrlLiveOutput {
  url: string;
  live: boolean;
  status: number;
  reason?: string;
}

async function probe(url: string): Promise<CheckUrlLiveOutput> {
  try {
    assertPublicUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return { url, live: false, status: 0, reason: err.message };
    }
    throw err;
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BUDGET.urlLivenessTimeoutMs);
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: ctrl.signal,
    });
    if (res.status === 403 || res.status === 405 || res.status === 501) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { Range: 'bytes=0-0' },
      });
    }
    const live = res.status >= 200 && res.status < 400;
    return {
      url,
      live,
      status: res.status,
      reason: live ? undefined : `status=${res.status}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { url, live: false, status: 0, reason: message };
  } finally {
    clearTimeout(timer);
  }
}

export const checkUrlLiveTool: ToolDefinition<
  z.infer<typeof CheckUrlLiveInput>,
  CheckUrlLiveOutput
> = {
  name: 'check_url_live',
  description:
    'Check whether a URL is reachable and returns a success status. Use before citing a URL in the final report.',
  inputSchema: CheckUrlLiveInput,
  jsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string' },
    },
    required: ['url'],
  },
  async run(input) {
    return through('check-url-live', { url: input.url }, () => probe(input.url), {
      label: new URL(input.url).hostname,
    });
  },
};
