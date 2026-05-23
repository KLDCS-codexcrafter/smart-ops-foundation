/**
 * @file        src/lib/job-work-shortage-engine.ts
 * @sprint      T-Phase-3.PROD-2 · Sub-themes 3 + 6 · PROD-LEAK-5 + LEAK-8 closure
 *              · Q-LOCK-3 + Q-LOCK-6
 * @purpose     JW return shortage detection (real-time at receipt) + JW shrinkage register
 *              (quarterly + 3% SLA). Single sub-helper engine · NOT a new SIBLING.
 * @disciplines FR-26 entity-scoped · FR-93 engine-side ls-helper
 * @[JWT]       POST /api/production/jw-shortage/detect · GET /api/production/jw-shrinkage
 */

import type { JobWorkReceipt } from '@/types/job-work-receipt';
import { jobWorkReceiptsKey } from '@/types/job-work-receipt';

// ── Shortage detection (LEAK-5 · Q-LOCK-3) ─────────────────────────

export interface JWShortageThresholds {
  shortage_pct_threshold: number;
  shortage_value_threshold: number;
}

export const DEFAULT_JW_SHORTAGE_THRESHOLDS: JWShortageThresholds = {
  shortage_pct_threshold: 5,
  shortage_value_threshold: 10_000,
};

export interface JWShortageAlert {
  id: string;
  jw_receipt_id: string;
  jw_receipt_no: string;
  jwo_id: string;
  vendor_id: string;
  vendor_name: string;
  item_id: string;
  item_name: string;
  expected_qty: number;
  received_qty: number;
  shortage_qty: number;
  shortage_pct: number;
  shortage_value: number;
  severity: 'warning' | 'critical';
  triggered_at: string;
  acknowledged_at: string | null;
  acknowledged_by: { id: string; name: string } | null;
  valuation_suggestion: number;
}

const shortageThresholdsKey = (entityCode: string): string =>
  `erp_jw_shortage_thresholds_${entityCode}`;
const shortageAlertsKey = (entityCode: string): string =>
  `erp_jw_shortage_alerts_${entityCode}`;
const shrinkageRegisterKey = (entityCode: string): string =>
  `erp_jw_shrinkage_register_${entityCode}`;

function lsRead<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET /api/* (engine-side)
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: unknown): void {
  try {
    // [JWT] PUT /api/*
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota silent */
  }
}

export function getJWShortageThresholds(entityCode: string): JWShortageThresholds {
  return lsRead<JWShortageThresholds>(shortageThresholdsKey(entityCode), DEFAULT_JW_SHORTAGE_THRESHOLDS);
}

export function setJWShortageThresholds(
  entityCode: string,
  thresholds: JWShortageThresholds,
): void {
  lsWrite(shortageThresholdsKey(entityCode), thresholds);
}

/** Per-unit valuation fallback for stub mode · ₹1 placeholder until rate-master wired. */
function getUnitRate(_itemId: string, _entityCode: string): number {
  // [JWT] GET /api/items/:id/standard-rate
  return 1;
}

export function detectJWReceiptShortages(
  receipt: JobWorkReceipt,
  entityCode: string,
): JWShortageAlert[] {
  const thresholds = getJWShortageThresholds(entityCode);
  const now = new Date().toISOString();
  const out: JWShortageAlert[] = [];
  for (const line of receipt.lines) {
    const shortage_qty = Math.max(0, line.expected_qty - line.received_qty);
    if (shortage_qty <= 0) continue;
    const shortage_pct =
      line.expected_qty > 0 ? (shortage_qty / line.expected_qty) * 100 : 0;
    const rate = getUnitRate(line.item_id, entityCode);
    const shortage_value = Math.round(shortage_qty * rate);
    const breachesPct = shortage_pct >= thresholds.shortage_pct_threshold;
    const breachesVal = shortage_value >= thresholds.shortage_value_threshold;
    if (!breachesPct && !breachesVal) continue;
    const severity: 'warning' | 'critical' =
      shortage_pct >= thresholds.shortage_pct_threshold * 2 ||
      shortage_value >= thresholds.shortage_value_threshold * 2
        ? 'critical'
        : 'warning';
    out.push({
      id: `jwsh-${receipt.id}-${line.id}-${Date.now()}`,
      jw_receipt_id: receipt.id,
      jw_receipt_no: receipt.doc_no,
      jwo_id: receipt.job_work_out_order_id,
      vendor_id: receipt.vendor_id,
      vendor_name: receipt.vendor_name,
      item_id: line.item_id,
      item_name: line.item_name,
      expected_qty: line.expected_qty,
      received_qty: line.received_qty,
      shortage_qty: Number(shortage_qty.toFixed(4)),
      shortage_pct: Number(shortage_pct.toFixed(2)),
      shortage_value,
      severity,
      triggered_at: now,
      acknowledged_at: null,
      acknowledged_by: null,
      valuation_suggestion: shortage_value,
    });
  }
  return out;
}

export function persistJWShortageAlerts(
  alerts: JWShortageAlert[],
  entityCode: string,
): void {
  if (alerts.length === 0) return;
  const existing = lsRead<JWShortageAlert[]>(shortageAlertsKey(entityCode), []);
  lsWrite(shortageAlertsKey(entityCode), [...alerts, ...existing].slice(0, 1000));
}

export function listOpenJWShortageAlerts(entityCode: string): JWShortageAlert[] {
  return lsRead<JWShortageAlert[]>(shortageAlertsKey(entityCode), []).filter(
    a => a.acknowledged_at === null,
  );
}

export function acknowledgeJWShortageAlert(
  alertId: string,
  entityCode: string,
  user: { id: string; name: string },
): void {
  const list = lsRead<JWShortageAlert[]>(shortageAlertsKey(entityCode), []);
  const next = list.map(a =>
    a.id === alertId
      ? { ...a, acknowledged_at: new Date().toISOString(), acknowledged_by: user }
      : a,
  );
  lsWrite(shortageAlertsKey(entityCode), next);
}

// ── Shrinkage register (LEAK-8 · Q-LOCK-6) ─────────────────────────

export const SLA_BREACH_THRESHOLD_PCT = 3;

export interface JWShrinkageVendorSummary {
  vendor_id: string;
  vendor_name: string;
  quarter: string;
  total_expected_qty: number;
  total_received_qty: number;
  total_shrinkage_qty: number;
  shrinkage_pct: number;
  shrinkage_value: number;
  sla_breach: boolean;
  receipts_count: number;
  last_updated: string;
}

/** Quarter label e.g. 'Q1-FY26' (Apr-Jun is Q1 in Indian FY). */
function quarterLabelForDate(iso: string): string {
  const d = new Date(iso);
  const m = d.getMonth(); // 0-11
  // FY starts April. Apr-Jun=Q1, Jul-Sep=Q2, Oct-Dec=Q3, Jan-Mar=Q4.
  const fyStartYear = m >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  const fyLabel = `FY${String((fyStartYear + 1) % 100).padStart(2, '0')}`;
  const qNum = m >= 3 && m <= 5 ? 1 : m >= 6 && m <= 8 ? 2 : m >= 9 && m <= 11 ? 3 : 4;
  return `Q${qNum}-${fyLabel}`;
}

export function currentQuarterLabel(): string {
  return quarterLabelForDate(new Date().toISOString());
}

export function computeJWShrinkageRegister(
  entityCode: string,
  quarter?: string,
): JWShrinkageVendorSummary[] {
  const target = quarter ?? currentQuarterLabel();
  const receipts = lsRead<JobWorkReceipt[]>(jobWorkReceiptsKey(entityCode), []).filter(
    r => r.status === 'received' && quarterLabelForDate(r.receipt_date) === target,
  );
  const byVendor = new Map<string, JWShrinkageVendorSummary>();
  for (const r of receipts) {
    const v =
      byVendor.get(r.vendor_id) ??
      {
        vendor_id: r.vendor_id,
        vendor_name: r.vendor_name,
        quarter: target,
        total_expected_qty: 0,
        total_received_qty: 0,
        total_shrinkage_qty: 0,
        shrinkage_pct: 0,
        shrinkage_value: 0,
        sla_breach: false,
        receipts_count: 0,
        last_updated: new Date().toISOString(),
      };
    for (const line of r.lines) {
      v.total_expected_qty += line.expected_qty;
      v.total_received_qty += line.received_qty;
      const sh = Math.max(0, line.expected_qty - line.received_qty);
      v.total_shrinkage_qty += sh;
      v.shrinkage_value += Math.round(sh * getUnitRate(line.item_id, entityCode));
    }
    v.receipts_count += 1;
    byVendor.set(r.vendor_id, v);
  }
  const summaries: JWShrinkageVendorSummary[] = [];
  for (const v of byVendor.values()) {
    v.shrinkage_pct =
      v.total_expected_qty > 0
        ? Number(((v.total_shrinkage_qty / v.total_expected_qty) * 100).toFixed(2))
        : 0;
    v.sla_breach = v.shrinkage_pct > SLA_BREACH_THRESHOLD_PCT;
    v.last_updated = new Date().toISOString();
    summaries.push(v);
  }
  // Persist snapshot (replace for this quarter)
  const all = lsRead<JWShrinkageVendorSummary[]>(shrinkageRegisterKey(entityCode), []);
  const other = all.filter(s => s.quarter !== target);
  lsWrite(shrinkageRegisterKey(entityCode), [...other, ...summaries]);
  return summaries;
}

export function getJWShrinkageBreaches(entityCode: string): JWShrinkageVendorSummary[] {
  return lsRead<JWShrinkageVendorSummary[]>(shrinkageRegisterKey(entityCode), []).filter(
    s => s.sla_breach,
  );
}

export function exportJWShrinkageRegister(
  entityCode: string,
  quarter: string,
): JWShrinkageVendorSummary[] {
  return lsRead<JWShrinkageVendorSummary[]>(shrinkageRegisterKey(entityCode), []).filter(
    s => s.quarter === quarter,
  );
}
