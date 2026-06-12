/**
 * W1C-4 · Block 1 · NO direct-send paths grep-lock.
 * The engine MUST NOT carry mailto / fetch / smtp delivery code — it is
 * pure orchestration onto the existing outbox.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('src/lib/auto-send-rules-engine.ts', 'utf8');

describe('W1C-4 · no-direct-send grep-lock', () => {
  it('engine source contains no mailto: literal', () => {
    expect(SRC.toLowerCase()).not.toMatch(/mailto:/);
  });
  it('engine source contains no fetch( call', () => {
    expect(SRC).not.toMatch(/\bfetch\s*\(/);
  });
  it('engine source contains no XMLHttpRequest / smtp / sendmail tokens', () => {
    expect(SRC).not.toMatch(/XMLHttpRequest/);
    expect(SRC.toLowerCase()).not.toMatch(/\bsmtp\b/);
    expect(SRC.toLowerCase()).not.toMatch(/sendmail/);
  });
  it('every enqueue uses queued_for_wave2 (canon)', () => {
    expect(SRC).toMatch(/delivery_mode:\s*'queued_for_wave2'/);
  });
});
