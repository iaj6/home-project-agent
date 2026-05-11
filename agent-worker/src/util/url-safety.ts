/**
 * SSRF guard for any tool that fetches a URL chosen by Claude.
 *
 * Threat model: a user's project description or clarification message could
 * contain a prompt injection that gets the agent to fetch an arbitrary URL.
 * In particular, fetching `http://169.254.169.254/...` from inside Cloud Run
 * would leak the service-account access token via the GCE metadata service.
 *
 * Defense: refuse anything that isn't an http(s) URL targeting a hostname
 * that doesn't look private/link-local/loopback. This is string-based, not
 * DNS-rebinding-safe — for a determined attacker with control over a domain
 * resolving to internal IPs you'd want post-resolution IP checks. That level
 * of defense isn't worth it for our threat model.
 */

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'metadata',
  'broadcasthost',
]);

const IPV4_BLOCKED_PATTERNS: RegExp[] = [
  /^10\./, // 10.0.0.0/8
  /^127\./, // loopback
  /^169\.254\./, // link-local (incl GCE metadata 169.254.169.254)
  /^192\.168\./, // 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
  /^0\./, // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // CGNAT 100.64.0.0/10
  /^22[4-9]\./, /^23\d\./, // multicast
  /^25[0-5]\./, // reserved
];

const IPV6_BLOCKED_PATTERNS: RegExp[] = [
  /^::1$/, // loopback
  /^::$/, // unspecified
  /^fe80:/i, // link-local
  /^fc00:/i, /^fd[0-9a-f]{2}:/i, // unique local
  /^ff[0-9a-f]{2}:/i, // multicast
];

export function isSafePublicUrl(input: string): { ok: boolean; reason?: string } {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, reason: 'not a valid URL' };
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: `disallowed scheme: ${parsed.protocol}` };
  }
  const host = parsed.hostname.toLowerCase();
  if (!host) return { ok: false, reason: 'missing hostname' };
  if (BLOCKED_HOSTNAMES.has(host)) {
    return { ok: false, reason: `disallowed hostname: ${host}` };
  }
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    return { ok: false, reason: `disallowed TLD: ${host}` };
  }
  // Strip IPv6 brackets if present.
  const ipHost = host.startsWith('[') && host.endsWith(']')
    ? host.slice(1, -1)
    : host;
  for (const re of IPV4_BLOCKED_PATTERNS) {
    if (re.test(ipHost)) {
      return { ok: false, reason: `private/reserved IPv4: ${ipHost}` };
    }
  }
  for (const re of IPV6_BLOCKED_PATTERNS) {
    if (re.test(ipHost)) {
      return { ok: false, reason: `private/reserved IPv6: ${ipHost}` };
    }
  }
  return { ok: true };
}

export class UnsafeUrlError extends Error {
  constructor(url: string, reason: string) {
    super(`Refusing to fetch ${url}: ${reason}`);
    this.name = 'UnsafeUrlError';
  }
}

export function assertPublicUrl(url: string): void {
  const r = isSafePublicUrl(url);
  if (!r.ok) throw new UnsafeUrlError(url, r.reason ?? 'unsafe');
}
