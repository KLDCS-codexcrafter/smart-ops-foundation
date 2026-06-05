/**
 * @file   src/test/sprint-152/sw-hardening.test.ts
 * @sprint Sprint 152 · T4 hotfix · public/sw.js v2 rewrite + chunk-reload helper
 *
 * Covers:
 *   1. public/sw.js declares CACHE_VERSION = 'opx-v2' (self-heal mechanism)
 *   2. isChunkLoadError detects dynamic-import / chunk-load failures
 *   3. shouldAutoReloadOnce sets the flag exactly once per session (no loops)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  CHUNK_RELOAD_FLAG,
  isChunkLoadError,
  shouldAutoReloadOnce,
} from '@/lib/chunk-reload-helper';

function memStorage(): Pick<Storage, 'getItem' | 'setItem'> & { _data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    _data: data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
}

describe('S152.T4 · public/sw.js v2 hardening', () => {
  const sw = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf8');

  it('declares CACHE_VERSION = "opx-v2" (purges v1 on activate → self-heal)', () => {
    expect(sw).toMatch(/CACHE_VERSION\s*=\s*['"]opx-v2['"]/);
  });

  it('contains preview-host kill-switch for lovableproject.com / lovable.app', () => {
    expect(sw).toMatch(/lovableproject\.com/);
    expect(sw).toMatch(/lovable\.app/);
    expect(sw).toMatch(/self\.registration\.unregister\s*\(\s*\)/);
  });

  it('uses network-first for navigations + JS/CSS (no frozen module graph)', () => {
    expect(sw).toMatch(/request\.mode\s*===\s*['"]navigate['"]/);
    expect(sw).toMatch(/isCodeAsset/);
  });
});

describe('S152.T4 · chunk-reload-helper · isChunkLoadError', () => {
  it('matches "Failed to fetch dynamically imported module"', () => {
    expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /x.tsx'))).toBe(true);
  });

  it('matches "Loading chunk N failed"', () => {
    expect(isChunkLoadError(new Error('Loading chunk 42 failed'))).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isChunkLoadError(new Error('TypeError: foo is undefined'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});

describe('S152.T4 · chunk-reload-helper · shouldAutoReloadOnce', () => {
  it('returns true on first chunk error and sets the flag', () => {
    const s = memStorage();
    const err = new Error('Failed to fetch dynamically imported module: /a.tsx');
    expect(shouldAutoReloadOnce(err, s)).toBe(true);
    expect(s._data[CHUNK_RELOAD_FLAG]).toBeDefined();
  });

  it('returns false on second chunk error (loop prevention)', () => {
    const s = memStorage();
    const err = new Error('Failed to fetch dynamically imported module: /a.tsx');
    expect(shouldAutoReloadOnce(err, s)).toBe(true);
    expect(shouldAutoReloadOnce(err, s)).toBe(false);
  });

  it('returns false for non-chunk errors and leaves flag unset', () => {
    const s = memStorage();
    expect(shouldAutoReloadOnce(new Error('some other failure'), s)).toBe(false);
    expect(s._data[CHUNK_RELOAD_FLAG]).toBeUndefined();
  });
});
