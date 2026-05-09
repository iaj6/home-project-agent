import type { Resource } from '@home-helper/shared';
import { log } from '../util/logger';

interface YouTubeSearchItem {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      high?: { url?: string };
      default?: { url?: string };
    };
  };
}

interface YouTubeVideoStats {
  id: string;
  statistics?: { viewCount?: string };
  contentDetails?: { duration?: string };
}

const SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

const SHORT_VIDEO_RE = /^PT[0-9]+(M[0-9]+S?)?S?$/;

function parseIsoDurationToSeconds(iso: string | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  const [, h, mn, s] = m;
  return (Number(h) || 0) * 3600 + (Number(mn) || 0) * 60 + (Number(s) || 0);
}

export async function searchYouTubeVideos(
  query: string,
  opts: { maxResults?: number; minSeconds?: number } = {},
): Promise<Resource[]> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    log.warn('YOUTUBE_API_KEY not set; skipping video enrichment');
    return [];
  }

  const maxResults = opts.maxResults ?? 4;
  const minSeconds = opts.minSeconds ?? 180; // skip Shorts and trailers

  // Step 1: search.list — 100 quota units per call.
  const searchParams = new URLSearchParams({
    key: apiKey,
    q: query,
    part: 'snippet',
    type: 'video',
    maxResults: String(Math.min(maxResults * 2, 10)),
    relevanceLanguage: 'en',
    regionCode: 'US',
    safeSearch: 'moderate',
    videoEmbeddable: 'true',
  });

  let searchData: { items?: YouTubeSearchItem[] };
  try {
    const res = await fetch(`${SEARCH_URL}?${searchParams}`);
    if (!res.ok) {
      const body = await res.text();
      log.warn('youtube search failed', { status: res.status, body: body.slice(0, 300) });
      return [];
    }
    searchData = (await res.json()) as { items?: YouTubeSearchItem[] };
  } catch (err) {
    log.warn('youtube search error', { error: err instanceof Error ? err.message : String(err) });
    return [];
  }

  const items = searchData.items ?? [];
  const videoIds = items
    .map((i) => i.id?.videoId)
    .filter((id): id is string => !!id);
  if (!videoIds.length) return [];

  // Step 2: videos.list — 1 quota unit per call. Pulls view counts + duration.
  const videosParams = new URLSearchParams({
    key: apiKey,
    id: videoIds.join(','),
    part: 'statistics,contentDetails',
  });

  let videoStats: YouTubeVideoStats[] = [];
  try {
    const res = await fetch(`${VIDEOS_URL}?${videosParams}`);
    if (res.ok) {
      const data = (await res.json()) as { items?: YouTubeVideoStats[] };
      videoStats = data.items ?? [];
    }
  } catch (err) {
    log.warn('youtube videos.list error', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const statsById = new Map(videoStats.map((v) => [v.id, v]));

  const candidates: Array<Resource & { viewCount: number; durationSeconds: number }> = [];
  for (const it of items) {
    const id = it.id?.videoId;
    if (!id) continue;
    const stats = statsById.get(id);
    const durationSeconds = parseIsoDurationToSeconds(stats?.contentDetails?.duration);
    if (durationSeconds && durationSeconds < minSeconds) continue;
    const viewCount = Number(stats?.statistics?.viewCount ?? 0);
    const thumbnail =
      it.snippet?.thumbnails?.high?.url ??
      it.snippet?.thumbnails?.medium?.url ??
      it.snippet?.thumbnails?.default?.url;
    candidates.push({
      title: it.snippet?.title ?? 'Untitled',
      url: `https://www.youtube.com/watch?v=${id}`,
      type: 'video',
      videoId: id,
      thumbnail,
      source: it.snippet?.channelTitle,
      viewCount,
      durationSeconds,
    });
  }

  // Sort by view count as a quality proxy, take top N.
  candidates.sort((a, b) => b.viewCount - a.viewCount);
  return candidates.slice(0, maxResults).map(({ durationSeconds: _d, ...r }) => r);
}
