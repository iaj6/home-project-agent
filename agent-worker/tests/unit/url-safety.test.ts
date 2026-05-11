import { describe, it, expect } from 'vitest';
import { isSafePublicUrl, assertPublicUrl, UnsafeUrlError } from '../../src/util/url-safety';

describe('SSRF guard', () => {
  it('allows public https URLs', () => {
    expect(isSafePublicUrl('https://www.homedepot.com/p/123').ok).toBe(true);
    expect(isSafePublicUrl('http://www.homeadvisor.com/cost/').ok).toBe(true);
    expect(isSafePublicUrl('https://i.ytimg.com/vi/abc/hqdefault.jpg').ok).toBe(true);
  });

  it('blocks GCE metadata server (the actual exploit)', () => {
    const r = isSafePublicUrl('http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/private|reserved|link-local/i);
  });

  it('blocks localhost and loopback', () => {
    expect(isSafePublicUrl('http://localhost:8080/').ok).toBe(false);
    expect(isSafePublicUrl('http://127.0.0.1/').ok).toBe(false);
    expect(isSafePublicUrl('http://[::1]/').ok).toBe(false);
  });

  it('blocks private IPv4 ranges', () => {
    expect(isSafePublicUrl('http://10.0.0.1/').ok).toBe(false);
    expect(isSafePublicUrl('http://192.168.1.1/').ok).toBe(false);
    expect(isSafePublicUrl('http://172.16.0.1/').ok).toBe(false);
    expect(isSafePublicUrl('http://172.31.255.254/').ok).toBe(false);
    // outside the /12, should pass
    expect(isSafePublicUrl('http://172.32.0.1/').ok).toBe(true);
  });

  it('blocks GCE metadata DNS names', () => {
    expect(isSafePublicUrl('http://metadata.google.internal/').ok).toBe(false);
    expect(isSafePublicUrl('http://metadata/').ok).toBe(false);
  });

  it('blocks .local and .internal TLDs', () => {
    expect(isSafePublicUrl('http://printer.local/').ok).toBe(false);
    expect(isSafePublicUrl('http://service.internal/').ok).toBe(false);
  });

  it('blocks non-http(s) schemes', () => {
    expect(isSafePublicUrl('file:///etc/passwd').ok).toBe(false);
    expect(isSafePublicUrl('ftp://example.com/').ok).toBe(false);
    expect(isSafePublicUrl('gopher://example.com/').ok).toBe(false);
    expect(isSafePublicUrl('javascript:alert(1)').ok).toBe(false);
  });

  it('rejects malformed URLs', () => {
    expect(isSafePublicUrl('not a url').ok).toBe(false);
    expect(isSafePublicUrl('').ok).toBe(false);
  });

  it('assertPublicUrl throws UnsafeUrlError on bad URLs', () => {
    expect(() => assertPublicUrl('http://169.254.169.254/')).toThrow(UnsafeUrlError);
    expect(() => assertPublicUrl('https://www.homedepot.com/')).not.toThrow();
  });
});
