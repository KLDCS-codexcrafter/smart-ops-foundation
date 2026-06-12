/**
 * @sprint W1C-3 Block 4 — institutional backfill + self-seed
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/lib/_institutional/sprint-history.ts', 'utf8');

describe('W1C-3 · sprint-history', () => {
  it('W1C-2 headSha backfilled to 64a81ff', () => {
    expect(src).toMatch(/code: 'T-W1C2-Polish-Riders'[\s\S]{0,400}headSha: '64a81ff'/);
  });

  it('W1C-3 self-seeded as T-W1C3-ComingSoon-WelcomeTruth', () => {
    expect(src).toMatch(/code: 'T-W1C3-ComingSoon-WelcomeTruth'/);
  });

  it('ZERO new SIBLINGs on W1C-3', () => {
    const m = src.match(/code: 'T-W1C3-ComingSoon-WelcomeTruth'[\s\S]{0,500}newSiblings:\s*\[\s*\]/);
    expect(m).not.toBeNull();
  });
});
