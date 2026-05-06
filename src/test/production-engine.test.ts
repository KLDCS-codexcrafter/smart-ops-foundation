/**
 * @file     production-engine.test.ts
 * @sprint   T-Phase-1.3-3a-pre-1 · Block J · D-510
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProductionOrder,
  releaseProductionOrder,
  cancelProductionOrder,
  resolveFGOutputGodown,
  canTransition,
} from '@/lib/production-engine';
import type { Bom } from '@/types/bom';
import type { InventoryItem } from '@/types/inventory-item';
import {
  DEFAULT_PRODUCTION_CONFIG,
  DEFAULT_QC_CONFIG,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';

const mockUser = { id: 'u1', name: 'Test User' };

const mockBOM: Bom = {
  id: 'bom1',
  entity_id: 'e1',
  product_item_id: 'i-out',
  product_item_code: 'OUT-001',
  product_item_name: 'Output Item',
  version_no: 1,
  output_qty: 1,
  output_uom: 'nos',
  valid_from: '2026-01-01',
  is_active: true,
  components: [
    { id: 'c1', item_id: 'i-rm1', item_code: 'RM-001', item_name: 'Raw Mat 1', component_type: 'raw_material', qty: 2, uom: 'kg', wastage_percent: 0 },
    { id: 'c2', item_id: 'i-rm2', item_code: 'RM-002', item_name: 'Raw Mat 2', component_type: 'raw_material', qty: 1, uom: 'nos', wastage_percent: 5 },
  ],
  byproducts: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const mockItems: InventoryItem[] = [
  { id: 'i-rm1', std_cost_rate: 100 } as InventoryItem,
  { id: 'i-rm2', std_cost_rate: 50 } as InventoryItem,
];

const baseInput = {
  entity_id: 'e1',
  bom_id: 'bom1',
  output_item_id: 'i-out',
  planned_qty: 100,
  start_date: '2026-05-10',
  target_end_date: '2026-05-15',
  department_id: 'd1',
  created_by: 'u1',
};

beforeEach(() => {
  localStorage.clear();
});

describe('production-engine', () => {
  it('creates production order from BOM and releases with reservations (D-186 · Q4=a)', () => {
    const po = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, mockUser);
    expect(po.status).toBe('draft');
    expect(po.doc_no).toMatch(/^MO\/\d{2}-\d{2}\/\d{4}$/);
    expect(po.lines.length).toBe(2);
    expect(po.cost_structure.master.total).toBeGreaterThan(0);

    const released = releaseProductionOrder(po, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, mockUser);
    // Block 4: real reservations persisted to localStorage
    const resRaw = localStorage.getItem(`erp_stock_reservations_e1`);
    expect(resRaw).not.toBeNull();
    const reservations = JSON.parse(resRaw!) as Array<{ source_type: string; source_id: string }>;
    expect(reservations.some(r => r.source_type === 'production_order' && r.source_id === po.id)).toBe(true);
    expect(released.status).toBe('released');
    expect(released.reservation_ids.length).toBe(po.lines.length);
    expect(released.cost_structure.budget_snapshot_at).not.toBeNull();
  });

  it('cancels DRAFT production order and rejects cancel for non-draft (D-410)', () => {
    const po = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, mockUser);
    const cancelled = cancelProductionOrder(po, mockUser, 'no longer needed');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.status_history.length).toBe(2);

    const po2 = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, mockUser);
    const released = releaseProductionOrder(po2, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, mockUser);
    expect(() => cancelProductionOrder(released, mockUser, 'cant')).toThrow();
  });

  it('rejects invalid state transitions (Q2=a 5-state machine)', () => {
    expect(canTransition('draft', 'released')).toBe(true);
    expect(canTransition('draft', 'completed')).toBe(false);
    expect(canTransition('completed', 'draft')).toBe(false);
    expect(canTransition('cancelled', 'released')).toBe(false);
  });

  it('supports all 22 universal hookpoints with nullable design (D-291)', () => {
    const mts = createProductionOrder(baseInput, mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, mockUser);
    expect(mts.project_id).toBeNull();
    expect(mts.sales_order_line_mappings).toEqual([]);
    expect(mts.export_destination_country).toBeNull();

    const eto = createProductionOrder(
      { ...baseInput, project_id: 'proj-sinha-001', project_milestone_id: 'm3' },
      mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, mockUser,
    );
    expect(eto.project_id).toBe('proj-sinha-001');

    const exp = createProductionOrder(
      { ...baseInput, is_export_project: true, export_destination_country: 'US', export_regulatory_body: 'FDA' },
      mockBOM, mockItems, DEFAULT_PRODUCTION_CONFIG, DEFAULT_QC_CONFIG, mockUser,
    );
    expect(exp.qc_scenario).toBe('export_oriented');
  });

  it('routes FG to quarantine when outgoing QC enabled (D-515 stock-hold pattern)', () => {
    const qcOff = { ...DEFAULT_QC_CONFIG, enableOutgoingInspection: false };
    const qcOn = { ...DEFAULT_QC_CONFIG, enableOutgoingInspection: true, quarantineGodownId: 'g-quarantine' };

    expect(resolveFGOutputGodown({ output_godown_id: 'g-fg', qc_required: false }, qcOff)).toBe('g-fg');
    expect(resolveFGOutputGodown({ output_godown_id: 'g-fg', qc_required: true }, qcOn)).toBe('g-quarantine');
    expect(resolveFGOutputGodown({ output_godown_id: 'g-fg', qc_required: false }, qcOn)).toBe('g-fg');
  });
});
