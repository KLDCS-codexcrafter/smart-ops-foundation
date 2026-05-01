/**
 * consumption.ts — Material Issue Note + Consumption Entry + Intelligence Alerts
 * Sprint T-Phase-1.2.2 · Inventory Hub Card #2 sub-sprint 2/3 · The MOAT sprint
 *
 * D-127 boundary: MIN + Consumption transactions live in inventory/transactions/.
 * D-128 boundary: voucher.ts is BYTE-IDENTICAL · existing fields reused (department_id,
 *   project_centre_id, purpose, inventory_lines).
 * D-216: Consumption P&L is computed live · never persisted.
 *
 * Pattern: GRN credits stock → MIN moves stock between godowns → Consumption Entry
 *          deducts from departmental godown and tags it to a job/overhead/site.
 *
 * [JWT] GET/POST/PATCH /api/inventory/material-issue-notes
 * [JWT] GET/POST/PATCH /api/inventory/consumption-entries
 */

// ── Material Issue Note ───────────────────────────────────────────────────

export type MINStatus = 'draft' | 'issued' | 'cancelled';

export interface MINLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  qty: number;                     // qty being transferred (Decimal-safe)
  rate: number;                    // weighted-avg rate at issue time (snapshot)
  value: number;                   // qty × rate · Decimal.js
  available_qty_at_issue: number;  // snapshot of from-godown balance at issue (audit)
  batch_no: string | null;
  notes: string;
}

export interface MaterialIssueNote {
  id: string;
  entity_id: string;
  min_no: string;                  // MIN/YY-YY/NNNN via generateDocNo('MIN', entityCode)
  status: MINStatus;

  issue_date: string;              // YYYY-MM-DD
  // Source — godown stock comes OUT of
  from_godown_id: string;
  from_godown_name: string;
  // Destination — godown stock goes INTO
  to_godown_id: string;
  to_godown_name: string;
  // Department & accountability
  to_department_code: string | null;       // GodownDepartmentCode of receiving godown
  requested_by_id: string;                 // SAMPerson.id who requested the material
  requested_by_name: string;
  issued_by_id: string;                    // SAMPerson.id who physically released stock
  issued_by_name: string;
  // Project tagging (MOAT — D-218)
  project_centre_id: string | null;

  lines: MINLine[];
  total_qty: number;
  total_value: number;
  narration: string;

  created_at: string;
  updated_at: string;
  issued_at: string | null;        // set when status flips to 'issued'
  cancelled_at: string | null;
  cancellation_reason: string | null;
  /** Sprint T-Phase-1.2.5h-b1 · CGST Rule 56(8) edit/delete chain */
  superseded_by?: string | null;
  version?: number;
}

export const minNotesKey = (entityCode: string): string =>
  `erp_material_issue_notes_${entityCode}`;

export const MIN_STATUS_LABELS: Record<MINStatus, string> = {
  draft:     'Draft',
  issued:    'Issued',
  cancelled: 'Cancelled',
};

export const MIN_STATUS_COLORS: Record<MINStatus, string> = {
  draft:     'bg-slate-500/10 text-slate-600',
  issued:    'bg-emerald-500/10 text-emerald-700',
  cancelled: 'bg-rose-500/10 text-rose-700',
};

// ── Consumption Entry ─────────────────────────────────────────────────────

export type ConsumptionMode = 'job' | 'overhead' | 'site';
export type ConsumptionStatus = 'draft' | 'posted' | 'cancelled';

export interface ConsumptionLine {
  id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  /** BOM standard qty for this output (auto-filled if BOM present, else 0). */
  standard_qty: number;
  /** Actual qty consumed (manually entered). */
  actual_qty: number;
  /** Variance = actual - standard. Decimal.js. */
  variance_qty: number;
  /** Variance percent vs standard (0 if standard_qty = 0). */
  variance_percent: number;
  rate: number;
  value: number;                   // actual_qty × rate · Decimal.js
  notes: string;
}

export interface ConsumptionEntry {
  id: string;
  entity_id: string;
  ce_no: string;                   // CE/YY-YY/NNNN via generateDocNo('CE', entityCode)
  status: ConsumptionStatus;

  consumption_date: string;        // YYYY-MM-DD
  mode: ConsumptionMode;           // job · overhead · site
  // Source godown — stock deducted from here
  godown_id: string;
  godown_name: string;
  department_code: string | null;  // copied from source godown

  // Mode-specific tagging
  /** Job: project + (optional) BOM reference */
  project_centre_id: string | null;
  bom_id: string | null;
  bom_version_no: number | null;
  output_qty: number;              // for job mode — used to scale BOM standard qty
  output_uom: string | null;

  /** Overhead: ledger that gets the consumption Dr (e.g. Maintenance Expense) */
  overhead_ledger_id: string | null;
  overhead_ledger_name: string | null;

  /** Site: project + site reference text */
  site_reference: string | null;

  // Accountability
  consumed_by_id: string;          // SAMPerson.id
  consumed_by_name: string;

  lines: ConsumptionLine[];
  total_qty: number;
  total_value: number;
  total_variance_value: number;    // sum(variance_qty × rate)

  narration: string;

  created_at: string;
  updated_at: string;
  posted_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
}

export const consumptionEntriesKey = (entityCode: string): string =>
  `erp_consumption_entries_${entityCode}`;

export const CONSUMPTION_MODE_LABELS: Record<ConsumptionMode, string> = {
  job:      'Job · Project',
  overhead: 'Overhead · Department',
  site:     'Site · Field',
};

export const CONSUMPTION_MODE_COLORS: Record<ConsumptionMode, string> = {
  job:      'bg-blue-500/10 text-blue-700',
  overhead: 'bg-amber-500/10 text-amber-700',
  site:     'bg-purple-500/10 text-purple-700',
};

export const CONSUMPTION_STATUS_LABELS: Record<ConsumptionStatus, string> = {
  draft:     'Draft',
  posted:    'Posted',
  cancelled: 'Cancelled',
};

export const CONSUMPTION_STATUS_COLORS: Record<ConsumptionStatus, string> = {
  draft:     'bg-slate-500/10 text-slate-600',
  posted:    'bg-emerald-500/10 text-emerald-700',
  cancelled: 'bg-rose-500/10 text-rose-700',
};

// ── Consumption Intelligence Alerts ───────────────────────────────────────

export type AlertSeverity = 'info' | 'warn' | 'critical';

export type AlertKind =
  | 'rate_anomaly'           // consumption rate spiked vs trailing avg
  | 'material_ageing'        // stock has not moved for N days
  | 'unaccounted_consumption'; // MIN issued but no Consumption Entry tagged

export interface ConsumptionAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  description: string;
  /** Reference IDs for drill-down (item / godown / dept / MIN). */
  ref_item_id?: string | null;
  ref_godown_id?: string | null;
  ref_department_code?: string | null;
  ref_min_id?: string | null;
  /** Numeric magnitude (₹ leak, days idle, % anomaly) for sorting. */
  magnitude: number;
  detected_at: string;       // ISO
}

/**
 * Alert cache key — D-216 says intelligence is computed live, not persisted.
 * This key is reset/invalidated by ClientBlueprintsPage so resets are clean.
 */
export const consumptionAlertsKey = (entityCode: string): string =>
  `erp_consumption_alerts_${entityCode}`;

export const ALERT_SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info:     'bg-blue-500/10 text-blue-700',
  warn:     'bg-amber-500/10 text-amber-700',
  critical: 'bg-rose-500/10 text-rose-700',
};
