/**
 * Sprint 79d · Hygiene Pass · FA-tile location fix + 2 bundled hygiene items.
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import { SPRINTS, getSprintCount, getCurrentAStreak } from '@/lib/_institutional/sprint-history';
import { getSiblingCount } from '@/lib/_institutional/sibling-register';

describe('Sprint 79d · Pass Hygiene · FA-tile location fix + 2 bundled hygiene items', () => {
  it('Sprint 79d entry exists with code T-Phase-5.A.1.11-HYGIENE-D', () => {
    expect(SPRINTS.some(s => s.code === 'T-Phase-5.A.1.11-HYGIENE-D')).toBe(true);
  });
  it('A-streak >= 34', () => {
    expect(getCurrentAStreak()).toBeGreaterThanOrEqual(34);
  });
  it('SPRINTS >= 87', () => {
    expect(getSprintCount()).toBeGreaterThanOrEqual(87);
  });
  it('SIBLINGs still >= 91 (no engine additions in hygiene pass)', () => {
    expect(getSiblingCount()).toBeGreaterThanOrEqual(91);
  });
  it('Sprint 79c SHA backfilled · e3a0a7d36e2f3fc33e1062498d2959f49ee31caf', () => {
    const s79c = SPRINTS.find(s => s.code === 'T-Phase-5.A.1.11-PASS-C');
    expect(s79c?.headSha).toBe('e3a0a7d36e2f3fc33e1062498d2959f49ee31caf');
  });

  it('FixedAssetsHealthPage.tsx exists', () => {
    expect(fs.existsSync('src/pages/erp/comply360/fixed-assets/FixedAssetsHealthPage.tsx')).toBe(true);
  });
  it('LedgerPackPage.tsx still exists', () => {
    expect(fs.existsSync('src/pages/erp/comply360/fixed-assets/LedgerPackPage.tsx')).toBe(true);
  });
  it('LedgerPackPage has >=2 TabsTrigger (Health + Ledger Pack · FR-106 10th scenario)', () => {
    const src = fs.readFileSync('src/pages/erp/comply360/fixed-assets/LedgerPackPage.tsx', 'utf-8');
    const count = (src.match(/<TabsTrigger /g) || []).length;
    expect(count).toBeGreaterThanOrEqual(2);
  });
  it('LedgerPackPage imports FixedAssetsHealthPage', () => {
    const src = fs.readFileSync('src/pages/erp/comply360/fixed-assets/LedgerPackPage.tsx', 'utf-8');
    expect(src).toContain('FixedAssetsHealthPage');
  });

  it("Comply360Page has case 'fixed-assets'", () => {
    const src = fs.readFileSync('src/pages/erp/comply360/Comply360Page.tsx', 'utf-8');
    expect(src).toContain("case 'fixed-assets'");
  });

  it('Dashboard.tsx no longer declares fixed-assets LaneDef', () => {
    const src = fs.readFileSync('src/pages/erp/Dashboard.tsx', 'utf-8');
    expect(src).not.toContain("id: 'fixed-assets'");
  });
  it('Dashboard.tsx no longer contains buildFATiles or FATile', () => {
    const src = fs.readFileSync('src/pages/erp/Dashboard.tsx', 'utf-8');
    expect(src).not.toContain('buildFATiles');
    expect(src).not.toContain('function FATile');
  });
  it('Dashboard.tsx no longer imports loadObligations', () => {
    const src = fs.readFileSync('src/pages/erp/Dashboard.tsx', 'utf-8');
    expect(src).not.toContain('loadObligations');
  });
  it("Dashboard.tsx no longer has custom?: 'fixed-assets' LaneDef field", () => {
    const src = fs.readFileSync('src/pages/erp/Dashboard.tsx', 'utf-8');
    expect(src).not.toContain("custom?: 'fixed-assets'");
    expect(src).not.toContain("custom: 'fixed-assets'");
  });

  it('FixedAssetsHealthPage renders 4 tile titles', () => {
    const src = fs.readFileSync('src/pages/erp/comply360/fixed-assets/FixedAssetsHealthPage.tsx', 'utf-8');
    expect(src).toContain("title: 'FA Health'");
    expect(src).toContain("title: 'Compliance'");
    expect(src).toContain("title: 'Custodian'");
    expect(src).toContain("title: 'IoT Stream'");
  });

  it('FixedAssetsHealthPage caption uses customer-friendly language', () => {
    const src = fs.readFileSync('src/pages/erp/comply360/fixed-assets/FixedAssetsHealthPage.tsx', 'utf-8');
    expect(src).toContain('Real-time stream count');
    expect(src).not.toContain('FAR-CAP-23');
    expect(src).not.toContain('FK-CAP-7 preserved');
  });

  it('Hygiene · GSTR10 PLACEHOLDER replaced with realistic value', () => {
    const out = execSync("grep -rn 'CNCL/PLACEHOLDER' src/ || true", { encoding: 'utf-8' });
    expect(out.trim()).toBe('');
  });
  it("Hygiene · S74b grade-label flipped to 'A with adaptations'", () => {
    const src = fs.readFileSync('src/lib/_institutional/sprint-history.ts', 'utf-8');
    const s74bMatch = src.match(/sprintNumber: 74,[\s\S]*?code: 'T-Phase-5\.A\.1\.6-PASS-B',[\s\S]*?grade: '([^']+)'/);
    expect(s74bMatch?.[1]).toBe('A with adaptations');
  });

  it('FR-105 done-gate · no equality on registry counts in src/test/', () => {
    const eq = ').to' + 'Be(';
    const pat = `getSiblingCount()${eq}\\|getSprintCount()${eq}\\|getCurrentAStreak()${eq}`;
    const cmd = `grep -rn --include='*.ts' --exclude='comply360-sprint-77b.test.ts' --exclude='comply360-sprint-78b.test.ts' --exclude='comply360-sprint-79b.test.ts' --exclude='comply360-sprint-79d.test.ts' "${pat}" src/test/ || true`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    expect(out.trim()).toBe('');
  });
});
