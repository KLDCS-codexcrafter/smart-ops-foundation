/**
 * @file        src/__tests__/cl-3a/maintainpro-entity-hook-guard.test.ts
 * @sprint      T-CL3a-Maintainpro-HookSweep
 * @purpose     Build-time completeness proof — after the hardcode→hook sweep,
 *              ZERO files in src/pages/erp/maintainpro/** may contain a
 *              module-scope hardcoded entity literal. Mirrors the Tower/Bridge
 *              theme guards: a directory scan asserts the cluster is fully swept.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'src/pages/erp/maintainpro');

const FORBIDDEN = [
  /^const\s+E\s*=\s*'DEMO'\s*;?$/m,
  /^const\s+ENTITY\s*=\s*'DEMO'\s*;?$/m,
  /=\s*DEFAULT_ENTITY_SHORTCODE/,
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

describe('CL-3a · MaintainPro hardcode→hook completeness guard', () => {
  it('contains zero module-scope hardcoded entity literals', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const src = readFileSync(file, 'utf8');
      for (const pat of FORBIDDEN) {
        if (pat.test(src)) {
          offenders.push(`${file} :: ${pat}`);
          break;
        }
      }
    }
    expect(offenders, `Hardcoded entity literals still present:\n${offenders.join('\n')}`).toEqual([]);
  });
});
