/**
 * W1C-2 · Block 5 · Institutional invariants.
 * - sprint-history backfill W1C-1 to 9a47f31
 * - sprint-history self-seed W1C-2 (T-W1C2-Polish-Riders)
 * - sprint-81a ESLint-inside-vitest case skipped with rationale
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const HISTORY = readFileSync(resolve(process.cwd(), 'src/lib/_institutional/sprint-history.ts'), 'utf8');
const SPRINT_81A = readFileSync(resolve(process.cwd(), 'src/test/sprint-81a/comply360-sprint-81a.test.ts'), 'utf8');

describe('W1C-2 Block 5 · sprint-history', () => {
  it('W1C-1 backfilled to 9a47f31', () => {
    expect(HISTORY).toMatch(/sprintNumber: 'W1C1'[\s\S]{0,300}headSha: '9a47f31'/);
    expect(HISTORY).toMatch(/sprintNumber: 'W1C1'[\s\S]{0,300}provenance: 'CONFIRMED'/);
  });
  it('W1C-2 self-seeded as T-W1C2-Polish-Riders', () => {
    expect(HISTORY).toContain("'T-W1C2-Polish-Riders'");
    expect(HISTORY).toMatch(/sprintNumber: 'W1C2'/);
  });
  it('W1C-2 declares zero new SIBLINGs', () => {
    expect(HISTORY).toMatch(/sprintNumber: 'W1C2'[\s\S]{0,300}newSiblings: \[\]/);
  });
});

describe('W1C-2 Block 5 · sprint-81a relaxation', () => {
  it('ESLint-inside-vitest case converted to it.skip with rationale', () => {
    expect(SPRINT_81A).toMatch(/it\.skip\(['"]ESLint STRICT 0 errors AND 0 warnings/);
    expect(SPRINT_81A).toContain('W1C-2: superseded by direct pipeline gate');
  });
  it('other 52 cases untouched (sample structural check still present)', () => {
    expect(SPRINT_81A).toContain("src/pages/erp/comply360/internal-audit/DashboardPage.tsx");
  });
});
