/**
 * wms-manifest-engine.ts — WMS Manifest engine (Sprint WMS3 · W3 of WMS-ARC · ARC CLOSE)
 *
 * @realizes WMS-ARC W3 (arc close) · manifests + shipments + tolerance ·
 *           canon 1+3+5: Dispatch owns physical handover truth · Logistics acks ·
 *           EximX links read-only
 *
 * Single-Door (export half): export shipments READ export PO + dispatch-mirror
 * stores; zero EximX writes. Mirror flip lives on the Dispatch side via
 * `getManifestForExportPO` — the future flip's read API.
 *
 * Tolerance (founder DP · "W3 agreed"): per-transporter % + absolute threshold;
 *   - breach beyond BOTH pct AND abs → `createDisputeFromMatch` via the existing
 *     dispute-workflow-engine (CONSUMED · never modified)
 *   - within tolerance → recorded as `accepted_variance` on the manifest
 *     (never a silent write-off · AC7)
 *
 * P8.6 floor: Manifest + Shipment born with retention_policy + created_by.
 *   manifest → gst_8yr  ·  shipment + manifest-ack → operational_log_only.
 *
 * [JWT] Wave-2: courier APIs (label/tracking/webhooks) · e-way bill integration ·
 *               auth-derived transporter identity on ack writes.
 *
 * Walls (0-DIFF): dispute-workflow-engine.ts (consumed) · export-dispatch-bridge.ts
 *                 (untouched) · export-dispatch-mirror.ts (untouched) · egm.ts
 *                 (untouched) · audit-trail-hash-chain pair · logAudit entry-write ·
 *                 comply360-audit-retention-engine · WMS1/WMS2 engines · P8.6
 *                 RetentionConsole.
 */

import type {
  PackageTypeMaster,
  ToleranceGroup,
  Shipment,
  ShipmentSource,
  Manifest,
  ManifestAck,
  ManifestStatus,
} from '@/types/wms-manifest';
import {
  packageTypesKey,
  toleranceGroupsKey,
  shipmentsKey,
  manifestsKey,
  manifestAcksKey,
  MANIFEST_VALID_TRANSITIONS,
} from '@/types/wms-manifest';
import { packGroupsKey } from '@/types/wms-pick-pack';
import type { PackGroup } from '@/types/wms-pick-pack';
import { packingSlipsKey } from '@/types/packing-slip';
import type { PackingSlip } from '@/types/packing-slip';
import { exportDispatchMirrorKey } from '@/types/export-dispatch-mirror';
import type { ExportDispatchMirror } from '@/types/export-dispatch-mirror';
import { exportPOKey } from '@/types/export-purchase-order';
import type { ExportPurchaseOrder } from '@/types/export-purchase-order';
import { disputesKey } from '@/types/freight-reconciliation';
import type { MatchLine, Dispute, ToleranceConfig } from '@/types/freight-reconciliation';
import { createDisputeFromMatch } from '@/lib/dispute-workflow-engine';
import { logAudit } from '@/lib/audit-trail-engine';
import { fyForDate } from '@/lib/fincore-engine';
import { getDefaultPolicyForRecordType } from '@/lib/record-retention-policy-engine';

// ─── localStorage helpers (defensive · same contract as WMS1/WMS2) ────────
function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* swallow */
  }
}

function currentUserName(): string {
  try {
    if (typeof localStorage === 'undefined') return 'system';
    const raw = localStorage.getItem('erp_mock_auth_active');
    if (!raw) return 'system';
    const u = JSON.parse(raw);
    return u?.name ?? u?.id ?? 'system';
  } catch {
    return 'system';
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

// ── Package-Type master CRUD ─────────────────────────────────────────────
export function listPackageTypes(entityCode: string): PackageTypeMaster[] {
  return safeRead<PackageTypeMaster[]>(packageTypesKey(entityCode), []);
}

export function upsertPackageType(
  entityCode: string,
  patch: Omit<PackageTypeMaster, 'id' | 'created_at' | 'updated_at'> &
    Partial<Pick<PackageTypeMaster, 'id' | 'created_at'>>,
): PackageTypeMaster {
  const list = listPackageTypes(entityCode);
  const now = nowISO();
  const id = patch.id ?? uid('pkg');
  const existingIdx = list.findIndex((p) => p.id === id);
  const row: PackageTypeMaster = {
    id,
    code: patch.code,
    label: patch.label,
    length_cm: patch.length_cm,
    width_cm: patch.width_cm,
    height_cm: patch.height_cm,
    std_weight_kg: patch.std_weight_kg,
    status: patch.status,
    created_at: patch.created_at ?? now,
    updated_at: now,
  };
  if (existingIdx >= 0) list[existingIdx] = row;
  else list.push(row);
  safeWrite(packageTypesKey(entityCode), list);
  logAudit({
    entityCode,
    action: 'create',
    entityType: 'dispatch_txn_event',
    entityId: row.id,
    summary: `Package type ${row.code} ${existingIdx >= 0 ? 'updated' : 'created'}`,
  });
  return row;
}

// ── Tolerance-Group master CRUD ──────────────────────────────────────────
export function listToleranceGroups(entityCode: string): ToleranceGroup[] {
  return safeRead<ToleranceGroup[]>(toleranceGroupsKey(entityCode), []);
}

export function upsertToleranceGroup(
  entityCode: string,
  patch: Omit<ToleranceGroup, 'id' | 'created_at' | 'updated_at' | 'action_on_breach'> &
    Partial<Pick<ToleranceGroup, 'id' | 'created_at' | 'action_on_breach'>>,
): ToleranceGroup {
  const list = listToleranceGroups(entityCode);
  const now = nowISO();
  const id = patch.id ?? uid('tol');
  const existingIdx = list.findIndex((t) => t.id === id);
  const row: ToleranceGroup = {
    id,
    transporter_id: patch.transporter_id,
    transporter_name: patch.transporter_name,
    weight_tolerance_pct: patch.weight_tolerance_pct,
    weight_tolerance_abs_g: patch.weight_tolerance_abs_g,
    action_on_breach: 'auto_dispute',
    notes: patch.notes,
    created_at: patch.created_at ?? now,
    updated_at: now,
  };
  if (existingIdx >= 0) list[existingIdx] = row;
  else list.push(row);
  safeWrite(toleranceGroupsKey(entityCode), list);
  logAudit({
    entityCode,
    action: 'create',
    entityType: 'dispatch_txn_event',
    entityId: row.id,
    summary: `Tolerance group for ${row.transporter_name} ${existingIdx >= 0 ? 'updated' : 'created'}`,
  });
  return row;
}

export function getToleranceGroupForTransporter(
  entityCode: string,
  transporterId: string,
): ToleranceGroup | null {
  return listToleranceGroups(entityCode).find((t) => t.transporter_id === transporterId) ?? null;
}

// ── Shipment reads ───────────────────────────────────────────────────────
export function listShipments(entityCode: string): Shipment[] {
  return safeRead<Shipment[]>(shipmentsKey(entityCode), []);
}

function writeShipments(entityCode: string, list: Shipment[]): void {
  safeWrite(shipmentsKey(entityCode), list);
}

// ── Manifest reads ───────────────────────────────────────────────────────
export function listManifests(entityCode: string): Manifest[] {
  return safeRead<Manifest[]>(manifestsKey(entityCode), []);
}

function writeManifests(entityCode: string, list: Manifest[]): void {
  safeWrite(manifestsKey(entityCode), list);
}

// ── Acks ─────────────────────────────────────────────────────────────────
export function listManifestAcks(entityCode: string): ManifestAck[] {
  return safeRead<ManifestAck[]>(manifestAcksKey(entityCode), []);
}

function writeManifestAcks(entityCode: string, list: ManifestAck[]): void {
  safeWrite(manifestAcksKey(entityCode), list);
}

// ── Shipment construction ────────────────────────────────────────────────

/** Set of source_ref_ids already covered by a shipment, avoids dupes. */
function existingDomesticRefs(entityCode: string): Set<string> {
  const refs = new Set<string>();
  for (const s of listShipments(entityCode)) {
    if (s.source === 'domestic' && s.source_ref_id) refs.add(s.source_ref_id);
  }
  return refs;
}

/** Build domestic shipments from W1 packed groups + packing slips not yet shipped. */
export function createShipmentsFromPacked(entityCode: string): Shipment[] {
  const packed = safeRead<PackGroup[]>(packGroupsKey(entityCode), [])
    .filter((g) => g.status === 'packed');
  const slips = safeRead<PackingSlip[]>(packingSlipsKey(entityCode), []);
  const covered = existingDomesticRefs(entityCode);
  const policy = getDefaultPolicyForRecordType('shipment-operational');
  const user = currentUserName();
  const list = listShipments(entityCode);
  const created: Shipment[] = [];
  let seq = list.length + 1;

  for (const g of packed) {
    if (covered.has(g.id)) continue;
    const slip = slips.find((s) => s.id === g.packing_slip_id);
    const row: Shipment = {
      id: uid('shp'),
      shipment_no: `SHP-${String(seq++).padStart(5, '0')}`,
      entity_id: entityCode,
      fiscal_year_id: g.fiscal_year_id ?? fyForDate(new Date().toISOString().slice(0, 10), entityCode),
      source: 'domestic',
      source_ref_id: g.id,
      declared_weight_kg: slip?.total_gross_kg,
      status: 'packed',
      created_by: user,
      retention_policy: policy,
      created_at: nowISO(),
      updated_at: nowISO(),
    };
    list.push(row);
    created.push(row);
  }
  writeShipments(entityCode, list);
  if (created.length) {
    logAudit({
      entityCode,
      action: 'create',
      entityType: 'dispatch_txn_event',
      entityId: created[0].id,
      summary: `Created ${created.length} domestic shipment(s) from packed groups`,
    });
  }
  return created;
}

/**
 * Build an export shipment from an Export PO.
 *
 * Canon-5 (export half): READS export PO + dispatch-mirror stores ·
 * writes ZERO EximX keys. The dispatch mirror is consumed for context only.
 */
export function createExportShipment(
  entityCode: string,
  exportPoId: string,
): Shipment | null {
  const pos = safeRead<ExportPurchaseOrder[]>(exportPOKey(entityCode), []);
  const po = pos.find((p) => p.id === exportPoId);
  if (!po) return null;
  // mirror is read-only context (informs operator · zero writes)
  const mirrors = safeRead<ExportDispatchMirror[]>(exportDispatchMirrorKey(entityCode), []);
  void mirrors.find((m) => m.related_export_po_id === exportPoId);

  const list = listShipments(entityCode);
  const seq = list.length + 1;
  const policy = getDefaultPolicyForRecordType('shipment-operational');
  const row: Shipment = {
    id: uid('shp'),
    shipment_no: `SHP-${String(seq).padStart(5, '0')}`,
    entity_id: entityCode,
    fiscal_year_id: fyForDate(new Date().toISOString().slice(0, 10), entityCode),
    source: 'export',
    source_ref_id: exportPoId,
    status: 'packed',
    created_by: currentUserName(),
    retention_policy: policy,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  list.push(row);
  writeShipments(entityCode, list);
  logAudit({
    entityCode,
    action: 'create',
    entityType: 'dispatch_txn_event',
    entityId: row.id,
    summary: `Export shipment ${row.shipment_no} created for export PO ${exportPoId}`,
  });
  return row;
}

// ── Manifest lifecycle ───────────────────────────────────────────────────

export function buildManifest(
  entityCode: string,
  transporterId: string,
  transporterName: string,
  shipmentIds: string[],
): Manifest {
  const ships = listShipments(entityCode);
  const members = ships.filter((s) => shipmentIds.includes(s.id));
  const totalDeclared = members.reduce((sum, s) => sum + (s.declared_weight_kg ?? 0), 0);
  const list = listManifests(entityCode);
  const seq = list.length + 1;
  const policy = getDefaultPolicyForRecordType('manifest');
  const today = new Date().toISOString().slice(0, 10);
  const row: Manifest = {
    id: uid('mft'),
    manifest_no: `MFT-${String(seq).padStart(5, '0')}`,
    entity_id: entityCode,
    fiscal_year_id: fyForDate(today, entityCode),
    transporter_id: transporterId,
    transporter_name: transporterName,
    manifest_date: today,
    status: 'draft',
    shipment_ids: members.map((s) => s.id),
    total_packages: members.length,
    total_declared_weight_kg: totalDeclared,
    created_by: currentUserName(),
    retention_policy: policy,
    created_at: nowISO(),
    updated_at: nowISO(),
  };
  list.push(row);
  writeManifests(entityCode, list);
  logAudit({
    entityCode,
    action: 'create',
    entityType: 'dispatch_txn_event',
    entityId: row.id,
    summary: `Manifest ${row.manifest_no} draft built · ${members.length} shipments · ${transporterName}`,
  });
  return row;
}

function assertTransition(from: ManifestStatus, to: ManifestStatus): void {
  if (!MANIFEST_VALID_TRANSITIONS[from].includes(to)) {
    throw new Error(`Manifest transition ${from} → ${to} not allowed`);
  }
}

export function finalizeManifest(entityCode: string, manifestId: string): Manifest {
  const list = listManifests(entityCode);
  const idx = list.findIndex((m) => m.id === manifestId);
  if (idx < 0) throw new Error(`Manifest ${manifestId} not found`);
  const m = list[idx];
  assertTransition(m.status, 'finalized');

  // Stamp export_po_refs from member shipments (Dispatch-side linkage only).
  const ships = listShipments(entityCode);
  const members = ships.filter((s) => m.shipment_ids.includes(s.id));
  const exportRefs = Array.from(
    new Set(
      members
        .filter((s): s is Shipment & { source_ref_id: string } =>
          s.source === 'export' && !!s.source_ref_id)
        .map((s) => s.source_ref_id),
    ),
  );
  const updated: Manifest = {
    ...m,
    status: 'finalized',
    export_po_refs: exportRefs.length ? exportRefs : undefined,
    finalized_by: currentUserName(),
    updated_at: nowISO(),
  };
  list[idx] = updated;
  writeManifests(entityCode, list);

  // Member shipments → 'manifested' + back-link manifest_id.
  for (const s of ships) {
    if (m.shipment_ids.includes(s.id) && s.status === 'packed') {
      s.status = 'manifested';
      s.manifest_id = m.id;
      s.updated_at = nowISO();
    }
  }
  writeShipments(entityCode, ships);

  logAudit({
    entityCode,
    action: 'update',
    entityType: 'dispatch_txn_event',
    entityId: updated.id,
    summary: `Manifest ${updated.manifest_no} finalized · ${members.length} shipments`,
  });
  return updated;
}

export function recordHandover(entityCode: string, manifestId: string): void {
  const ships = listShipments(entityCode);
  let changed = 0;
  for (const s of ships) {
    if (s.manifest_id === manifestId && s.status === 'manifested') {
      s.status = 'handed_over';
      s.updated_at = nowISO();
      changed++;
    }
  }
  writeShipments(entityCode, ships);
  if (changed) {
    logAudit({
      entityCode,
      action: 'update',
      entityType: 'dispatch_txn_event',
      entityId: manifestId,
      summary: `Manifest ${manifestId} handover recorded · ${changed} shipments → handed_over`,
    });
  }
}

// ── Acknowledgement (Logistics-side write surface) ───────────────────────

export interface AckInput {
  acknowledged_by: string;
  discrepancy_note?: string;
  packages_counted?: number;
}

/**
 * Append an ack ledger entry and flip the manifest status.
 * `discrepancy_note` present → status 'discrepancy', else 'acknowledged'.
 *
 * Logistics Manifest Queue page writes ONLY through this surface.
 */
export function acknowledgeManifest(
  entityCode: string,
  manifestId: string,
  input: AckInput,
): { ack: ManifestAck; manifest: Manifest } {
  const list = listManifests(entityCode);
  const idx = list.findIndex((m) => m.id === manifestId);
  if (idx < 0) throw new Error(`Manifest ${manifestId} not found`);
  const m = list[idx];
  const nextStatus: ManifestStatus = input.discrepancy_note ? 'discrepancy' : 'acknowledged';
  // Allow draft→? guard: only finalized/discrepancy can transition to acknowledged/discrepancy.
  if (m.status !== 'finalized' && m.status !== 'discrepancy') {
    throw new Error(`Manifest ${m.manifest_no} cannot be acknowledged from ${m.status}`);
  }
  if (m.status === 'discrepancy' && nextStatus === 'discrepancy') {
    // re-ack with another discrepancy stays in discrepancy (no-op transition)
  } else if (m.status === 'finalized') {
    assertTransition(m.status, nextStatus);
  } else if (m.status === 'discrepancy' && nextStatus === 'acknowledged') {
    assertTransition(m.status, nextStatus);
  }

  const acks = listManifestAcks(entityCode);
  const ack: ManifestAck = {
    id: uid('ack'),
    manifest_id: manifestId,
    acknowledged_by: input.acknowledged_by,
    ack_at: nowISO(),
    discrepancy_note: input.discrepancy_note,
    packages_counted: input.packages_counted,
    created_at: nowISO(),
  };
  acks.push(ack);
  writeManifestAcks(entityCode, acks);

  const updated: Manifest = {
    ...m,
    status: nextStatus,
    updated_at: nowISO(),
  };
  list[idx] = updated;
  writeManifests(entityCode, list);

  logAudit({
    entityCode,
    action: 'update',
    entityType: 'dispatch_txn_event',
    entityId: updated.id,
    summary: `Manifest ${updated.manifest_no} acknowledged by ${input.acknowledged_by}${input.discrepancy_note ? ' · discrepancy' : ''}`,
  });
  return { ack, manifest: updated };
}

// ── Tolerance evaluation + dispute ───────────────────────────────────────

export interface ToleranceCheckResult {
  status: 'within_tolerance' | 'breach_dispute_raised';
  variance_kg: number;
  variance_pct: number;
  dispute?: Dispute;
  manifest: Manifest;
}

/**
 * Compare billed weight vs declared. Founder DP:
 *   - breach beyond BOTH pct AND abs → createDisputeFromMatch via existing engine
 *   - within tolerance → recorded as accepted_variance on the manifest
 *   - missing tolerance group → conservative default (5% · 500g)
 */
export function checkToleranceAndDispute(
  entityCode: string,
  manifestId: string,
  billedWeightKg: number,
): ToleranceCheckResult {
  const list = listManifests(entityCode);
  const idx = list.findIndex((m) => m.id === manifestId);
  if (idx < 0) throw new Error(`Manifest ${manifestId} not found`);
  const m = list[idx];
  const declared = m.total_declared_weight_kg;
  const varianceKg = billedWeightKg - declared;
  const variancePct = declared > 0 ? (Math.abs(varianceKg) / declared) * 100 : 0;
  const tol = getToleranceGroupForTransporter(entityCode, m.transporter_id);
  const tolPct = tol?.weight_tolerance_pct ?? 5;
  const tolAbsKg = (tol?.weight_tolerance_abs_g ?? 500) / 1000;

  const pctBreached = variancePct > tolPct;
  const absBreached = Math.abs(varianceKg) > tolAbsKg;
  const bothBreached = pctBreached && absBreached;

  if (!bothBreached) {
    const updated: Manifest = {
      ...m,
      accepted_variance: {
        billed_weight_kg: billedWeightKg,
        variance_kg: varianceKg,
        variance_pct: variancePct,
        note: `Within tolerance (pct ${tolPct}% · abs ${tolAbsKg}kg) · billed ${billedWeightKg}kg vs declared ${declared}kg`,
        at: nowISO(),
      },
      updated_at: nowISO(),
    };
    list[idx] = updated;
    writeManifests(entityCode, list);
    logAudit({
      entityCode,
      action: 'update',
      entityType: 'dispatch_txn_event',
      entityId: updated.id,
      summary: `Manifest ${updated.manifest_no} accepted variance ${varianceKg.toFixed(2)}kg (${variancePct.toFixed(1)}%)`,
    });
    return {
      status: 'within_tolerance',
      variance_kg: varianceKg,
      variance_pct: variancePct,
      manifest: updated,
    };
  }

  // Breach: consume existing dispute engine. Synthesize a MatchLine wrapper.
  const tolerance: ToleranceConfig = {
    pct: tolPct,
    amount_paise: 0,
    source: tol ? 'tenant_default' : 'tenant_default',
  };
  const matchLine: MatchLine = {
    id: uid('mlw'),
    entity_id: entityCode,
    invoice_id: `manifest:${m.id}`,
    invoice_line_id: m.id,
    lr_no: m.manifest_no,
    dln_voucher_id: null,
    dln_voucher_no: null,
    expected_amount: declared,
    declared_amount: billedWeightKg,
    variance_amount: varianceKg,
    variance_pct: variancePct,
    status: varianceKg > 0 ? 'over_billed' : 'under_billed',
    tolerance_used: tolerance,
    payer_model: 'manufacturer',
    auto_decision: 'dispute',
    computed_at: nowISO(),
  };
  const reason =
    `Manifest ${m.manifest_no} weight breach · billed ${billedWeightKg}kg vs declared ${declared}kg ` +
    `· variance ${varianceKg.toFixed(2)}kg (${variancePct.toFixed(1)}%) · tolerance ${tolPct}% AND ${tolAbsKg}kg both exceeded`;
  const dispute = createDisputeFromMatch(
    matchLine,
    m.transporter_id,
    m.transporter_name,
    currentUserName(),
    reason,
  );
  const disputes = safeRead<Dispute[]>(disputesKey(entityCode), []);
  disputes.push(dispute);
  safeWrite(disputesKey(entityCode), disputes);

  const updated: Manifest = {
    ...m,
    dispute_id: dispute.id,
    updated_at: nowISO(),
  };
  list[idx] = updated;
  writeManifests(entityCode, list);

  logAudit({
    entityCode,
    action: 'update',
    entityType: 'dispatch_txn_event',
    entityId: updated.id,
    summary: `Manifest ${updated.manifest_no} tolerance breach · dispute ${dispute.id} raised`,
  });
  return {
    status: 'breach_dispute_raised',
    variance_kg: varianceKg,
    variance_pct: variancePct,
    dispute,
    manifest: updated,
  };
}

// ── Read API: the flip's mirror read (consumed by EximX rider + Wave-2) ──

export function getManifestForExportPO(
  entityCode: string,
  exportPoId: string,
): Manifest | null {
  const manifests = listManifests(entityCode).filter(
    (m) => m.export_po_refs?.includes(exportPoId),
  );
  if (manifests.length === 0) return null;
  // Latest finalized/acknowledged wins (deterministic recency by updated_at).
  return manifests.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
}

// ── Chips/summary ────────────────────────────────────────────────────────

export interface ManifestSummary {
  totalManifests: number;
  drafts: number;
  finalized: number;
  acknowledged: number;
  discrepancy: number;
  shipmentsPacked: number;
  shipmentsManifested: number;
  shipmentsHandedOver: number;
  exportLinkedManifests: number;
}

export function getManifestSummary(entityCode: string): ManifestSummary {
  const manifests = listManifests(entityCode);
  const shipments = listShipments(entityCode);
  return {
    totalManifests: manifests.length,
    drafts: manifests.filter((m) => m.status === 'draft').length,
    finalized: manifests.filter((m) => m.status === 'finalized').length,
    acknowledged: manifests.filter((m) => m.status === 'acknowledged').length,
    discrepancy: manifests.filter((m) => m.status === 'discrepancy').length,
    shipmentsPacked: shipments.filter((s) => s.status === 'packed').length,
    shipmentsManifested: shipments.filter((s) => s.status === 'manifested').length,
    shipmentsHandedOver: shipments.filter((s) => s.status === 'handed_over').length,
    exportLinkedManifests: manifests.filter((m) => (m.export_po_refs?.length ?? 0) > 0).length,
  };
}

// ── Helpers for Logistics page (read-only filtered manifests) ────────────

export function listManifestsForTransporter(
  entityCode: string,
  transporterId: string,
): Manifest[] {
  return listManifests(entityCode).filter((m) => m.transporter_id === transporterId);
}

export function listAcksForManifest(entityCode: string, manifestId: string): ManifestAck[] {
  return listManifestAcks(entityCode).filter((a) => a.manifest_id === manifestId);
}

/** Source classifier helper (UI badges). */
export function classifyShipmentSource(s: Shipment): ShipmentSource {
  return s.source;
}
