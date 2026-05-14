/**
 * Hardening-A · Source-level test for divisionsKey / departmentsKey + ESLint rule + ErrorBoundary props.
 * Mirrors maintainpro-status-flip.test.ts pattern · no @testing-library/react.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { divisionsKey, departmentsKey } from '@/types/org-structure';

describe('Hardening-A · Block A · Entity-scoped key helpers', () => {
  it('divisionsKey scopes by entityCode', () => {
    expect(divisionsKey('SMRT')).toBe('erp_divisions_SMRT');
  });
  it('divisionsKey falls back to legacy global key when entity empty', () => {
    expect(divisionsKey('')).toBe('erp_divisions');
  });
  it('departmentsKey scopes by entityCode', () => {
    expect(departmentsKey('SMRT')).toBe('erp_departments_SMRT');
  });
  it('departmentsKey falls back to legacy global key when entity empty', () => {
    expect(departmentsKey('')).toBe('erp_departments');
  });
});

describe('Hardening-A · Block A · ESLint custom rule registered', () => {
  const cfg = readFileSync(resolve(process.cwd(), 'eslint.config.js'), 'utf8');
  it('eslint.config.js declares hardening-a/no-hardcoded-scoped-key rule', () => {
    expect(cfg).toMatch(/hardening-a\/no-hardcoded-scoped-key/);
  });
  it('rule covers all four scoped key prefixes', () => {
    expect(cfg).toMatch(/erp_employees\|erp_attendance_records\|erp_divisions\|erp_departments/);
  });
  it('rule severity is warn (escalation deferred to Hardening-B)', () => {
    expect(cfg).toMatch(/"hardening-a\/no-hardcoded-scoped-key":\s*"warn"/);
  });
});

describe('Hardening-A · Block A · Call-site migrations', () => {
  it('FoundationModule consumes scoped helpers', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/features/command-center/modules/FoundationModule.tsx'), 'utf8');
    expect(src).toMatch(/divisionsKey\(entityCode\)/);
    expect(src).toMatch(/departmentsKey\(entityCode\)/);
  });
  it('VendorMaster consumes scoped helpers', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/masters/VendorMaster.tsx'), 'utf8');
    expect(src).toMatch(/divisionsKey\(entityCode\)/);
    expect(src).toMatch(/departmentsKey\(entityCode\)/);
  });
});

describe('Hardening-A · Block B · ErrorBoundary per-card props', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/components/ErrorBoundary.tsx'), 'utf8');
  it('exposes optional cardName + onReset props', () => {
    expect(src).toMatch(/cardName\?:\s*string/);
    expect(src).toMatch(/onReset\?:\s*\(\)\s*=>\s*void/);
  });
  it('renders "Return to dashboard" when card-level', () => {
    expect(src).toMatch(/Return to dashboard/);
  });
  it('preserves backward-compatible "Refresh page" fallback', () => {
    expect(src).toMatch(/Refresh page/);
    expect(src).toMatch(/window\.location\.reload\(\)/);
  });
  it('Shell.tsx wraps children in per-card ErrorBoundary keyed by route', () => {
    const shell = readFileSync(resolve(process.cwd(), 'src/shell/Shell.tsx'), 'utf8');
    expect(shell).toMatch(/<ErrorBoundary[\s\S]*?key=\{location\.pathname\}/);
    expect(shell).toMatch(/cardName=\{cardName\}/);
    expect(shell).toMatch(/onReset=\{\(\)\s*=>\s*navigate\('\/erp\/dashboard'\)\}/);
  });
});
