import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { through } from '../../src/cassette/cassette';

describe('cassette harness', () => {
  let tmpDir: string;
  let savedMode: string | undefined;
  let savedDir: string | undefined;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cassettes-'));
    savedMode = process.env.CASSETTE_MODE;
    savedDir = process.env.CASSETTE_DIR;
    process.env.CASSETTE_DIR = tmpDir;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    if (savedDir === undefined) delete process.env.CASSETTE_DIR;
    else process.env.CASSETTE_DIR = savedDir;
    if (savedMode === undefined) delete process.env.CASSETTE_MODE;
    else process.env.CASSETTE_MODE = savedMode;
  });

  it('records real output in record mode and replays it on the next call', async () => {
    process.env.CASSETTE_MODE = 'record';
    const counter = { n: 0 };
    const key = { url: 'example.com', q: 'foo' };

    const first = await through('test-bucket', key, async () => {
      counter.n += 1;
      return { value: 42, call: counter.n };
    });
    expect(first.value).toBe(42);
    expect(first.call).toBe(1);

    process.env.CASSETTE_MODE = 'replay';
    const second = await through('test-bucket', key, async () => {
      counter.n += 1;
      return { value: -1, call: counter.n };
    });
    expect(second.value).toBe(42);
    expect(second.call).toBe(1);
    expect(counter.n).toBe(1);
  });

  it('throws on replay miss', async () => {
    process.env.CASSETTE_MODE = 'replay';
    await expect(
      through('test-bucket', { url: 'never-recorded' }, async () => ({ x: 1 })),
    ).rejects.toThrow(/missing cassette/);
  });

  it('passes through in off mode with no side effects', async () => {
    process.env.CASSETTE_MODE = 'off';
    let calls = 0;
    const first = await through('test-bucket', { k: 1 }, async () => {
      calls++;
      return { ok: true };
    });
    const second = await through('test-bucket', { k: 1 }, async () => {
      calls++;
      return { ok: true };
    });
    expect(first).toEqual({ ok: true });
    expect(second).toEqual({ ok: true });
    expect(calls).toBe(2);
  });
});
