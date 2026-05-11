/**
 * @file        src/test/maintainpro-bridges.test.ts
 * @sprint      T-Phase-1.A.16b · Block H.3 · Q-LOCK-4 + Q-LOCK-8
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  consumeSiteXMaintainProHandoff,
  emitMaintenanceEquipmentDown,
  emitMaintenanceEquipmentRestored,
  emitSparePartReorderRequired,
  emitInternalTicketEscalation,
  consumeQulicheakCalibrationFail,
  consumeSiteXPTWRequest,
  type SiteXMaintainProHandoff,
} from '@/lib/maintainpro-bridges';
import { listEquipment, listAssetCapitalizations } from '@/lib/maintainpro-engine';

const E = 'BRIDGETEST';

beforeEach(() => { localStorage.clear(); });

const handoff: SiteXMaintainProHandoff = {
  handoff_id: 'h_sinha_001',
  site_id: 'site_ntpc',
  capex_value: 4500000,
  equipment_name: 'HVAC AHU',
  make: 'Daikin',
  model: 'AHU-200',
  serial_no: 'SN-HVAC-1',
  installation_date: '2026-03-15',
  warranty_start: '2026-03-15',
  warranty_end: '2099-03-14',
  project_id: 'prj_sinha_ntpc',
  custodian_user_id: 'u_sinha',
  location: 'Plant 1',
  floor: 'GF',
  kw_rating: 150,
  emitted_at: '2026-03-15T00:00:00Z',
};

describe('consumeSiteXMaintainProHandoff (A.15a → A.16b CAPEX bridge)', () => {
  it('auto-creates Equipment + AssetCapitalization', () => {
    const result = consumeSiteXMaintainProHandoff(E, handoff);
    expect(result.equipment_id).toBeTruthy();
    expect(result.asset_capitalization_id).toBeTruthy();
    expect(listEquipment(E)).toHaveLength(1);
    expect(listAssetCapitalizations(E)).toHaveLength(1);
  });

  it('preserves linked_site_id + linked_project_id', () => {
    consumeSiteXMaintainProHandoff(E, handoff);
    const eq = listEquipment(E)[0];
    expect(eq.linked_site_id).toBe('site_ntpc');
    expect(eq.linked_project_id).toBe('prj_sinha_ntpc');
  });

  it('AssetCap fincore_voucher_id is null (Phase 1 stub)', () => {
    consumeSiteXMaintainProHandoff(E, handoff);
    expect(listAssetCapitalizations(E)[0].fincore_voucher_id).toBeNull();
  });
});

describe('Emit-only bridges shape', () => {
  it('emitMaintenanceEquipmentDown returns shaped event', () => {
    const ev = emitMaintenanceEquipmentDown('eq1', 'Blower', 'site1', 'high', 25, '2026-05-20');
    expect(ev.type).toBe('maintenance:equipment.down');
    expect(ev.severity).toBe('high');
    expect(ev.capacity_impact_pct).toBe(25);
    expect(ev.emitted_at).toBeTruthy();
  });

  it('emitMaintenanceEquipmentRestored', () => {
    const ev = emitMaintenanceEquipmentRestored('eq1', 'Blower', 'site1');
    expect(ev.type).toBe('maintenance:equipment.restored');
    expect(ev.capacity_impact_pct).toBe(0);
  });

  it('emitSparePartReorderRequired', () => {
    const ev = emitSparePartReorderRequired('sp1', 50, 20, 100);
    expect(ev.type).toBe('maintenance:spare.reorder_required');
    expect(ev.recommended_order_qty).toBe(100);
  });

  it('emitInternalTicketEscalation', () => {
    const ev = emitInternalTicketEscalation('t1', 'TKT/01', 2, 'electrical', 'critical', 'mgr_u1');
    expect(ev.type).toBe('maintenance:ticket.escalated');
    expect(ev.escalation_level).toBe(2);
    expect(ev.escalated_to_user_id).toBe('mgr_u1');
  });
});

describe('Inbound guards', () => {
  it('consumeQulicheakCalibrationFail blocks', () => {
    const r = consumeQulicheakCalibrationFail(E, {
      qc_entry_id: 'qc1', instrument_id: 'inst1', qc_inspector_user_id: 'u1',
      attempted_at: '2026-01-01T00:00:00Z',
    });
    expect(r.blocked).toBe(true);
    expect(r.reason).toMatch(/quarantined/);
  });

  it('consumeSiteXPTWRequest Phase 1 stub returns unblocked', () => {
    const r = consumeSiteXPTWRequest(E, {
      ptw_request_id: 'ptw1', site_id: 'site1', zone: 'A', requested_at: '2026-01-01T00:00:00Z',
    });
    expect(r.blocked).toBe(false);
    expect(r.reason).toBeNull();
  });
});
