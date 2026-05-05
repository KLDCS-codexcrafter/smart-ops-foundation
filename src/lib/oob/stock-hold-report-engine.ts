/**
 * stock-hold-report-engine.ts — OOB
 * Sprint T-Phase-1.2.6f-d-2-card6-6-pre-2 · Block B · D-361
 *
 * OOB pure-query thin-wrapper. Joins InwardReceipt quarantine lines (Card #6)
 * with QA inspection status from listPendingQa (Card #5 read-only).
 * Mirrors contract-expiry-alerts D-291 OOB-54 pattern.
 *
 * No writes · no schema · pure read-only join.
 *
 * [JWT] GET /api/logistic/reports/stock-hold?entityCode=:e
 */
import { listQuarantineQueue } from '@/lib/inward-receipt-engine';
import { listPendingQa } from '@/lib/qa-inspection-engine';
import type { InwardReceipt, InwardReceiptLine } from '@/types/inward-receipt';

export type StockHoldQAStatus = 'no_inspection' | 'pending' | 'in_progress' | 'completed';

export interface StockHoldRow {
  receipt_id: string;
  receipt_no: string;
  arrival_date: string;
  age_days: number;
  vendor_id: string;
  vendor_name: string;
  godown_name: string;
  line_id: string;
  item_code: string;
  item_name: string;
  uom: string;
  received_qty: number;
  batch_no: string | null;
  qa_status: StockHoldQAStatus;
  qa_no: string | null;
  routing_reason: string;
}

export interface StockHoldVendorSummary {
  vendor_id: string;
  vendor_name: string;
  total_lines: number;
  oldest_age_days: number;
  pending_inspection: number;
  no_inspection: number;
}

function ageDays(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

function statusForLine(
  line: InwardReceiptLine,
  pendingByItem: Map<string, { qa_no: string; status: 'pending' | 'in_progress' }>,
): { qa_status: StockHoldQAStatus; qa_no: string | null } {
  if (line.qa_plan_id) {
    const hit = pendingByItem.get(line.item_id);
    if (hit) return { qa_status: hit.status, qa_no: hit.qa_no };
    return { qa_status: 'pending', qa_no: null };
  }
  return { qa_status: 'no_inspection', qa_no: null };
}

export function getStockHoldReport(entityCode: string): StockHoldRow[] {
  // [JWT] GET /api/logistic/inward-receipts?status=quarantine
  const quarantine: InwardReceipt[] = listQuarantineQueue(entityCode);
  // [JWT] GET /api/qa/inspections?status=pending
  const pending = listPendingQa(entityCode);

  const pendingByItem = new Map<string, { qa_no: string; status: 'pending' | 'in_progress' }>();
  pending.forEach(p => {
    p.lines.forEach(l => {
      const st = (p.status === 'in_progress' ? 'in_progress' : 'pending') as 'pending' | 'in_progress';
      if (!pendingByItem.has(l.item_id)) {
        pendingByItem.set(l.item_id, { qa_no: p.qa_no, status: st });
      }
    });
  });

  const out: StockHoldRow[] = [];
  quarantine.forEach(ir => {
    const age = ageDays(ir.arrival_date);
    ir.lines.forEach(line => {
      if (line.routing_decision !== 'quarantine' && line.routing_decision !== 'inspection_required') return;
      const { qa_status, qa_no } = statusForLine(line, pendingByItem);
      out.push({
        receipt_id: ir.id,
        receipt_no: ir.receipt_no,
        arrival_date: ir.arrival_date,
        age_days: age,
        vendor_id: ir.vendor_id,
        vendor_name: ir.vendor_name,
        godown_name: ir.godown_name,
        line_id: line.id,
        item_code: line.item_code,
        item_name: line.item_name,
        uom: line.uom,
        received_qty: line.received_qty,
        batch_no: line.batch_no,
        qa_status,
        qa_no,
        routing_reason: line.routing_reason,
      });
    });
  });
  return out.sort((a, b) => b.age_days - a.age_days);
}

export function getStockHoldByVendor(entityCode: string): StockHoldVendorSummary[] {
  const rows = getStockHoldReport(entityCode);
  const byVendor = new Map<string, StockHoldVendorSummary>();
  rows.forEach(r => {
    let s = byVendor.get(r.vendor_id);
    if (!s) {
      s = {
        vendor_id: r.vendor_id, vendor_name: r.vendor_name,
        total_lines: 0, oldest_age_days: 0,
        pending_inspection: 0, no_inspection: 0,
      };
      byVendor.set(r.vendor_id, s);
    }
    s.total_lines += 1;
    if (r.age_days > s.oldest_age_days) s.oldest_age_days = r.age_days;
    if (r.qa_status === 'pending' || r.qa_status === 'in_progress') s.pending_inspection += 1;
    if (r.qa_status === 'no_inspection') s.no_inspection += 1;
  });
  return Array.from(byVendor.values()).sort((a, b) => b.oldest_age_days - a.oldest_age_days);
}
