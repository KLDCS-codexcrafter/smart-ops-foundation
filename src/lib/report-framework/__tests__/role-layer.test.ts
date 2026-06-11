/**
 * @file        role-layer.test.ts
 * @purpose     RPT-4 · Test the derivation engine and KPI layer-tagging.
 * @sprint      RPT-4
 */
import { describe, it, expect } from 'vitest';
import {
  layerCeilingFor,
  clampLayer,
  deriveRoleDashboard,
  type RoleLayer,
} from '@/lib/report-framework/role-layer';
import { listKpis, getKpi } from '@/lib/report-framework/kpi-registry';
import type { UserRole } from '@/types/card-entitlement';

const VALID_LAYERS: RoleLayer[] = ['operator', 'manager', 'management'];

describe('RPT-4 · layerCeilingFor · all 8 roles', () => {
  const cases: Array<[UserRole, RoleLayer]> = [
    ['view_only', 'operator'],
    ['finance', 'manager'],
    ['sales', 'manager'],
    ['operations', 'manager'],
    ['hr', 'manager'],
    ['support', 'manager'],
    ['tenant_admin', 'management'],
    ['super_admin', 'management'],
  ];
  for (const [role, expected] of cases) {
    it(`maps ${role} → ${expected}`, () => {
      expect(layerCeilingFor(role)).toBe(expected);
    });
  }
});

describe('RPT-4 · clampLayer', () => {
  it('returns requested when below or equal ceiling', () => {
    expect(clampLayer('operator', 'manager')).toBe('operator');
    expect(clampLayer('manager', 'manager')).toBe('manager');
  });
  it('clamps requested above ceiling down to ceiling', () => {
    expect(clampLayer('management', 'manager')).toBe('manager');
    expect(clampLayer('manager', 'operator')).toBe('operator');
  });
});

describe('RPT-4 · deriveRoleDashboard · pure cases', () => {
  it('finance/operator clamps to manager and returns finance sections only', () => {
    const cfg = deriveRoleDashboard('finance', 'operator', ['fincore', 'receivx', 'payout']);
    // operator ≤ ceiling(manager), stays operator
    expect(cfg.layer).toBe('operator');
    for (const s of cfg.sections) {
      expect(['fincore', 'receivx', 'payout']).toContain(s.cardId);
    }
  });

  it('finance/management requests management but ceiling is manager → clamps', () => {
    const cfg = deriveRoleDashboard('finance', 'management', ['fincore']);
    expect(cfg.layer).toBe('manager');
    // No xc-* section because effective layer is not management
    expect(cfg.sections.find((s) => s.cardId === 'cross-card')).toBeUndefined();
  });

  it('tenant_admin/management surfaces the leading Org Overview xc section', () => {
    const cfg = deriveRoleDashboard('tenant_admin', 'management',
      ['fincore', 'receivx', 'payout', 'eximx', 'comply360']);
    expect(cfg.layer).toBe('management');
    expect(cfg.sections.length).toBeGreaterThanOrEqual(1);
    expect(cfg.sections[0].cardId).toBe('cross-card');
    expect(cfg.sections[0].kpis.length).toBeGreaterThanOrEqual(6);
  });

  it('sales/manager does NOT surface xc-* (cross-card management-only)', () => {
    const cfg = deriveRoleDashboard('sales', 'manager', ['salesx']);
    expect(cfg.layer).toBe('manager');
    expect(cfg.sections.find((s) => s.cardId === 'cross-card')).toBeUndefined();
  });

  it('view_only clamped to operator yields no xc and no cross-card', () => {
    const cfg = deriveRoleDashboard('view_only', 'management', ['insightx']);
    expect(cfg.layer).toBe('operator');
    expect(cfg.sections.find((s) => s.cardId === 'cross-card')).toBeUndefined();
  });

  it('entitlement intersection filters cards: empty entitled → no per-card sections', () => {
    const cfg = deriveRoleDashboard('finance', 'manager', []);
    for (const s of cfg.sections) {
      expect(s.cardId).toBe('cross-card');
    }
  });
});

describe('RPT-4 · KPI layer-tag integrity', () => {
  it('every KPI has a layers field that is a non-empty subset of valid layers', () => {
    const all = listKpis();
    expect(all.length).toBeGreaterThanOrEqual(70);
    for (const k of all) {
      expect(k.layers, `kpi ${k.id} missing layers`).toBeDefined();
      expect(k.layers!.length).toBeGreaterThan(0);
      for (const l of k.layers!) {
        expect(VALID_LAYERS).toContain(l);
      }
    }
  });

  it('the 6 xc-* KPIs are seeded as management-only', () => {
    const xcIds = ['xc-cash-position', 'xc-ar-aging', 'xc-ap-aging',
      'xc-compliance-pct', 'xc-stock-value', 'xc-realisation-pct'];
    for (const id of xcIds) {
      const k = getKpi(id);
      expect(k, `${id} should be registered`).toBeDefined();
      expect(k!.layers).toEqual(['management']);
    }
  });

  it('the registry has ≥ 6 xc-* management KPIs total', () => {
    const xc = listKpis().filter((k) => k.id.startsWith('xc-'));
    expect(xc.length).toBeGreaterThanOrEqual(6);
    for (const k of xc) {
      expect(k.layers).toEqual(['management']);
    }
  });
});

describe('RPT-4 T2 · real layer spread across the 73 seeds', () => {
  it('operator-visible < manager-visible < total (strict, no exact counts)', () => {
    const all = listKpis();
    const op = all.filter((k) => k.layers?.includes('operator')).length;
    const mg = all.filter((k) => k.layers?.includes('manager')).length;
    const tot = all.length;
    expect(op).toBeGreaterThan(0);
    expect(mg).toBeGreaterThan(op);
    expect(tot).toBeGreaterThan(mg);
  });

  it('finance/operator derives FEWER fincore KPIs than finance/management for fincore', () => {
    const op = deriveRoleDashboard('finance', 'operator', ['fincore']);
    // finance ceiling is manager → request management clamps to manager
    const mg = deriveRoleDashboard('finance', 'management', ['fincore']);
    const opFc = op.sections.find((s) => s.cardId === 'fincore')?.kpis.length ?? 0;
    const mgFc = mg.sections.find((s) => s.cardId === 'fincore')?.kpis.length ?? 0;
    expect(opFc).toBeGreaterThan(0);
    expect(mgFc).toBeGreaterThan(opFc);
  });
});
