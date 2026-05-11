/**
 * @file        src/test/shell-memoization.test.ts
 * @purpose     Verify filterSidebarByMatrix is memoized in Shell.tsx (T3.3 hygiene)
 * @sprint      T-Phase-1.A.16c · Block H.3 · NEW · Q-LOCK-12
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const shellSrc = fs.readFileSync(
  path.join(process.cwd(), 'src/shell/Shell.tsx'),
  'utf8',
);

describe('Shell.tsx filterSidebarByMatrix memoization (T3.3)', () => {
  it('imports useMemo from react', () => {
    expect(/import\s*\{[^}]*useMemo[^}]*\}\s*from\s*['"]react['"]/.test(shellSrc)).toBe(true);
  });
  it('wraps filterSidebarByMatrix in useMemo', () => {
    expect(/useMemo[\s\S]{0,200}filterSidebarByMatrix/.test(shellSrc)).toBe(true);
  });
  it('dependency array includes sidebar items + profile + entitlements', () => {
    const match = shellSrc.match(/useMemo\(\s*\(\)\s*=>\s*filterSidebarByMatrix[\s\S]*?\],/);
    expect(match).not.toBeNull();
    const deps = match?.[0] ?? '';
    expect(deps).toMatch(/config\.sidebar\.items/);
    expect(deps).toMatch(/userProfile/);
    expect(deps).toMatch(/tenantEntitlements/);
  });
});
