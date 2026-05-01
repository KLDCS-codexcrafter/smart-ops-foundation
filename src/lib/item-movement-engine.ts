/**
 * item-movement-engine.ts — Aggregates GRN / MIN / CE / Cycle Count / RTV /
 * Sample / Demo events into a unified per-item timeline.
 * Sprint T-Phase-1.2.6
 *
 * D-216 echo: pure engine — never persisted. Recomputed on demand from source vouchers.
 *
 * [JWT] Replace localStorage reads with /api/inventory/movements?item_id=...
 */
import { dMul, round2 } from '@/lib/decimal-helpers';
import type { GRN } from '@/types/grn';
import type { CycleCount } from '@/types/cycle-count';
import type { RTV } from '@/types/rtv';

export type MovementType =
  | 'grn_inward'
  | 'min_outward'
  | 'consumption'
  | 'cycle_count_adjustment'
  | 'stock_transfer'
  | 'rtv'
  | 'sample_outward'
  | 'demo_outward';

export interface ItemMovementEvent {
  event_id: string;
  event_type: MovementType;
  event_date: string;
  source_voucher_id: string;
  source_voucher_no: string;
  qty_change: number;
  rate: number;
  value_change: number;
  from_godown_id: string | null;
  from_godown_name: string | null;
  to_godown_id: string | null;
  to_godown_name: string | null;
  bin_id: string | null;
  bin_code: string | null;
  party_name: string | null;
  narration: string | null;
}

export interface ItemMovementHistory {
  item_id: string;
  item_name: string;
  events: ItemMovementEvent[];
  opening_balance: number;
  closing_balance: number;
}

interface MinLite {
  id: string; min_no: string; status?: string; issued_at?: string | null;
  from_godown_id?: string | null; from_godown_name?: string | null;
  to_godown_id?: string | null; to_godown_name?: string | null;
  department_name?: string | null;
  lines: Array<{ item_id: string; item_name?: string; qty: number; rate?: number }>;
}
interface CeLite {
  id: string; ce_no?: string; status?: string; posted_at?: string | null;
  job_name?: string | null;
  lines: Array<{ item_id: string; item_name?: string; actual_qty: number; rate: number }>;
}
interface MemoLite {
  id: string; memo_no?: string;
  customer_name?: string | null; sent_at?: string | null; created_at?: string;
  godown_id?: string | null; godown_name?: string | null;
  lines: Array<{ item_id: string; item_name?: string; qty: number; rate?: number }>;
}

function read<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch (e) {
    // Sprint T-Phase-1.2.5h-b2 · Centralized error logging (M-2)
    logError('stock_balance', 'item-movement read failed', { key, source: 'item-movement-engine' }, e);
    return [];
  }
}

function inRange(iso: string | null | undefined, fromIso: string, toIso: string): boolean {
  if (!iso) return false;
  return iso >= fromIso && iso <= toIso;
}

export function getItemMovementHistory(
  itemId: string,
  entityCode: string,
  fromDate: string,
  toDate: string,
): ItemMovementHistory {
  const fromIso = `${fromDate}T00:00:00.000Z`;
  const toIso = `${toDate}T23:59:59.999Z`;

  const events: ItemMovementEvent[] = [];
  let itemName = '';

  // GRN inward
  const grns = read<GRN>(`erp_grns_${entityCode}`);
  for (const g of grns) {
    if (g.status === 'cancelled' || g.status === 'draft') continue;
    const dt = g.posted_at ?? `${g.receipt_date}T00:00:00.000Z`;
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of g.lines) {
      if (ln.item_id !== itemId) continue;
      itemName = itemName || ln.item_name;
      events.push({
        event_id: `${g.id}-${ln.id}`,
        event_type: 'grn_inward',
        event_date: dt,
        source_voucher_id: g.id,
        source_voucher_no: g.grn_no,
        qty_change: ln.accepted_qty,
        rate: ln.unit_rate,
        value_change: round2(dMul(ln.accepted_qty, ln.unit_rate)),
        from_godown_id: null, from_godown_name: g.vendor_name,
        to_godown_id: g.godown_id, to_godown_name: g.godown_name,
        bin_id: ln.bin_id, bin_code: null,
        party_name: g.vendor_name,
        narration: g.narration ?? null,
      });
    }
  }

  // MIN outward (movement between godowns)
  const mins = read<MinLite>(`erp_material_issue_notes_${entityCode}`);
  for (const m of mins) {
    if (m.status !== 'issued') continue;
    const dt = m.issued_at ?? '';
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of m.lines) {
      if (ln.item_id !== itemId || ln.qty <= 0) continue;
      itemName = itemName || ln.item_name || '';
      const rate = ln.rate ?? 0;
      events.push({
        event_id: `${m.id}-${ln.item_id}`,
        event_type: 'min_outward',
        event_date: dt,
        source_voucher_id: m.id,
        source_voucher_no: m.min_no,
        qty_change: -ln.qty,
        rate,
        value_change: round2(dMul(-ln.qty, rate)),
        from_godown_id: m.from_godown_id ?? null, from_godown_name: m.from_godown_name ?? null,
        to_godown_id: m.to_godown_id ?? null, to_godown_name: m.to_godown_name ?? null,
        bin_id: null, bin_code: null,
        party_name: m.department_name ?? null,
        narration: null,
      });
    }
  }

  // Consumption
  const ces = read<CeLite>(`erp_consumption_entries_${entityCode}`);
  for (const ce of ces) {
    if (ce.status !== 'posted') continue;
    const dt = ce.posted_at ?? '';
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of ce.lines) {
      if (ln.item_id !== itemId) continue;
      itemName = itemName || ln.item_name || '';
      events.push({
        event_id: `${ce.id}-${ln.item_id}`,
        event_type: 'consumption',
        event_date: dt,
        source_voucher_id: ce.id,
        source_voucher_no: ce.ce_no ?? ce.id,
        qty_change: -ln.actual_qty,
        rate: ln.rate,
        value_change: round2(dMul(-ln.actual_qty, ln.rate)),
        from_godown_id: null, from_godown_name: null,
        to_godown_id: null, to_godown_name: null,
        bin_id: null, bin_code: null,
        party_name: ce.job_name ?? null,
        narration: null,
      });
    }
  }

  // Cycle Count adjustments
  const ccs = read<CycleCount>(`erp_cycle_counts_${entityCode}`);
  for (const cc of ccs) {
    if (cc.status !== 'posted') continue;
    const dt = cc.posted_at ?? '';
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of cc.lines) {
      if (ln.item_id !== itemId || ln.variance_qty === 0) continue;
      itemName = itemName || ln.item_name;
      events.push({
        event_id: `${cc.id}-${ln.id}`,
        event_type: 'cycle_count_adjustment',
        event_date: dt,
        source_voucher_id: cc.id,
        source_voucher_no: cc.count_no,
        qty_change: ln.variance_qty,
        rate: ln.weighted_avg_rate,
        value_change: round2(dMul(ln.variance_qty, ln.weighted_avg_rate)),
        from_godown_id: null, from_godown_name: null,
        to_godown_id: ln.godown_id, to_godown_name: ln.godown_name,
        bin_id: ln.bin_id, bin_code: ln.bin_code,
        party_name: cc.counter_name,
        narration: ln.variance_notes,
      });
    }
  }

  // RTV outward
  const rtvs = read<RTV>(`erp_rtvs_${entityCode}`);
  for (const r of rtvs) {
    if (r.status === 'draft' || r.status === 'cancelled') continue;
    const dt = r.posted_at ?? `${r.rtv_date}T00:00:00.000Z`;
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of r.lines) {
      if (ln.item_id !== itemId) continue;
      itemName = itemName || ln.item_name;
      events.push({
        event_id: `${r.id}-${ln.id}`,
        event_type: 'rtv',
        event_date: dt,
        source_voucher_id: r.id,
        source_voucher_no: r.rtv_no,
        qty_change: -ln.rejected_qty,
        rate: ln.unit_rate,
        value_change: round2(dMul(-ln.rejected_qty, ln.unit_rate)),
        from_godown_id: ln.godown_id, from_godown_name: ln.godown_name,
        to_godown_id: null, to_godown_name: r.vendor_name,
        bin_id: ln.bin_id, bin_code: null,
        party_name: r.vendor_name,
        narration: ln.qc_failure_reason,
      });
    }
  }

  // Sample / Demo outward (best-effort — keys may be empty)
  const sams = read<MemoLite>(`erp_sample_outward_memos_${entityCode}`);
  for (const s of sams) {
    const dt = s.sent_at ?? s.created_at ?? '';
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of s.lines) {
      if (ln.item_id !== itemId) continue;
      itemName = itemName || ln.item_name || '';
      const rate = ln.rate ?? 0;
      events.push({
        event_id: `${s.id}-${ln.item_id}`,
        event_type: 'sample_outward',
        event_date: dt,
        source_voucher_id: s.id,
        source_voucher_no: s.memo_no ?? s.id,
        qty_change: -ln.qty,
        rate,
        value_change: round2(dMul(-ln.qty, rate)),
        from_godown_id: s.godown_id ?? null, from_godown_name: s.godown_name ?? null,
        to_godown_id: null, to_godown_name: s.customer_name ?? null,
        bin_id: null, bin_code: null,
        party_name: s.customer_name ?? null,
        narration: 'Sample outward',
      });
    }
  }
  const doms = read<MemoLite>(`erp_demo_outward_memos_${entityCode}`);
  for (const s of doms) {
    const dt = s.sent_at ?? s.created_at ?? '';
    if (!inRange(dt, fromIso, toIso)) continue;
    for (const ln of s.lines) {
      if (ln.item_id !== itemId) continue;
      itemName = itemName || ln.item_name || '';
      const rate = ln.rate ?? 0;
      events.push({
        event_id: `${s.id}-${ln.item_id}-d`,
        event_type: 'demo_outward',
        event_date: dt,
        source_voucher_id: s.id,
        source_voucher_no: s.memo_no ?? s.id,
        qty_change: -ln.qty,
        rate,
        value_change: round2(dMul(-ln.qty, rate)),
        from_godown_id: s.godown_id ?? null, from_godown_name: s.godown_name ?? null,
        to_godown_id: null, to_godown_name: s.customer_name ?? null,
        bin_id: null, bin_code: null,
        party_name: s.customer_name ?? null,
        narration: 'Demo outward',
      });
    }
  }

  events.sort((a, b) => (b.event_date > a.event_date ? 1 : -1));

  // Closing balance = sum of qty_change in window (does not include true opening)
  const closing = events.reduce((s, e) => s + e.qty_change, 0);

  return {
    item_id: itemId,
    item_name: itemName,
    events,
    opening_balance: 0,
    closing_balance: closing,
  };
}
