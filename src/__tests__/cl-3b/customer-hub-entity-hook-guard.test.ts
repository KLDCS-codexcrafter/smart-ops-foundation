/**
 * @sprint T-CL3b-MidClusters-HookSweep
 * @purpose Completeness guard — zero module-scope hardcoded entity literals in customer-hub.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/pages/erp/customer-hub');
const FORBIDDEN = [
  /^const\s+E\s*=\s*'DEMO'\s*;?$/m,
  /^const\s+ENTITY\s*=\s*'DEMO'\s*;?$/m,
  /^const\s+ENTITY\s*=\s*DEFAULT_ENTITY_SHORTCODE\s*;?$/m,
  /^\s*const\s+entityCode\s*=\s*DEFAULT_ENTITY_SHORTCODE\s*;?$/m,
  /^\s*const\s+entity\s*=\s*DEFAULT_ENTITY_SHORTCODE\s*;?$/m,
];
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}
describe('CL-3b · customer-hub hook-sweep guard', () => {
  it('zero module-scope hardcoded entity literals', () => {
    const offenders: string[] = [];
    for (const f of walk(ROOT)) {
      const s = readFileSync(f, 'utf8');
      for (const p of FORBIDDEN) if (p.test(s)) { offenders.push(`${f} :: ${p}`); break; }
    }
    expect(offenders).toEqual([]);
  });
});
