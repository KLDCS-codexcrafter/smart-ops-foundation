/**
 * drill-down.test.ts — Drill-down state machine tests (UD1-UD9) + i18n parity (UD10)
 * Sprint T-Phase-1.2.6b · Card #2.6 sub-sprint 2 of 6
 */

import { describe, it, expect } from 'vitest';
import {
  initialDrillState,
  drillPush,
  drillPop,
  drillGoTo,
  drillReset,
  drillCurrent,
  type DrillCrumb,
} from '@/types/drill';
import { en } from '@/data/i18n/en';
import { hi } from '@/data/i18n/hi';

const c1: DrillCrumb = { id: 'a', label: 'A', level: 1, module: 'm' };
const c2: DrillCrumb = { id: 'b', label: 'B', level: 2, module: 'm' };
const c3: DrillCrumb = { id: 'c', label: 'C', level: 3, module: 'm' };

describe('Drill-down state machine + module exports (UD1-UD10)', () => {
  it('UD1 · initialDrillState is empty', () => {
    expect(initialDrillState.trail).toEqual([]);
    expect(drillCurrent(initialDrillState)).toBeNull();
  });

  it('UD2 · push appends crumbs', () => {
    const s1 = drillPush(initialDrillState, c1);
    const s2 = drillPush(s1, c2);
    expect(s2.trail).toHaveLength(2);
    expect(s2.trail[1].id).toBe('b');
  });

  it('UD3 · pop removes last crumb · no-op on empty', () => {
    const s = drillPop(drillPush(drillPush(initialDrillState, c1), c2));
    expect(s.trail).toHaveLength(1);
    expect(s.trail[0].id).toBe('a');
    expect(drillPop(initialDrillState).trail).toEqual([]);
  });

  it('UD4 · goTo truncates trail inclusive · no-op when id absent', () => {
    const s = drillPush(drillPush(drillPush(initialDrillState, c1), c2), c3);
    const t = drillGoTo(s, 'b');
    expect(t.trail.map(x => x.id)).toEqual(['a', 'b']);
    expect(drillGoTo(s, 'zzz').trail).toHaveLength(3);
  });

  it('UD5 · reset clears the trail', () => {
    const s = drillPush(initialDrillState, c1);
    expect(drillReset().trail).toEqual([]);
    expect(s.trail).toHaveLength(1); // pure · original untouched
  });

  it('UD6 · current returns deepest crumb', () => {
    const s = drillPush(drillPush(initialDrillState, c1), c2);
    expect(drillCurrent(s)?.id).toBe('b');
  });

  it('UD7 · GRNRegisterV2 module exports panel', async () => {
    const mod = await import('@/pages/erp/inventory/reports/GRNRegisterV2');
    expect(typeof mod.GRNRegisterV2Panel).toBe('function');
  });

  it('UD8 · MINRegister module exports panel', async () => {
    const mod = await import('@/pages/erp/inventory/reports/MINRegister');
    expect(typeof mod.MINRegisterPanel).toBe('function');
  });

  it('UD9 · 5 print components export', async () => {
    const [grn, min, ce, cc, rtv] = await Promise.all([
      import('@/pages/erp/inventory/reports/print/GRNPrint'),
      import('@/pages/erp/inventory/reports/print/MINPrint'),
      import('@/pages/erp/inventory/reports/print/ConsumptionEntryPrint'),
      import('@/pages/erp/inventory/reports/print/CycleCountPrint'),
      import('@/pages/erp/inventory/reports/print/RTVPrint'),
    ]);
    expect(typeof grn.GRNPrint).toBe('function');
    expect(typeof min.MINPrint).toBe('function');
    expect(typeof ce.ConsumptionEntryPrint).toBe('function');
    expect(typeof cc.CycleCountPrint).toBe('function');
    expect(typeof rtv.RTVPrint).toBe('function');
  });

  it('UD10 · common.effective_date i18n parity en + hi · Devanagari U+0900-U+097F', () => {
    expect(en['common.effective_date']).toBe('Effective Date');
    const hiVal = hi['common.effective_date'];
    expect(hiVal).toBeTruthy();
    // At least one char in Devanagari range
    expect(/[\u0900-\u097F]/.test(hiVal)).toBe(true);
  });
});
