/**
 * @sprint  T-CL3e-RawKey-Final-EntityResolution (scope-extended in CL-FEATURES)
 * @purpose REPO-WIDE entity-resolution completeness proof — scans
 *          src/pages + src/components + src/features recursively and
 *          asserts ZERO occurrences of every known hardcoded-entity
 *          variant. After CL-3e + CL-FEATURES the entire
 *          entity-resolution debt (engine-strip + const-sweep + raw-key)
 *          is closed across all reachable surfaces.
 *
 *  No CL-3d-style blind-spot: ALL variants enumerated.
 *  Allow-list is intentionally empty — assertion is toEqual([]).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOTS = [
  join(process.cwd(), 'src/pages'),
  join(process.cwd(), 'src/components'),
  join(process.cwd(), 'src/features'),
];

const FORBIDDEN: RegExp[] = [
  /getItem\(['"]active_entity_code['"]\)/,
  /function\s+getActiveEntityCode/,
  /const\s+E\s*=\s*['"]DEMO['"]/,
  /const\s+ENTITY\s*=\s*['"]DEMO['"]/,
  /=\s*DEFAULT_ENTITY_SHORTCODE\s*;/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.tsx') || p.endsWith('.ts')) out.push(p);
  }
  return out;
}

describe('CL-3e · repo-wide entity-resolution completeness guard', () => {
  it('zero hardcoded entity reads across src/pages + src/components + src/features', () => {
    const offenders: string[] = [];
    for (const root of ROOTS) {
      for (const f of walk(root)) {
        const s = readFileSync(f, 'utf8');
        for (const p of FORBIDDEN) {
          if (p.test(s)) { offenders.push(`${f} :: ${p}`); break; }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
