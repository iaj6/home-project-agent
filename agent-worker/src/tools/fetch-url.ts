import { z } from 'zod';
import { through } from '../cassette/cassette';
import { fetchHtml } from '../pricing/fetcher';
import type { ToolDefinition } from './types';

const FetchUrlInput = z.object({
  url: z.string().url(),
  renderJs: z.boolean().optional(),
});

export interface FetchUrlOutput {
  url: string;
  status: number;
  contentType: string;
  text: string;
  truncated: boolean;
  fetchedVia?: string;
  error?: string;
}

const MAX_BYTES = 500_000;

async function fetchPage(url: string, renderJs?: boolean): Promise<FetchUrlOutput> {
  try {
    const result = await fetchHtml(url, { renderJs: renderJs ?? false });
    const truncated = result.html.length > MAX_BYTES;
    const text = truncated ? result.html.slice(0, MAX_BYTES) : result.html;
    return {
      url: result.url,
      status: result.status,
      contentType: 'text/html',
      text,
      truncated,
      fetchedVia: result.fetchedVia,
      error: result.warnings.length ? result.warnings.join('; ') : undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      url,
      status: 0,
      contentType: 'error',
      text: '',
      truncated: false,
      error: message,
    };
  }
}

export const fetchUrlTool: ToolDefinition<z.infer<typeof FetchUrlInput>, FetchUrlOutput> = {
  name: 'fetch_url',
  description:
    'Fetch a plain-HTTP URL and return its text content. Use for non-JS cost guides and reference pages. Does not render JavaScript.',
  inputSchema: FetchUrlInput,
  jsonSchema: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'Absolute https URL to fetch.' },
      renderJs: {
        type: 'boolean',
        description: 'Reserved. Plain fetch only in v1.',
      },
    },
    required: ['url'],
  },
  async run(input) {
    return through(
      'fetch-url',
      { url: input.url, renderJs: !!input.renderJs },
      () => fetchPage(input.url, input.renderJs),
      { label: new URL(input.url).hostname },
    );
  },
};
