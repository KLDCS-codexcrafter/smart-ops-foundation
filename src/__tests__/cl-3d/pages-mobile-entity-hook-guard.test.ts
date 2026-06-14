/**
 * @sprint T-CL3d-Components-Mobile-HookSweep
 * @purpose Block 2 guard — zero module-scope hardcoded entity in src/pages/mobile.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/pages/mobile');
const FORBIDDEN = [
  /=\s*DEFAULT_ENTITY_SHORTCODE\s*;?$/m,
];
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}
describe('CL-3d · src/pages/mobile hook-sweep guard', () => {
  it('zero hardcoded entity const', () => {
    const offenders: string[] = [];
    for (const f of walk(ROOT)) {
      const s = readFileSync(f, 'utf8');
      for (const p of FORBIDDEN) if (p.test(s)) { offenders.push(`${f} :: ${p}`); break; }
    }
    expect(offenders).toEqual([]);
  });
});
