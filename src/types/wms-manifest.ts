/**
 * wms-manifest.ts — WMS3 manifests, shipments, package-types, tolerance-groups
 *
 * Sprint WMS3 · T-WMS3-Manifest-Ship · WMS-ARC 3 of 3 (CLOSE)
 *
 * Single-Door canon (export half): manifest links to export PO via Dispatch-side
 * `export_po_refs` — EximX mirror store is NEVER written by Dispatch. EximX
 * gets a read-only badge that consumes `getManifestForExportPO`.
 *
 * Ack pattern = LR-acceptance verbatim (logistic-portal.ts:LRAcceptance shape):
 * Dispatch writes manifests · Logistics writes ONLY the ManifestAck ledger.
 *
 * P8.6 floor: Manifest + Shipment born with retention_policy + created_by.
 * Retention: manifest → gst_8yr (e-way/GST-adjacent transport doc);
 *            shipment + manifest-ack → operational_log_only.
 *
 * [JWT] Wave-2: courier APIs (label/tracking/webhooks) + e-way bill integration
 *               + auth-derived transporter identity for ack writes.
 */
import type { RetentionPolicyId } from './record-retention';

// ─── Package-Type master ──────────────────────────────────────────────────
export type PackageTypeStatus = 'active' | 'inactive';

export interface PackageTypeMaster {
  id: string;
  code: string;
  label: string;
  length_cm?: number;
  width_cm?: number;
  height_cm?: number;
  std_weight_kg?: number;
  status: PackageTypeStatus;
  created_at: string;
  updated_at: string;
}

export const packageTypesKey = (e: string): string => `erp_wms_package_types_${e}`;

// ─── Tolerance-Group master (per-transporter weight tolerance) ────────────
export interface ToleranceGroup {
  id: string;
  transporter_id: string;
  transporter_name: string;
  /** Percentage tolerance on declared weight (e.g. 5 = ±5%). */
  weight_tolerance_pct: number;
  /** Absolute tolerance in grams. */
  weight_tolerance_abs_g: number;
  /** Founder DP: breach beyond BOTH pct AND abs → auto-dispute. */
  action_on_breach: 'auto_dispute';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export const toleranceGroupsKey = (e: string): string => `erp_wms_tolerance_groups_${e}`;

// ─── Shipment ─────────────────────────────────────────────────────────────
export type ShipmentSource = 'domestic' | 'export';
export type ShipmentStatus = 'packed' | 'manifested' | 'handed_over';

export interface Shipment {
  id: string;
  shipment_no: string;
  entity_id: string;
  fiscal_year_id: string;
  manifest_id?: string;
  source: ShipmentSource;
  /** packing_slip id / pack_group id (domestic) · export_po id (export). */
  source_ref_id?: string;
  package_type_id?: string;
  declared_weight_kg?: number;
  tracking_ref?: string;
  status: ShipmentStatus;
  // P8.6 floor — born with these
  created_by?: string;
  retention_policy?: RetentionPolicyId;
  created_at: string;
  updated_at: string;
}

export const shipmentsKey = (e: string): string => `erp_wms_shipments_${e}`;

// ─── Manifest ─────────────────────────────────────────────────────────────
export type ManifestStatus =
  | 'draft'
  | 'finalized'
  | 'acknowledged'
  | 'discrepancy';

export interface Manifest {
  id: string;
  manifest_no: string;
  entity_id: string;
  fiscal_year_id: string;
  transporter_id: string;
  transporter_name: string;
  manifest_date: string;
  status: ManifestStatus;
  shipment_ids: string[];
  total_packages: number;
  total_declared_weight_kg: number;
  /** Single-Door export linkage · Dispatch-side ONLY (mirror untouched). */
  export_po_refs?: string[];
  /** Accepted variance note (within-tolerance handover · never a silent write-off). */
  accepted_variance?: {
    billed_weight_kg: number;
    variance_kg: number;
    variance_pct: number;
    note: string;
    at: string;
  };
  /** Created dispute id (recorded when tolerance breach auto-disputes). */
  dispute_id?: string;
  finalized_by?: string;
  // P8.6 floor — born with these
  created_by?: string;
  retention_policy?: RetentionPolicyId;
  created_at: string;
  updated_at: string;
}

export const manifestsKey = (e: string): string => `erp_wms_manifests_${e}`;

// ─── Manifest Acknowledgement (the LR-acceptance pattern · Logistics-side) ─
export interface ManifestAck {
  id: string;
  manifest_id: string;
  /** Transporter portal free-text (auth-derived in Wave-2). */
  acknowledged_by: string;
  ack_at: string;
  /** Present → manifest status becomes 'discrepancy'. */
  discrepancy_note?: string;
  packages_counted?: number;
  created_at: string;
}

export const manifestAcksKey = (e: string): string => `erp_wms_manifest_acks_${e}`;

// ─── Status transitions (documentation · enforced in engine) ──────────────
export const MANIFEST_VALID_TRANSITIONS: Record<ManifestStatus, ManifestStatus[]> = {
  draft: ['finalized'],
  finalized: ['acknowledged', 'discrepancy'],
  acknowledged: [],
  discrepancy: ['acknowledged'],
};

export const SHIPMENT_VALID_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  packed: ['manifested'],
  manifested: ['handed_over'],
  handed_over: [],
};
