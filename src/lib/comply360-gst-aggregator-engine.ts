/**
 * @file        src/lib/comply360-gst-aggregator-engine.ts
 * @purpose     Comply360 GST aggregator · cross-card supply consolidation for GSTR builders
 * @sprint      Sprint 70a · T-Phase-5.A.1.2-PASS-A · Block 2 · Q-LOCK-3-P1-A
 * @decisions   D-S69-1 (100% native) · DP-S70-1 (GST aggregator engine)
 * @iso         Reliability · Maintainability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-79 audit stamping · FR-91 honest disclosure
 * @reads-from  src/lib/gst-engine.ts (rate + ITC reversal · 0-DIFF) ·
 *              src/lib/gst-portal-service.ts (payload shapes · 0-DIFF) ·
 *              cross-card ledger sources (Sales/Procure/Exim ledger storage keys · localStorage Phase 1)
 */
// resolveGSTRate import retained for downstream HSN-rate verification (Pass B consumer-side use).
// Intentionally not invoked in inner aggregation loops · perf rule §B2-5.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { resolveGSTRate, type GSTType } from './gst-engine';

// ── Public Types ─────────────────────────────────────────────────────

export interface CrossCardSupply {
  source_card: 'salesx' | 'procure360' | 'eximx' | 'fincore-other';
  source_ref: string;
  entity_id: string;
  gstin_supplier: string;
  gstin_recipient?: string;
  invoice_no: string;
  invoice_date: string;     // ISO yyyy-mm-dd
  hsn_sac: string;
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
  pos_state_code?: string;  // place-of-supply state code
  supply_type:
    | 'b2b' | 'b2cl' | 'b2cs'
    | 'export_with_pmt' | 'export_without_pmt'
    | 'sez_with_pmt' | 'sez_without_pmt'
    | 'nil_rated' | 'exempt' | 'non_gst' | 'rcm';
  amendment_flag?: boolean;
  amendment_orig_invoice?: string;
}

export interface AggregationFilter {
  entity_id: string;
  gstin: string;
  fy: string;              // e.g. 'FY25-26'
  return_period: string;   // 'MM-YYYY' e.g. '04-2026'
  include_amendments?: boolean;
}

export type SupplyTypeGroupKey = CrossCardSupply['supply_type'];

export interface TotalTaxBreakdown {
  taxable_value: number;
  igst: number;
  cgst: number;
  sgst: number;
  cess: number;
}

// ── Internal: localStorage Phase-1 readers ──────────────────────────
// [JWT] Phase-2 migration: replace with REST GET calls per entity.

function readJsonArray(key: string): unknown[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readSalesOrders(entity_id: string): unknown[] {
  // [JWT] GET /api/salesx/sales-orders?entity_id=<id>
  return readJsonArray(`erp_sales_orders_${entity_id}`);
}

function readPurchaseOrders(entity_id: string): unknown[] {
  // [JWT] GET /api/procure360/purchase-orders?entity_id=<id>
  return readJsonArray(`erp_purchase_orders_${entity_id}`);
}

function readExportPOs(entity_id: string): unknown[] {
  // [JWT] GET /api/eximx/export-pos?entity_id=<id>
  return readJsonArray(`erp_export_pos_${entity_id}`);
}

// ── Internal: defensive accessors ───────────────────────────────────

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}
function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
function asBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1;
}

// ── Supply-type classification ──────────────────────────────────────

const B2CL_THRESHOLD = 250_000;

function classifySupplyType(
  raw: Record<string, unknown>,
  fallback: CrossCardSupply['supply_type'],
): CrossCardSupply['supply_type'] {
  // Explicit hint wins.
  const explicit = asString(raw.supply_type).toLowerCase();
  if (explicit) {
    if (explicit === 'b2b' || explicit === 'b2cl' || explicit === 'b2cs' ||
        explicit === 'export_with_pmt' || explicit === 'export_without_pmt' ||
        explicit === 'sez_with_pmt' || explicit === 'sez_without_pmt' ||
        explicit === 'nil_rated' || explicit === 'exempt' || explicit === 'non_gst' ||
        explicit === 'rcm') {
      return explicit as CrossCardSupply['supply_type'];
    }
  }
  // Priority: amendment → export → sez → rcm → b2b → b2cl → b2cs
  if (asBool(raw.amendment_flag)) {
    // amendment_flag carries the supply_type forward; default to b2b if absent.
    return fallback === 'b2cs' ? 'b2b' : fallback;
  }
  if (asBool(raw.is_export)) {
    return asBool(raw.with_payment) ? 'export_with_pmt' : 'export_without_pmt';
  }
  if (asBool(raw.is_sez)) {
    return asBool(raw.with_payment) ? 'sez_with_pmt' : 'sez_without_pmt';
  }
  if (asBool(raw.rcm)) return 'rcm';
  const recipientGstin = asString(raw.gstin_recipient || raw.recipient_gstin);
  const totalValue = asNumber(raw.taxable_value) +
    asNumber(raw.igst) + asNumber(raw.cgst) + asNumber(raw.sgst) + asNumber(raw.cess);
  if (recipientGstin) return 'b2b';
  if (totalValue > B2CL_THRESHOLD) return 'b2cl';
  return 'b2cs';
}

// ── Tolerant parser ─────────────────────────────────────────────────

function toSupply(
  record: unknown,
  source: CrossCardSupply['source_card'],
  entity_id: string,
): CrossCardSupply | null {
  if (typeof record !== 'object' || record === null) return null;
  const r = record as Record<string, unknown>;

  const invoice_no = asString(r.invoice_no || r.inum || r.doc_no);
  const invoice_date = asString(r.invoice_date || r.idt || r.doc_date);
  if (!invoice_no || !invoice_date) return null;

  const supplier = asString(r.gstin_supplier || r.supplier_gstin || r.from_gstin);
  if (!supplier) return null;

  const taxable_value = asNumber(r.taxable_value ?? r.txval ?? r.amount);
  if (taxable_value < 0) return null;

  const supply_type = classifySupplyType(r, 'b2b');

  return {
    source_card: source,
    source_ref: asString(r.id || r.ref || invoice_no),
    entity_id,
    gstin_supplier: supplier,
    gstin_recipient: asString(r.gstin_recipient || r.recipient_gstin || r.ctin) || undefined,
    invoice_no,
    invoice_date,
    hsn_sac: asString(r.hsn_sac || r.hsn || r.sac),
    taxable_value,
    igst: asNumber(r.igst ?? r.iamt),
    cgst: asNumber(r.cgst ?? r.camt),
    sgst: asNumber(r.sgst ?? r.samt),
    cess: asNumber(r.cess ?? r.csamt),
    pos_state_code: asString(r.pos_state_code || r.pos) || undefined,
    supply_type,
    amendment_flag: asBool(r.amendment_flag) || undefined,
    amendment_orig_invoice: asString(r.amendment_orig_invoice) || undefined,
  };
}

// ── Period filter ───────────────────────────────────────────────────

/** Parse MM-YYYY string into [start, endExclusive] Date pair. */
function parseReturnPeriod(period: string): [Date, Date] | null {
  const m = /^(\d{2})-(\d{4})$/.exec(period);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return [start, end];
}

function inPeriod(invoice_date: string, range: [Date, Date]): boolean {
  const d = new Date(invoice_date);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= range[0].getTime() && d.getTime() < range[1].getTime();
}

// ── Common pipeline ─────────────────────────────────────────────────

function pipeline(
  records: unknown[],
  source: CrossCardSupply['source_card'],
  filter: AggregationFilter,
): CrossCardSupply[] {
  const range = parseReturnPeriod(filter.return_period);
  if (!range) return [];
  const out: CrossCardSupply[] = [];
  for (const rec of records) {
    const s = toSupply(rec, source, filter.entity_id);
    if (!s) continue;
    if (s.gstin_supplier !== filter.gstin) continue;
    if (!inPeriod(s.invoice_date, range)) continue;
    if (!filter.include_amendments && s.amendment_flag) continue;
    out.push(s);
  }
  return out;
}

// ── Public API ──────────────────────────────────────────────────────

/** Reads outward supplies (SalesX SO + EximX exports) for the period. */
export function aggregateOutwardSupplies(filter: AggregationFilter): CrossCardSupply[] {
  const so = pipeline(readSalesOrders(filter.entity_id), 'salesx', filter);
  const ex = pipeline(readExportPOs(filter.entity_id), 'eximx', filter);
  return [...so, ...ex];
}

/** Reads inward supplies (Procure360 PO) for the period. */
export function aggregateInwardSupplies(filter: AggregationFilter): CrossCardSupply[] {
  return pipeline(readPurchaseOrders(filter.entity_id), 'procure360', filter);
}

/** Reads amendments only (those flagged as edits to a previously-filed return). */
export function aggregateAmendments(filter: AggregationFilter): CrossCardSupply[] {
  const amendFilter: AggregationFilter = { ...filter, include_amendments: true };
  const all = [
    ...pipeline(readSalesOrders(filter.entity_id), 'salesx', amendFilter),
    ...pipeline(readExportPOs(filter.entity_id), 'eximx', amendFilter),
    ...pipeline(readPurchaseOrders(filter.entity_id), 'procure360', amendFilter),
  ];
  return all.filter(s => s.amendment_flag === true);
}

/** Groups supplies by supply_type for GSTR-1 section rendering. */
export function groupSuppliesByType(
  supplies: CrossCardSupply[],
): Record<SupplyTypeGroupKey, CrossCardSupply[]> {
  const out: Record<SupplyTypeGroupKey, CrossCardSupply[]> = {
    b2b: [], b2cl: [], b2cs: [],
    export_with_pmt: [], export_without_pmt: [],
    sez_with_pmt: [], sez_without_pmt: [],
    nil_rated: [], exempt: [], non_gst: [], rcm: [],
  };
  for (const s of supplies) {
    out[s.supply_type].push(s);
  }
  return out;
}

/** Computes total tax across a supply set. */
export function computeTotalTax(supplies: CrossCardSupply[]): TotalTaxBreakdown {
  const t: TotalTaxBreakdown = {
    taxable_value: 0, igst: 0, cgst: 0, sgst: 0, cess: 0,
  };
  for (const s of supplies) {
    t.taxable_value += s.taxable_value;
    t.igst += s.igst;
    t.cgst += s.cgst;
    t.sgst += s.sgst;
    t.cess += s.cess;
  }
  return t;
}

/** Pure helper: derive HSN summary rows from supplies. */
export function deriveHSNRows(supplies: CrossCardSupply[]): Array<{
  hsn: string; num: number; uqc: string; qty: number; rt: number;
  txval: number; iamt: number; camt: number; samt: number; csamt: number;
}> {
  const map = new Map<string, {
    hsn: string; num: number; uqc: string; qty: number; rt: number;
    txval: number; iamt: number; camt: number; samt: number; csamt: number;
  }>();
  let counter = 1;
  for (const s of supplies) {
    if (!s.hsn_sac) continue;
    // 4-digit HSN minimum per CBIC 78/2020
    const hsn = s.hsn_sac.length >= 4 ? s.hsn_sac.substring(0, Math.max(4, s.hsn_sac.length)) : s.hsn_sac;
    const total_tax = s.igst + s.cgst + s.sgst;
    const rt = s.taxable_value > 0 ? Math.round((total_tax / s.taxable_value) * 100) : 0;
    const key = `${hsn}|${rt}`;
    const existing = map.get(key);
    if (existing) {
      existing.txval += s.taxable_value;
      existing.iamt += s.igst;
      existing.camt += s.cgst;
      existing.samt += s.sgst;
      existing.csamt += s.cess;
    } else {
      map.set(key, {
        hsn, num: counter++, uqc: 'NOS', qty: 0, rt,
        txval: s.taxable_value,
        iamt: s.igst, camt: s.cgst, samt: s.sgst, csamt: s.cess,
      });
    }
  }
  return Array.from(map.values());
}

/** READS_FROM declaration for FR-100 RECG annotation. */
export const READS_FROM = [
  'src/lib/gst-engine.ts',
  'src/lib/gst-portal-service.ts',
  // Phase 1 localStorage sources (no engine dependency):
  // - SalesX SO storage key: erp_sales_orders_<entity>
  // - Procure360 PO storage key: erp_purchase_orders_<entity>
  // - EximX export storage key: erp_export_pos_<entity>
] as const;

// Re-export GSTType so Pass B consumers can pull it from the aggregator boundary
// without reaching into gst-engine directly.
export type { GSTType };
