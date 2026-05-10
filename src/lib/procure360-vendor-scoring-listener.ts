/**
 * @file src/lib/procure360-vendor-scoring-listener.ts
 * @purpose Sibling listener · subscribes to `qa.outcome.applied` and writes a
 *          Procure360-scoped vendor QA inbox ledger that vendor-scoring engines
 *          can later consume. Zero touches to Procure360 engines (FR-19 sibling).
 * @who Vendor Manager · QA Manager (consumes vendor scoring delta)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge
 * @iso ISO 9001:2015 supplier evaluation · ISO 25010 Maintainability
 * @whom Audit Owner
 * @decisions D-NEW-AJ-revised CLOSED · D-NEW-BV (entity_code+vendor_id required)
 * @disciplines FR-19 · FR-30 · FR-50
 * @reuses qualicheck-bridges QaOutcomePayload channel
 * @[JWT] localStorage key: erp_procure360_vendor_qa_inbox_${entityCode}
 */
import type { QaOutcomePayload } from '@/lib/qualicheck-bridges';

const CH = 'qa.outcome.applied';
const KEY = (e: string): string => `erp_procure360_vendor_qa_inbox_${e}`;
const MAX = 500;

export interface Procure360VendorQaInboxEntry {
  vendor_id: string;
  ncr_id: string;
  severity: QaOutcomePayload['severity'];
  outcome: QaOutcomePayload['outcome'];
  delta: number;
  applied_at: string;
  entity_code: string;
}

function readAll(entityCode: string): Procure360VendorQaInboxEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY(entityCode));
    return raw ? (JSON.parse(raw) as Procure360VendorQaInboxEntry[]) : [];
  } catch { return []; }
}

function writeAll(entityCode: string, list: Procure360VendorQaInboxEntry[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY(entityCode), JSON.stringify(list.slice(0, MAX))); }
  catch { /* silent */ }
}

export function mountProcure360VendorScoringListener(): () => void {
  if (typeof window === 'undefined') return () => { /* noop */ };
  const handler = (e: Event): void => {
    const p = (e as CustomEvent<QaOutcomePayload>).detail;
    if (!p?.entity_code || !p.vendor_id) return; // D-NEW-BV
    const entry: Procure360VendorQaInboxEntry = {
      vendor_id: p.vendor_id,
      ncr_id: p.ncr_id,
      severity: p.severity,
      outcome: p.outcome,
      delta: p.quality_score_delta,
      applied_at: new Date().toISOString(),
      entity_code: p.entity_code,
    };
    const list = readAll(p.entity_code);
    list.unshift(entry);
    writeAll(p.entity_code, list);
  };
  window.addEventListener(CH, handler as EventListener);
  return () => window.removeEventListener(CH, handler as EventListener);
}

export function readVendorQaInbox(
  entityCode: string,
  vendorId?: string,
): Procure360VendorQaInboxEntry[] {
  const list = readAll(entityCode);
  return vendorId ? list.filter((e) => e.vendor_id === vendorId) : list;
}
