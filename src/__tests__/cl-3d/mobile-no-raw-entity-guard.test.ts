/**
 * @sprint T-CL3d-Components-Mobile-HookSweep
 * @purpose Block 3 combined guard — zero const + zero helper + zero raw-key reads in mobile.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = [
  join(process.cwd(), 'src/components/mobile'),
  join(process.cwd(), 'src/pages/mobile'),
];
const FORBIDDEN = [
  /=\s*DEFAULT_ENTITY_SHORTCODE\s*;?$/m,
  /function\s+getActiveEntityCode\s*\(/,
  /getItem\(\s*['"]active_entity_code['"]\s*\)/,
];
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}
describe('CL-3d · combined mobile no-raw-entity guard', () => {
  it('zero const + zero helper + zero raw-key reads', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const f of walk(root)) {
        const s = readFileSync(f, 'utf8');
        for (const p of FORBIDDEN) if (p.test(s)) { offenders.push(`${f} :: ${p}`); break; }
      }
    }
    expect(offenders).toEqual([]);
  });
});
