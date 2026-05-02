/**
 * smart-defaults-engine.ts — Sprint T-Phase-2.7-d-1 · OOB-1 extensions.
 *
 * Pure query functions that read existing localStorage voucher records and
 * return frequency-based suggestions. No I/O side effects. Returns null on miss.
 *
 * Field-name tolerant: each voucher form may use slightly different names for
 * ledger / godown / warehouse · we probe a small set of common keys.
 *
 * [JWT] Phase 2: replace with backend materialized views.
 */

type StoredRecord = Record<string, unknown>;

const VOUCHER_STORAGE_KEYS: Record<string, string[]> = {
  // Multiple keys may map to a single semantic voucher type (e.g. GRN aliases)
  GRN: ['erp_grns_'],
  Quotation: ['erp_quotations_'],
  IM: ['erp_invoice_memos_'],
  MIN: ['erp_material_issue_notes_', 'erp_min_'],
  Payment: ['erp_payments_'],
};

function readVouchers(voucherType: string, entityCode: string): StoredRecord[] {
  const prefixes = VOUCHER_STORAGE_KEYS[voucherType] ?? [];
  const out: StoredRecord[] = [];
  for (const prefix of prefixes) {
    try {
      // [JWT] GET /api/vouchers?type=:voucherType&entity=:entityCode
      const raw = localStorage.getItem(`${prefix}${entityCode}`);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const r of parsed) {
          if (r && typeof r === 'object') out.push(r as StoredRecord);
        }
      }
    } catch {
      /* silent · ignore corrupt records */
    }
  }
  return out;
}

function pickStr(rec: StoredRecord, keys: string[]): string | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return null;
}

function pickNum(rec: StoredRecord, keys: string[]): number | null {
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() && !Number.isNaN(Number(v))) return Number(v);
  }
  return null;
}

function classifyConfidence(occurrences: number): 'high' | 'med' | 'low' {
  if (occurrences > 5) return 'high';
  if (occurrences >= 2) return 'med';
  return 'low';
}

// ── 1. resolveSmartLedger ───────────────────────────────────────────

export interface SmartLedgerSuggestion {
  ledger_id: string;
  ledger_name: string;
  confidence: 'high' | 'med' | 'low';
  occurrence_count: number;
}

const LEDGER_ID_KEYS = ['ledger_id', 'sales_ledger_id', 'purchase_ledger_id', 'bank_ledger_id'];
const LEDGER_NAME_KEYS = ['ledger_name', 'sales_ledger_name', 'purchase_ledger_name', 'bank_ledger_name', 'ledger'];

export function resolveSmartLedger(
  voucherType: string,
  entityCode: string,
): SmartLedgerSuggestion | null {
  if (!entityCode) return null;
  const records = readVouchers(voucherType, entityCode).slice(-20);
  if (records.length === 0) return null;

  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const r of records) {
    const id = pickStr(r, LEDGER_ID_KEYS);
    const name = pickStr(r, LEDGER_NAME_KEYS);
    const composite = id ?? name;
    if (!composite) continue;
    const existing = counts.get(composite);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(composite, { id: id ?? '', name: name ?? composite, count: 1 });
    }
  }
  if (counts.size === 0) return null;

  let top: { id: string; name: string; count: number } | null = null;
  for (const v of counts.values()) {
    if (!top || v.count > top.count) top = v;
  }
  if (!top) return null;

  return {
    ledger_id: top.id,
    ledger_name: top.name,
    confidence: classifyConfidence(top.count),
    occurrence_count: top.count,
  };
}

// ── 2. resolveSmartWarehouse ────────────────────────────────────────

export interface SmartWarehouseSuggestion {
  godown_id: string;
  godown_name: string;
  confidence: 'high' | 'med' | 'low';
}

const GODOWN_ID_KEYS = ['godown_id', 'warehouse_id', 'from_godown_id', 'to_godown_id'];
const GODOWN_NAME_KEYS = ['godown_name', 'warehouse_name', 'from_godown_name', 'to_godown_name', 'godown', 'warehouse'];
const CREATED_BY_KEYS = ['created_by', 'created_by_user_id', 'createdBy', 'user_id'];

export function resolveSmartWarehouse(
  voucherType: string,
  userId: string,
  entityCode: string,
): SmartWarehouseSuggestion | null {
  if (!entityCode) return null;
  const records = readVouchers(voucherType, entityCode).slice(-20);
  if (records.length === 0) return null;

  // Prefer records by this user; if none, fall back to all
  let scoped = userId
    ? records.filter(r => {
        const u = pickStr(r, CREATED_BY_KEYS);
        return u === userId;
      })
    : records;
  if (scoped.length === 0) scoped = records;

  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const r of scoped) {
    const id = pickStr(r, GODOWN_ID_KEYS);
    const name = pickStr(r, GODOWN_NAME_KEYS);
    const composite = id ?? name;
    if (!composite) continue;
    const existing = counts.get(composite);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(composite, { id: id ?? '', name: name ?? composite, count: 1 });
    }
  }
  if (counts.size === 0) return null;

  let top: { id: string; name: string; count: number } | null = null;
  for (const v of counts.values()) {
    if (!top || v.count > top.count) top = v;
  }
  if (!top) return null;

  return {
    godown_id: top.id,
    godown_name: top.name,
    confidence: classifyConfidence(top.count),
  };
}

// ── 3. resolvePartyHistoricalRate ───────────────────────────────────

export interface PartyHistoricalRate {
  item_name: string;
  last_rate: number;
  last_voucher_no: string;
  last_voucher_date: string;
  occurrence_count: number;
}

interface LineItemShape {
  item_name?: unknown;
  itemName?: unknown;
  rate?: unknown;
  unit_rate?: unknown;
  price?: unknown;
}

const PARTY_ID_KEYS = ['customer_id', 'vendor_id', 'distributor_id', 'party_id'];
const VOUCHER_NO_KEYS = ['voucher_no', 'invoice_no', 'quotation_no', 'memo_no', 'no'];
const VOUCHER_DATE_KEYS = ['voucher_date', 'date', 'invoice_date', 'memo_date'];

export function resolvePartyHistoricalRate(
  itemName: string,
  partyId: string,
  entityCode: string,
): PartyHistoricalRate | null {
  if (!itemName || !partyId || !entityCode) return null;
  // Search Quotation + IM history (sales rate context)
  const records = [
    ...readVouchers('Quotation', entityCode),
    ...readVouchers('IM', entityCode),
  ];
  if (records.length === 0) return null;

  let lastRate: number | null = null;
  let lastVoucherNo = '';
  let lastVoucherDate = '';
  let occurrenceCount = 0;

  for (const r of records) {
    const pid = pickStr(r, PARTY_ID_KEYS);
    if (pid !== partyId) continue;
    const items = (r.items ?? r.lineItems) as LineItemShape[] | undefined;
    if (!Array.isArray(items)) continue;
    for (const li of items) {
      const nameRaw = (li.item_name ?? li.itemName) as unknown;
      const name = typeof nameRaw === 'string' ? nameRaw : '';
      if (name !== itemName) continue;
      const rateRaw = li.rate ?? li.unit_rate ?? li.price;
      const rate = typeof rateRaw === 'number'
        ? rateRaw
        : typeof rateRaw === 'string' && rateRaw.trim() && !Number.isNaN(Number(rateRaw))
          ? Number(rateRaw)
          : null;
      if (rate === null || !Number.isFinite(rate)) continue;
      occurrenceCount += 1;
      const vDate = pickStr(r, VOUCHER_DATE_KEYS) ?? '';
      if (!lastVoucherDate || vDate > lastVoucherDate) {
        lastRate = rate;
        lastVoucherNo = pickStr(r, VOUCHER_NO_KEYS) ?? '';
        lastVoucherDate = vDate;
      } else if (lastRate === null) {
        lastRate = rate;
        lastVoucherNo = pickStr(r, VOUCHER_NO_KEYS) ?? '';
        lastVoucherDate = vDate;
      }
    }
  }

  if (lastRate === null || occurrenceCount === 0) return null;
  return {
    item_name: itemName,
    last_rate: lastRate,
    last_voucher_no: lastVoucherNo,
    last_voucher_date: lastVoucherDate,
    occurrence_count: occurrenceCount,
  };
}

// Reference pickNum so any future caller can use it (kept exported-private style).
// This avoids needing eslint-disable for an unused export.
export const _internals = { pickNum };
