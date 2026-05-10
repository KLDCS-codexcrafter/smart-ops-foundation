/**
 * @file src/test/qualicheck-routing.test.ts
 * @purpose Block G coverage · QualiCheckPage module union + sidebar config invariants for the 8 α-d-1 NEW reports.
 * @who QA Manager · Quality Inspector
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-T1-AuditFix · Block C (closes Block G test gap from α-d-1)
 * @iso ISO 25010 Maintainability · Testability
 * @whom Audit Owner
 * @decisions D-NEW-CC canonical (sidebar keyboard uniqueness)
 * @disciplines FR-30 · FR-32
 * @reuses qualicheck-sidebar-config · QualiCheckSidebar.types
 * @[JWT] N/A (config / type level)
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { qualicheckSidebarItems } from '@/apps/erp/configs/qualicheck-sidebar-config';
import type { SidebarItem } from '@/shell/types';
import type { QualiCheckModule } from '@/pages/erp/qualicheck/QualiCheckSidebar.types';

function flatten(items: ReadonlyArray<SidebarItem>): SidebarItem[] {
  const out: SidebarItem[] = [];
  const walk = (arr: ReadonlyArray<SidebarItem>): void => {
    for (const it of arr) {
      out.push(it);
      if (it.children && it.children.length > 0) walk(it.children);
    }
  };
  walk(items);
  return out;
}

describe('QualiCheck sidebar config · D-NEW-CC canonical (T1 Block C)', () => {
  it('all keyboard shortcuts are unique', () => {
    const flat = flatten(qualicheckSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    const dedup = new Set(kbs);
    expect(dedup.size).toBe(kbs.length);
  });

  it('all 8 new α-d-1 module IDs are present in sidebar config', () => {
    const flat = flatten(qualicheckSidebarItems);
    const ids = new Set(flat.map((i) => i.moduleId).filter((m): m is string => Boolean(m)));
    const expected = [
      'stk-iqc-st-remarks', 'qc-transfer-reg', 'qc-godown-summary', 'qc-stk-trnsfer',
      'rinsp-report-page', 'qc-rejection-analysis', 'fg-receiving-inspection', 'reprocess-report',
    ];
    for (const e of expected) expect(ids.has(e)).toBe(true);
  });

  it('QualiCheckModule union accepts all 8 new module IDs at type level', () => {
    const candidates: QualiCheckModule[] = [
      'stk-iqc-st-remarks',
      'qc-transfer-reg',
      'qc-godown-summary',
      'qc-stk-trnsfer',
      'rinsp-report-page',
      'qc-rejection-analysis',
      'fg-receiving-inspection',
      'reprocess-report',
    ];
    expect(candidates.length).toBe(8);
  });

  it('NEW Trident QC Reports group present and contains all 8 α-d-1 module IDs', () => {
    const flat = flatten(qualicheckSidebarItems);
    const trident = flat.find((i) => i.id === 'trident-qc-reports-group');
    expect(trident).toBeDefined();
    expect(trident?.type).toBe('group');
    const childIds = new Set((trident?.children ?? []).map((c) => c.moduleId).filter((m): m is string => Boolean(m)));
    const expected = [
      'stk-iqc-st-remarks', 'qc-transfer-reg', 'qc-godown-summary', 'qc-stk-trnsfer',
      'rinsp-report-page', 'qc-rejection-analysis', 'fg-receiving-inspection', 'reprocess-report',
    ];
    for (const e of expected) expect(childIds.has(e)).toBe(true);
  });

  it('Q-LOCK-9a · qualicheck status flipped to active at α-d-2 close', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = (mod as { applications?: ReadonlyArray<{ id: string; status: string }> }).applications;
    expect(apps).toBeDefined();
    const q = apps?.find((a) => a.id === 'qualicheck');
    expect(q?.status).toBe('active');
  });

  it('Reports group cleanly purged of the 8 α-d-1 moduleIds (they live in Trident sub-group only)', () => {
    const flat = flatten(qualicheckSidebarItems);
    const reportsGroup = flat.find((i) => i.id === 'reports-group');
    expect(reportsGroup).toBeDefined();
    const directChildIds = new Set(
      (reportsGroup?.children ?? [])
        .filter((c) => c.id !== 'trident-qc-reports-group')
        .map((c) => c.moduleId)
        .filter((m): m is string => Boolean(m)),
    );
    const movedIds = [
      'stk-iqc-st-remarks', 'qc-transfer-reg', 'qc-godown-summary', 'qc-stk-trnsfer',
      'rinsp-report-page', 'qc-rejection-analysis', 'fg-receiving-inspection', 'reprocess-report',
    ];
    for (const id of movedIds) {
      expect(directChildIds.has(id)).toBe(false);
    }
  });
});

// T-Phase-1.H.2 · QualiCheck Reverse Naming Migration · NEW tests
import { readFileSync } from 'fs';

describe('T-Phase-1.H.2 · QualiCheck Reverse Naming Migration', () => {
  it('Q-LOCK-5a · applications.ts uses id="qualicheck" name="QualiCheck" · D-NEW-CN canonical', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = mod.applications;
    const qc = apps.find((a) => a.id === 'qualicheck');
    expect(qc).toBeDefined();
    expect(qc?.name).toBe('QualiCheck');
    expect(qc?.route).toBe('/erp/qualicheck');
    expect(apps.find((a) => (a.id as string) === 'qulicheak')).toBeUndefined();
  });

  it('Q-LOCK-7a · /erp/qulicheak redirects to /erp/qualicheck (D-NEW-CM Legacy Redirect Convention)', () => {
    const content = readFileSync('src/App.tsx', 'utf-8');
    expect(content).toMatch(/<Route\s+path="\/erp\/qualicheck"/);
    expect(content).toMatch(/QulicheakLegacyRedirect/);
    expect(content).toMatch(/path="\/erp\/qulicheak"/);
  });

  it('Q-LOCK-1a + Q-LOCK-2a · zero Qulicheak/qulicheak in source (excluding App.tsx + tests + intentional migration docs)', () => {
    const { execSync } = require('child_process');
    // Allow ≤5 intentional references in migration documentation comments + idempotent migration check
    // (applications.ts NAMING CONVENTIONS · useCardEntitlement.ts D-NEW-BB block · qualicheck-bridges.ts canonical citation)
    const wrongPascal = parseInt(
      execSync(`grep -rE "Qulicheak" src/ --include='*.ts' --include='*.tsx' --exclude-dir=test --exclude=App.tsx | wc -l`).toString().trim()
    );
    const wrongLower = parseInt(
      execSync(`grep -rE "qulicheak" src/ --include='*.ts' --include='*.tsx' --exclude-dir=test --exclude=App.tsx | wc -l`).toString().trim()
    );
    expect(wrongPascal).toBeLessThanOrEqual(2);
    expect(wrongLower).toBeLessThanOrEqual(5);
  });

  it('Q-LOCK-8a + Q-LOCK-14a · D-NEW-BB 3rd consumer · qulicheak → qualicheck card_id migration block exists', () => {
    const content = readFileSync('src/hooks/useCardEntitlement.ts', 'utf-8');
    expect(content).toMatch(/T-Phase-1\.H\.2.*D-NEW-BB.*3rd consumer/);
    expect(content).toMatch(/'qulicheak'/);
    expect(content).toMatch(/'qualicheck'/);
  });

  it('Q-LOCK-9a · D-NEW-CN canonical registered · NAMING CONVENTIONS section extended', () => {
    const content = readFileSync('src/components/operix-core/applications.ts', 'utf-8');
    expect(content).toMatch(/D-NEW-CM-fincore-naming-canonical/);
    expect(content).toMatch(/D-NEW-CN-qualicheck-naming-canonical/);
    expect(content).toMatch(/'Fin Core' \(with space\) intentional/);
    expect(content).toMatch(/'QualiCheck'.*PascalCase.*canonical/);
  });
});
