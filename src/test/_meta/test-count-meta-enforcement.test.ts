/**
 * @file        src/test/_meta/test-count-meta-enforcement.test.ts
 * @sprint      Sprint 88 · v1.30 §N · sprint-NN test pack must contain >=20 it() blocks (Form A floor)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const TEST_ROOT = path.resolve(__dirname, '..');

function countItBlocks(src: string): number {
  // Count `it(`, `it.only(`, `it.skip(`, `it.each(` occurrences (non-comment lines).
  let count = 0;
  for (const line of src.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    const m = trimmed.match(/\bit(?:\.(?:only|skip|each))?\s*\(/g);
    if (m) count += m.length;
  }
  return count;
}

describe('v1.30 §N · Form A floor (>=20 it() blocks) per Comply360 sprint pack', () => {
  it('every src/test/sprint-NN/ folder for Comply360-era sprints (>=77) has >=20 it() blocks', () => {
    const dirs = fs.readdirSync(TEST_ROOT, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^sprint-\d+$/.test(d.name))
      .filter((d) => {
        const n = Number(d.name.replace('sprint-', ''));
        return n >= 77;
      });
    expect(dirs.length).toBeGreaterThan(0);
    for (const d of dirs) {
      const folder = path.join(TEST_ROOT, d.name);
      const files = fs.readdirSync(folder).filter((f) => f.endsWith('.test.ts'));
      let total = 0;
      for (const f of files) {
        total += countItBlocks(fs.readFileSync(path.join(folder, f), 'utf8'));
      }
      if (files.length > 0) {
        expect(total, `${d.name} pack should have >=20 it() blocks (got ${total})`).toBeGreaterThanOrEqual(20);
      }
    }
  });
});
