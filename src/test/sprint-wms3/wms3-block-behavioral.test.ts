/**
 * wms3-block-behavioral.test.ts — Sprint WMS3 · behavioral (≥22 it())
 *
 * Covers manifest status flow, ack ledger, tolerance edges (within / breach /
 * pct-passes-abs-fails), export shipment canon-5 proof (zero EximX writes),
 * floor fields, retention mapping, §H walls, and institutional registers.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  upsertPackageType,
  upsertToleranceGroup,
  createShipmentsFromPacked,
  createExportShipment,
  buildManifest,
  finalizeManifest,
  recordHandover,
  acknowledgeManifest,
  checkToleranceAndDispute,
  getManifestForExportPO,
  getManifestSummary,
  listShipments,
  listManifests,
  listManifestAcks,
  listManifestsForTransporter,
  classifyShipmentSource,
} from '@/lib/wms-manifest-engine';
import {
  packageTypesKey, toleranceGroupsKey,
  shipmentsKey, manifestsKey, manifestAcksKey,
} from '@/types/wms-manifest';
import { packGroupsKey, type PackGroup } from '@/types/wms-pick-pack';
import { exportPOKey } from '@/types/export-purchase-order';
import { exportDispatchMirrorKey } from '@/types/export-dispatch-mirror';
import { disputesKey } from '@/types/freight-reconciliation';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';
import { SPRINTS } from '@/lib/_institutional/sprint-history';
import { SIBLINGS } from '@/lib/_institutional/sibling-register';
import * as disputeEngine from '@/lib/dispute-workflow-engine';

const E = 'wms3-test';

function seedPackedGroup(id: string): void {
  const groups: PackGroup[] = [
    {
      id,
      pack_group_no: `PG-${id}`,
      entity_id: E,
      picklist_id: 'pl-1',
      status: 'packed',
      lines: [{ id: 'pgl-1', picklist_line_id: 'pll-1', item_id: 'i1', item_name: 'Widget', qty: 1 }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  localStorage.setItem(packGroupsKey(E), JSON.stringify(groups));
}

function seedExportPO(id: string): void {
  localStorage.setItem(exportPOKey(E), JSON.stringify([{ id, entity_id: E }]));
}

beforeEach(() => {
  localStorage.clear();
  // Friendly user for created_by
  localStorage.setItem('erp_mock_auth_active', JSON.stringify({ id: 'u1', name: 'Op Alice' }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('WMS3 · manifest engine', () => {
  it('upserts a package type', () => {
    const pt = upsertPackageType(E, { code: 'BOX-S', label: 'Small Box', status: 'active' });
    expect(pt.id).toBeTruthy();
    expect(localStorage.getItem(packageTypesKey(E))).toContain('BOX-S');
  });

  it('upserts a tolerance group with auto_dispute action', () => {
    const tg = upsertToleranceGroup(E, {
      transporter_id: 'tx1', transporter_name: 'BlueDart',
      weight_tolerance_pct: 5, weight_tolerance_abs_g: 500,
    });
    expect(tg.action_on_breach).toBe('auto_dispute');
    expect(localStorage.getItem(toleranceGroupsKey(E))).toContain('BlueDart');
  });

  it('createShipmentsFromPacked births shipments with floor fields', () => {
    seedPackedGroup('pg1');
    const created = createShipmentsFromPacked(E);
    expect(created).toHaveLength(1);
    expect(created[0].created_by).toBe('Op Alice');
    expect(created[0].retention_policy).toBe('operational_log_only');
    expect(created[0].status).toBe('packed');
  });

  it('createShipmentsFromPacked is idempotent (no duplicate ref)', () => {
    seedPackedGroup('pg-x');
    createShipmentsFromPacked(E);
    const second = createShipmentsFromPacked(E);
    expect(second).toHaveLength(0);
  });

  it('createExportShipment reads export PO + mirror stores · ZERO EximX writes (canon-5)', () => {
    seedExportPO('EPO-1');
    localStorage.setItem(exportDispatchMirrorKey(E), JSON.stringify([{
      id: 'mir-1', related_export_po_id: 'EPO-1',
    }]));
    const beforePO = localStorage.getItem(exportPOKey(E));
    const beforeMirror = localStorage.getItem(exportDispatchMirrorKey(E));
    const ship = createExportShipment(E, 'EPO-1');
    expect(ship?.source).toBe('export');
    expect(ship?.source_ref_id).toBe('EPO-1');
    expect(ship?.retention_policy).toBe('operational_log_only');
    // EximX stores unmodified (canon-5)
    expect(localStorage.getItem(exportPOKey(E))).toBe(beforePO);
    expect(localStorage.getItem(exportDispatchMirrorKey(E))).toBe(beforeMirror);
  });

  it('createExportShipment returns null when PO missing', () => {
    expect(createExportShipment(E, 'EPO-NOPE')).toBeNull();
  });

  it('buildManifest birth with floor fields + gst_8yr retention', () => {
    seedPackedGroup('pg2');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    expect(m.status).toBe('draft');
    expect(m.created_by).toBe('Op Alice');
    expect(m.retention_policy).toBe('gst_8yr');
    expect(m.total_packages).toBe(1);
  });

  it('finalizeManifest transitions shipments packed → manifested + stamps export_po_refs', () => {
    seedExportPO('EPO-7');
    const ship = createExportShipment(E, 'EPO-7')!;
    const m = buildManifest(E, 'tx1', 'BlueDart', [ship.id]);
    const fin = finalizeManifest(E, m.id);
    expect(fin.status).toBe('finalized');
    expect(fin.export_po_refs).toEqual(['EPO-7']);
    const ships = listShipments(E);
    expect(ships[0].status).toBe('manifested');
    expect(ships[0].manifest_id).toBe(m.id);
  });

  it('finalizeManifest rejects invalid transition (already finalized)', () => {
    seedPackedGroup('pg3');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    expect(() => finalizeManifest(E, m.id)).toThrow();
  });

  it('recordHandover flips manifested → handed_over', () => {
    seedPackedGroup('pg4');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    recordHandover(E, m.id);
    expect(listShipments(E)[0].status).toBe('handed_over');
  });

  it('acknowledgeManifest writes ack ledger + flips status to acknowledged', () => {
    seedPackedGroup('pg5');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    const { ack, manifest } = acknowledgeManifest(E, m.id, {
      acknowledged_by: 'Driver Raj', packages_counted: 1,
    });
    expect(ack.id).toBeTruthy();
    expect(manifest.status).toBe('acknowledged');
    expect(listManifestAcks(E)).toHaveLength(1);
  });

  it('acknowledgeManifest with discrepancy_note → status discrepancy', () => {
    seedPackedGroup('pg6');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    const { manifest } = acknowledgeManifest(E, m.id, {
      acknowledged_by: 'Driver Raj', discrepancy_note: '2 cartons short',
    });
    expect(manifest.status).toBe('discrepancy');
  });

  it('ack ledger is append-only (multiple acks)', () => {
    seedPackedGroup('pg7');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    acknowledgeManifest(E, m.id, { acknowledged_by: 'A', discrepancy_note: 'late' });
    acknowledgeManifest(E, m.id, { acknowledged_by: 'B' });
    expect(listManifestAcks(E).length).toBe(2);
  });

  it('cannot acknowledge a draft manifest', () => {
    seedPackedGroup('pg8');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    expect(() => acknowledgeManifest(E, m.id, { acknowledged_by: 'X' })).toThrow();
  });

  it('tolerance: within BOTH → accepted_variance · NO dispute', () => {
    upsertToleranceGroup(E, {
      transporter_id: 'tx1', transporter_name: 'BlueDart',
      weight_tolerance_pct: 5, weight_tolerance_abs_g: 500,
    });
    seedPackedGroup('pg9');
    localStorage.setItem(packingSlipsKeyShim('pgX'), '');
    const [s] = createShipmentsFromPacked(E);
    // declared 0 in this shim, so we patch a small declared via direct edit
    const ships = listShipments(E);
    ships[0].declared_weight_kg = 10;
    localStorage.setItem(shipmentsKey(E), JSON.stringify(ships));
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    const spy = vi.spyOn(disputeEngine, 'createDisputeFromMatch');
    const res = checkToleranceAndDispute(E, m.id, 10.2); // 2% · 200g — within both
    expect(res.status).toBe('within_tolerance');
    expect(res.manifest.accepted_variance?.note).toContain('Within tolerance');
    expect(spy).not.toHaveBeenCalled();
    expect(localStorage.getItem(disputesKey(E)) ?? '[]').toBe('[]');
  });

  it('tolerance: BOTH exceeded → existing dispute engine consumed', () => {
    upsertToleranceGroup(E, {
      transporter_id: 'tx1', transporter_name: 'BlueDart',
      weight_tolerance_pct: 5, weight_tolerance_abs_g: 500,
    });
    seedPackedGroup('pg10');
    const [s] = createShipmentsFromPacked(E);
    const ships = listShipments(E);
    ships[0].declared_weight_kg = 10;
    localStorage.setItem(shipmentsKey(E), JSON.stringify(ships));
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    const spy = vi.spyOn(disputeEngine, 'createDisputeFromMatch');
    const res = checkToleranceAndDispute(E, m.id, 12); // 20% · 2000g — BOTH breached
    expect(res.status).toBe('breach_dispute_raised');
    expect(spy).toHaveBeenCalledOnce();
    const disputes = JSON.parse(localStorage.getItem(disputesKey(E)) ?? '[]');
    expect(disputes).toHaveLength(1);
    expect(res.manifest.dispute_id).toBe(disputes[0].id);
  });

  it('tolerance: pct passes BUT abs fails → NO dispute (DP: BOTH required)', () => {
    upsertToleranceGroup(E, {
      transporter_id: 'tx1', transporter_name: 'BlueDart',
      weight_tolerance_pct: 5, weight_tolerance_abs_g: 100,
    });
    seedPackedGroup('pg11');
    const [s] = createShipmentsFromPacked(E);
    const ships = listShipments(E);
    ships[0].declared_weight_kg = 1000;
    localStorage.setItem(shipmentsKey(E), JSON.stringify(ships));
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    const spy = vi.spyOn(disputeEngine, 'createDisputeFromMatch');
    // pct 0.5% (well within 5%), abs 5kg (exceeds 100g) — only ONE exceeded → no dispute
    const res = checkToleranceAndDispute(E, m.id, 1005);
    expect(res.status).toBe('within_tolerance');
    expect(spy).not.toHaveBeenCalled();
  });

  it('getManifestForExportPO round-trips finalized manifest', () => {
    seedExportPO('EPO-RT');
    const ship = createExportShipment(E, 'EPO-RT')!;
    const m = buildManifest(E, 'txZ', 'Delhivery', [ship.id]);
    finalizeManifest(E, m.id);
    const found = getManifestForExportPO(E, 'EPO-RT');
    expect(found?.id).toBe(m.id);
  });

  it('getManifestForExportPO returns null when no link', () => {
    expect(getManifestForExportPO(E, 'EPO-MISSING')).toBeNull();
  });

  it('getManifestSummary aggregates statuses', () => {
    seedPackedGroup('pgS');
    const [s] = createShipmentsFromPacked(E);
    const m = buildManifest(E, 'tx1', 'BlueDart', [s.id]);
    finalizeManifest(E, m.id);
    const sum = getManifestSummary(E);
    expect(sum.totalManifests).toBe(1);
    expect(sum.finalized).toBe(1);
    expect(sum.shipmentsManifested).toBe(1);
  });

  it('listManifestsForTransporter filters by transporter_id', () => {
    seedPackedGroup('pgT1'); seedPackedGroup('pgT2');
    createShipmentsFromPacked(E);
    const ships = listShipments(E);
    const m1 = buildManifest(E, 'tx1', 'BlueDart', [ships[0].id]);
    buildManifest(E, 'tx2', 'Other', [ships[1].id]);
    expect(listManifestsForTransporter(E, 'tx1').map((x) => x.id)).toEqual([m1.id]);
  });

  it('classifyShipmentSource passes through source field', () => {
    const s = { source: 'export' } as Parameters<typeof classifyShipmentSource>[0];
    expect(classifyShipmentSource(s)).toBe('export');
  });

  it('retention mapping: manifest=gst_8yr · shipment-operational + manifest-ack=operational_log_only', () => {
    expect(getDefaultPolicyForRecordType('manifest')).toBe('gst_8yr');
    expect(getDefaultPolicyForRecordType('shipment-operational')).toBe('operational_log_only');
    expect(getDefaultPolicyForRecordType('manifest-ack')).toBe('operational_log_only');
  });

  it('§H wall: dispute-workflow-engine.ts contains createDisputeFromMatch export (consumed, not modified)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/dispute-workflow-engine.ts'), 'utf8');
    expect(src).toMatch(/export function createDisputeFromMatch/);
  });

  it('§H wall: egm.ts untouched (no wms-manifest references)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/types/egm.ts'), 'utf8');
    expect(src).not.toContain('wms-manifest');
    expect(src).not.toContain('manifestsKey');
  });

  it('§H wall: export-dispatch-bridge.ts untouched (no wms-manifest references)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/lib/export-dispatch-bridge.ts'), 'utf8');
    expect(src).not.toContain('wms-manifest');
  });

  it('AC6: LogisticManifestQueue contains zero direct setItem calls (writes via engine only)', () => {
    const src = readFileSync(resolve(process.cwd(), 'src/pages/erp/logistic/LogisticManifestQueue.tsx'), 'utf8');
    expect(src).not.toMatch(/localStorage\.setItem/);
  });

  it('history self-seed: WMS3 row present', () => {
    const wms3 = SPRINTS.find((s) => String(s.sprintNumber) === 'WMS3');
    expect(wms3).toBeDefined();
    expect(wms3?.newSiblings).toContain('wms-manifest-engine');
  });

  it('history: WMS2 headSha flipped to bdd4c6ec', () => {
    const wms2 = SPRINTS.find((s) => String(s.sprintNumber) === 'WMS2');
    expect(wms2?.headSha).toBe('bdd4c6ec');
  });

  it('sibling-register: wms-manifest-engine registered', () => {
    expect(SIBLINGS.find((s) => s.id === 'wms-manifest-engine')).toBeDefined();
  });
});

// Shim — keeps the seedPackedGroup tests honest without coupling to packing-slip
// storage shape. Returns a stable key that we never read.
function packingSlipsKeyShim(_e: string): string { return `__shim_${_e}`; }
