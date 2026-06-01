/**
 * @file        no-bare-void-append-audit.test.ts
 * @sprint      T-Phase-6.A.1.1-T1 · S102 T1 hotfix · Block 2
 * @purpose     Regression guard: ZERO bare `void appendAuditEntry(` may exist
 *              anywhere under src/ (excluding test files). All fire-and-forget
 *              call sites MUST use appendAuditEntrySafe (DP-A1-2).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'test' || entry === '__tests__' || entry === 'node_modules') continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('S102 T1 · no bare void appendAuditEntry in src/', () => {
  it('finds zero bare `void appendAuditEntry(` occurrences (use appendAuditEntrySafe)', () => {
    const files = walk('src');
    const pattern = /\bvoid\s+appendAuditEntry\s*\(/;
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      if (pattern.test(src)) offenders.push(f);
    }
    expect(offenders, `Offenders:\n${offenders.join('\n')}`).toEqual([]);
  });
});
