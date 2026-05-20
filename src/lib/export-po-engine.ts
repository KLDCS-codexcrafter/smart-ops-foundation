/**
 * @file        src/lib/export-po-engine.ts
 * @purpose     Export PO CRUD + status transitions + LUT gate enforcement
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import type { ExportPurchaseOrder, ExportPOStatus } from '@/types/export-purchase-order';
import { exportPOKey, EXPORT_PO_VALID_TRANSITIONS } from '@/types/export-purchase-order';
import { SINHA_EXPORT_POS } from '@/data/sinha-export-po-seed-data';
import { evaluateExportReadiness } from '@/lib/export-readiness-engine';

export function loadExportPOs(entityCode: string): ExportPurchaseOrder[] {
  try {
    const raw = localStorage.getItem(exportPOKey(entityCode));
    if (!raw) {
      localStorage.setItem(exportPOKey(entityCode), JSON.stringify(SINHA_EXPORT_POS));
      return SINHA_EXPORT_POS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ExportPurchaseOrder[]) : SINHA_EXPORT_POS;
  } catch { return SINHA_EXPORT_POS; }
}

export function saveExportPOs(entityCode: string, pos: ExportPurchaseOrder[]): void {
  localStorage.setItem(exportPOKey(entityCode), JSON.stringify(pos));
}

export function getExportPO(entityCode: string, id: string): ExportPurchaseOrder | null {
  return loadExportPOs(entityCode).find((p) => p.id === id) ?? null;
}

export function transitionExportPO(entityCode: string, poId: string, newStatus: ExportPOStatus): ExportPurchaseOrder {
  const pos = loadExportPOs(entityCode);
  const po = pos.find((p) => p.id === poId);
  if (!po) throw new Error(`Export PO not found: ${poId}`);
  if (!EXPORT_PO_VALID_TRANSITIONS[po.status].includes(newStatus)) {
    throw new Error(`Invalid Export PO transition: ${po.status} → ${newStatus}`);
  }
  if (newStatus !== 'draft' && newStatus !== 'cancelled') {
    const readiness = evaluateExportReadiness(entityCode, po);
    if (!readiness.is_ready && newStatus === 'pending_lut_validation') {
      throw new Error(`Export PO LUT gate failed: ${readiness.blocking_reasons.join(' · ')}`);
    }
  }
  const updated = { ...po, status: newStatus, updated_at: new Date().toISOString() };
  saveExportPOs(entityCode, pos.map((p) => (p.id === poId ? updated : p)));
  return updated;
}

export function summarizeExportPOs(pos: ExportPurchaseOrder[]): {
  total: number;
  by_status: Record<string, number>;
  by_country: Record<string, number>;
  total_fob_value_inr: number;
  lut_blocked_count: number;
  high_risk_buyer_count: number;
} {
  const summary = {
    total: pos.length,
    by_status: {} as Record<string, number>,
    by_country: {} as Record<string, number>,
    total_fob_value_inr: 0,
    lut_blocked_count: 0,
    high_risk_buyer_count: 0,
  };
  for (const p of pos) {
    summary.by_status[p.status] = (summary.by_status[p.status] ?? 0) + 1;
    summary.by_country[p.country_code] = (summary.by_country[p.country_code] ?? 0) + 1;
    summary.total_fob_value_inr += p.total_fob_value_inr;
    if (p.lut_status_at_validation === 'expired' || p.lut_status_at_validation === 'not_found') summary.lut_blocked_count += 1;
    if (p.buyer_country_risk === 'high' || p.buyer_reliability_score_at_commit < 50) summary.high_risk_buyer_count += 1;
  }
  return summary;
}
