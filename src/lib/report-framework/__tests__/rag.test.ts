/**
 * @file        rag.test.ts
 * @purpose     Unit tests for the pure RAG resolver.
 * @sprint      RPT-2a-i · Dashboard primitive
 */
import { describe, it, expect } from 'vitest';
import { resolveRag, RAG_PALETTE } from '@/lib/report-framework/rag';

describe('RPT-2a-i · resolveRag · higher-good direction', () => {
  const t = { amber: 90, red: 70, direction: 'higher-good' as const };
  it('returns green at and above amber edge', () => {
    expect(resolveRag(95, t)).toBe('green');
    expect(resolveRag(90, t)).toBe('green');
  });
  it('returns amber between red and amber', () => {
    expect(resolveRag(80, t)).toBe('amber');
    expect(resolveRag(70, t)).toBe('amber');
  });
  it('returns red below the red edge', () => {
    expect(resolveRag(50, t)).toBe('red');
    expect(resolveRag(0, t)).toBe('red');
  });
});

describe('RPT-2a-i · resolveRag · lower-good direction', () => {
  const t = { amber: 1_000_000, red: 5_000_000, direction: 'lower-good' as const };
  it('returns green at and below amber edge', () => {
    expect(resolveRag(500_000, t)).toBe('green');
    expect(resolveRag(1_000_000, t)).toBe('green');
  });
  it('returns amber between amber and red', () => {
    expect(resolveRag(3_000_000, t)).toBe('amber');
    expect(resolveRag(5_000_000, t)).toBe('amber');
  });
  it('returns red above the red edge', () => {
    expect(resolveRag(9_000_000, t)).toBe('red');
  });
});

describe('RPT-2a-i · RAG_PALETTE', () => {
  it('maps all 3 statuses to non-empty token classes', () => {
    expect(RAG_PALETTE.green).toMatch(/text-/);
    expect(RAG_PALETTE.amber).toMatch(/text-/);
    expect(RAG_PALETTE.red).toMatch(/text-/);
  });
});
