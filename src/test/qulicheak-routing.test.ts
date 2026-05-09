/**
 * @file src/test/qulicheak-routing.test.ts
 * @purpose Block G coverage · QualiCheckPage module union + sidebar config invariants for the 8 α-d-1 NEW reports.
 * @who QA Manager · Quality Inspector
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-T1-AuditFix · Block C (closes Block G test gap from α-d-1)
 * @iso ISO 25010 Maintainability · Testability
 * @whom Audit Owner
 * @decisions D-NEW-CC canonical (sidebar keyboard uniqueness)
 * @disciplines FR-30 · FR-32
 * @reuses qulicheak-sidebar-config · QualiCheckSidebar.types
 * @[JWT] N/A (config / type level)
 */
import { describe, it, expect } from 'vitest';
import { qulicheakSidebarItems } from '@/apps/erp/configs/qulicheak-sidebar-config';
import type { SidebarItem } from '@/shell/types';
import type { QualiCheckModule } from '@/pages/erp/qulicheak/QualiCheckSidebar.types';

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

describe('Qulicheak sidebar config · D-NEW-CC canonical (T1 Block C)', () => {
  it('all keyboard shortcuts are unique', () => {
    const flat = flatten(qulicheakSidebarItems);
    const kbs = flat.map((i) => i.keyboard).filter((k): k is string => Boolean(k));
    const dedup = new Set(kbs);
    expect(dedup.size).toBe(kbs.length);
  });

  it('all 8 new α-d-1 module IDs are present in sidebar config', () => {
    const flat = flatten(qulicheakSidebarItems);
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
    const flat = flatten(qulicheakSidebarItems);
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

  it('Q-LOCK-9a · qulicheak status flipped to active at α-d-2 close', async () => {
    const mod = await import('@/components/operix-core/applications');
    const apps = (mod as { applications?: ReadonlyArray<{ id: string; status: string }> }).applications;
    expect(apps).toBeDefined();
    const q = apps?.find((a) => a.id === 'qulicheak');
    expect(q?.status).toBe('active');
  });

  it('Reports group cleanly purged of the 8 α-d-1 moduleIds (they live in Trident sub-group only)', () => {
    const flat = flatten(qulicheakSidebarItems);
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
