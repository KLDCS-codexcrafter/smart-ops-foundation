/**
 * W1C-5 Block 5 · Decimal Sweep guard test.
 *
 * Asserts that the precision-math canon (decimal-helpers: dMul/dAdd/dSum/dPct/round2)
 * is used across financial engines. This is a lint-style smoke test — it verifies
 * the canon is wired in, not exhaustive of every line.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../lib');

function listTs(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTs(p));
    else if (e.isFile() && p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('W1C-5 Block 5 · Decimal sweep', () => {
  it('decimal-helpers canon exists and exports dMul/dAdd/dSum', async () => {
    const helpers = await import('@/lib/decimal-helpers');
    expect(typeof (helpers as any).dMul).toBe('function');
    expect(typeof (helpers as any).dAdd).toBe('function');
    expect(typeof (helpers as any).dSum).toBe('function');
  });

  it('at least one finance engine consumes the decimal-helpers canon', () => {
    const files = listTs(ROOT);
    const consumers = files.filter((f) => {
      const src = fs.readFileSync(f, 'utf8');
      return /from ['"]@?\/?.*decimal-helpers['"]/.test(src) || /from ['"]\.\/decimal-helpers['"]/.test(src);
    });
    expect(consumers.length).toBeGreaterThan(0);
  });
});
