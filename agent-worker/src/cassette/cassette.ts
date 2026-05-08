import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { log } from '../util/logger';

function getMode(): 'off' | 'record' | 'replay' {
  const raw = (process.env.CASSETTE_MODE ?? (process.env.NODE_ENV === 'test' ? 'replay' : 'off')) as
    | 'off'
    | 'record'
    | 'replay'
    | string;
  if (raw === 'off' || raw === 'record' || raw === 'replay') return raw;
  return 'off';
}

function getDir(): string {
  return process.env.CASSETTE_DIR ?? path.resolve(__dirname, '..', '..', 'tests', 'cassettes');
}

function safeSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function hashKey(key: unknown): string {
  const s = typeof key === 'string' ? key : JSON.stringify(key);
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
}

function cassettePath(bucket: string, key: unknown, label?: string): string {
  const slug = label ? `${safeSlug(label)}-${hashKey(key)}` : hashKey(key);
  return path.join(getDir(), bucket, `${slug}.json`);
}

interface CassetteFile<T> {
  bucket: string;
  key: unknown;
  label?: string;
  recordedAt: string;
  value: T;
}

export async function through<T>(
  bucket: string,
  key: unknown,
  realFn: () => Promise<T>,
  opts: { label?: string } = {},
): Promise<T> {
  const file = cassettePath(bucket, key, opts.label);
  const mode = getMode();

  if (mode === 'replay') {
    if (!fs.existsSync(file)) {
      throw new Error(
        `[cassette:replay] missing cassette for bucket=${bucket} key=${JSON.stringify(
          key,
        )} at ${file}`,
      );
    }
    const loaded: CassetteFile<T> = JSON.parse(fs.readFileSync(file, 'utf-8'));
    log.debug('cassette hit', { bucket, file });
    return loaded.value;
  }

  const value = await realFn();

  if (mode === 'record') {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const payload: CassetteFile<T> = {
      bucket,
      key,
      label: opts.label,
      recordedAt: new Date().toISOString(),
      value,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2));
    log.info('cassette recorded', { bucket, file });
  }

  return value;
}

export function hasCassette(bucket: string, key: unknown, label?: string): boolean {
  return fs.existsSync(cassettePath(bucket, key, label));
}

export function writeFixture<T>(bucket: string, label: string, key: unknown, value: T): string {
  const file = cassettePath(bucket, key, label);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const payload: CassetteFile<T> = {
    bucket,
    key,
    label,
    recordedAt: new Date().toISOString(),
    value,
  };
  fs.writeFileSync(file, JSON.stringify(payload, null, 2));
  return file;
}
