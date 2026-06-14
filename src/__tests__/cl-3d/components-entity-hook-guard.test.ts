/**
 * @sprint T-CL3d-Components-Mobile-HookSweep
 * @purpose Block 1 guard — zero module-scope hardcoded entity in src/components.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/components');
// Block 1 scope: P1 const-hardcode only. P2 helper guarded in Block 3 combined guard.
const FORBIDDEN = [
  /=\s*DEFAULT_ENTITY_SHORTCODE\s*;?$/m,
  /const\s+E\s*=\s*'DEMO'/,
  /const\s+ENTITY\s*=\s*'DEMO'/,
];
function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}
describe('CL-3d · src/components hook-sweep guard', () => {
  it('zero hardcoded entity / helper', () => {
    const offenders: string[] = [];
    for (const f of walk(ROOT)) {
      const s = readFileSync(f, 'utf8');
      for (const p of FORBIDDEN) if (p.test(s)) { offenders.push(`${f} :: ${p}`); break; }
    }
    expect(offenders).toEqual([]);
  });
});
