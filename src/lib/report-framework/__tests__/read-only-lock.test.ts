/**
 * @file        read-only-lock.test.ts
 * @purpose     Grep-assert that core/ is React-free and write-free.
 *              The read-only-lock that makes the analytics layer provably non-mutating.
 * @sprint      RPT-1a · AC#4 + AC#5
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const CORE_DIR = join(process.cwd(), 'src/lib/report-framework');

function listCoreFiles(): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(CORE_DIR)) {
    const full = join(CORE_DIR, entry);
    if (statSync(full).isFile() && (entry.endsWith('.ts') || entry.endsWith('.tsx'))) {
      out.push(full);
    }
  }
  return out;
}

describe('RPT-1a · read-only-lock · core/ is React-free and write-free', () => {
  const files = listCoreFiles();

  it('finds at least the 5 core files', () => {
    expect(files.length).toBeGreaterThanOrEqual(5);
  });

  it('no core file imports React', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(/from\s+['"]react['"]/.test(src), `${f} imports react`).toBe(false);
      expect(/from\s+['"]react-dom['"]/.test(src), `${f} imports react-dom`).toBe(false);
    }
  });

  it('no core file uses React hooks', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(/\buseState\s*\(/.test(src), `${f} uses useState`).toBe(false);
      expect(/\buseEffect\s*\(/.test(src), `${f} uses useEffect`).toBe(false);
      expect(/\buseMemo\s*\(/.test(src), `${f} uses useMemo`).toBe(false);
      expect(/\buseCallback\s*\(/.test(src), `${f} uses useCallback`).toBe(false);
      expect(/\buseContext\s*\(/.test(src), `${f} uses useContext`).toBe(false);
    }
  });

  it('no core file writes via localStorage.setItem', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(/localStorage\.setItem/.test(src), `${f} writes localStorage`).toBe(false);
    }
  });

  it('no core file calls post*/save*/write* voucher fns', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(/\bpostVoucher\b/.test(src), `${f} calls postVoucher`).toBe(false);
      expect(/\bsaveVoucher\b/.test(src), `${f} calls saveVoucher`).toBe(false);
      expect(/\bwriteVoucher\b/.test(src), `${f} calls writeVoucher`).toBe(false);
    }
  });
});
