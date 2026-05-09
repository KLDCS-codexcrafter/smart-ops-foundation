/**
 * @file src/lib/production-rework-listener.ts
 * @purpose Sibling listener that observes `qa.outcome.applied` (rework outcomes)
 *          and stamps the originating NCR id into a pending-context ledger so
 *          Production-side rework JobCard creation can pre-fill source_ncr_id.
 * @who Production controller · QA Manager (consumed via Production engine pre-fill helper)
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.d-1-Trident-Reports-Reprocess-Bridge
 * @iso ISO 9001:2015 Clause 8.7 (control of nonconforming output)
 * @whom Audit Owner
 * @decisions D-NEW-CF (NCR↔Rework traceability) · D-NEW-BV (entity_code required)
 * @disciplines FR-19 (sibling · zero Production engine touch) · FR-30 · FR-50
 * @reuses qulicheak-bridges.QaOutcomePayload channel
 * @[JWT] localStorage key: erp_pending_rework_ncrs_${entityCode}
 */
import type { QaOutcomePayload } from '@/lib/qulicheak-bridges';

const CH = 'qa.outcome.applied';
const KEY = (e: string): string => `erp_pending_rework_ncrs_${e}`;
const MAX = 50;

export interface PendingReworkNcrEntry {
  ncr_id: string;
  entity_code: string;
  vendor_id: string;
  recorded_at: string;
}

function readAll(entityCode: string): PendingReworkNcrEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY(entityCode));
    return raw ? (JSON.parse(raw) as PendingReworkNcrEntry[]) : [];
  } catch { return []; }
}

function writeAll(entityCode: string, list: PendingReworkNcrEntry[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(KEY(entityCode), JSON.stringify(list.slice(0, MAX))); }
  catch { /* silent · quota */ }
}

export function mountProductionReworkListener(): () => void {
  if (typeof window === 'undefined') return () => { /* noop */ };
  const handler = (e: Event): void => {
    const p = (e as CustomEvent<QaOutcomePayload>).detail;
    if (!p?.entity_code) return;            // D-NEW-BV
    if (p.outcome !== 'rework') return;
    const entry: PendingReworkNcrEntry = {
      ncr_id: p.ncr_id,
      entity_code: p.entity_code,
      vendor_id: p.vendor_id ?? '',
      recorded_at: new Date().toISOString(),
    };
    const list = readAll(p.entity_code);
    list.unshift(entry);
    writeAll(p.entity_code, list);
  };
  window.addEventListener(CH, handler as EventListener);
  return () => window.removeEventListener(CH, handler as EventListener);
}

/** Lookup helper for Production engine to pre-fill source_ncr_id when creating rework JC. */
export function getPendingNcrIdForReworkContext(
  entityCode: string,
  _itemId?: string | null,
  vendorId?: string | null,
): string | null {
  const list = readAll(entityCode);
  if (vendorId) {
    const m = list.find((e) => e.vendor_id === vendorId);
    if (m) return m.ncr_id;
  }
  return list[0]?.ncr_id ?? null;
}

export function listPendingReworkNcrs(entityCode: string): PendingReworkNcrEntry[] {
  return readAll(entityCode);
}
