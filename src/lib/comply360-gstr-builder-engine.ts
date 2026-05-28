/**
 * @file        src/lib/comply360-gstr-builder-engine.ts
 * @purpose     Comply360 GSTR builder · produces GSTN-portal-shaped JSON for GSTR-1 / 1A / 2B
 * @sprint      Sprint 70a · T-Phase-5.A.1.2-PASS-A · Block 3 · Q-LOCK-3-P1-B
 * @decisions   D-S69-1 (100% native) · DP-S70-2 (GSTR builder engine)
 * @iso         Reliability · Auditability · Maintainability
 * @disciplines FR-19 SIBLING · FR-43 unit tests · FR-91 honest disclosure · Lesson 23 cross-prompt contract
 * @reads-from  src/lib/gst-portal-service.ts (payload shapes · 0-DIFF) ·
 *              src/lib/comply360-gst-aggregator-engine.ts (Block 2 sibling · same Pass A)
 * @lesson-23   Test author (Block 5) MUST grep this file's actual export signatures before
 *              asserting return types · don't assume from spec alone.
 */
import type {
  GSTR1Payload,
  GSTR1B2BGroup,
  GSTR1Invoice,
  GSTR1B2CLGroup,
  GSTR1B2CLEntry,
  GSTR1B2CSRow,
  GSTR1ExpEntry,
  GSTR1HSNRow,
  GSTR1DocIssue,
  GSTR3BPayload,
  GSTR3BSupDetails,
  GSTR3BITCElg,
  GSTR3BIntrDtls,
  GSTR3BNilSup,
  GSTRTaxAmounts,
} from './gst-portal-service';

import {
  type CrossCardSupply,
  groupSuppliesByType,
  computeTotalTax,
  deriveHSNRows,
  type TotalTaxBreakdown,
} from './comply360-gst-aggregator-engine';

// ── Public Types ─────────────────────────────────────────────────────

export type GSTRBuilderType = 'gstr-1' | 'gstr-1a' | 'gstr-2b' | 'gstr-3b';

export interface BuilderWarning {
  code: string;
  message: string;
  invoice_refs: string[];
}

export interface BuilderError {
  code: string;
  message: string;
  invoice_refs: string[];
}

export interface GSTRBuilderResult {
  builder: GSTRBuilderType;
  payload: GSTR1Payload | Record<string, unknown>;
  valid: boolean;
  warnings: BuilderWarning[];
  errors: BuilderError[];
  totals: TotalTaxBreakdown;
}

export interface BuildMeta {
  gstin: string;
  return_period: string;     // 'MM-YYYY'
  gross_turnover?: number;
}

export interface BuildAmendmentMeta extends BuildMeta {
  orig_return_period: string;
}

export interface IMSActionInput {
  source_invoice_ref: string;
  status: 'pending' | 'accepted' | 'rejected' | 'kept_pending';
}

// ── Internal: validation primitives ─────────────────────────────────

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function isValidGSTIN(gstin: string | undefined): boolean {
  return typeof gstin === 'string' && GSTIN_REGEX.test(gstin);
}

function toGSTNDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

function parseReturnPeriod(period: string): [Date, Date] | null {
  const m = /^(\d{2})-(\d{4})$/.exec(period);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const year = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return [new Date(Date.UTC(year, month - 1, 1)), new Date(Date.UTC(year, month, 1))];
}

function inPeriod(iso: string, range: [Date, Date]): boolean {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getTime() >= range[0].getTime() && d.getTime() < range[1].getTime();
}

function pushWarn(arr: BuilderWarning[], code: string, message: string, refs: string[]): void {
  arr.push({ code, message, invoice_refs: refs });
}
function pushErr(arr: BuilderError[], code: string, message: string, refs: string[]): void {
  arr.push({ code, message, invoice_refs: refs });
}

function totalInvoiceValue(s: CrossCardSupply): number {
  return s.taxable_value + s.igst + s.cgst + s.sgst + s.cess;
}

// ── B2B builder ─────────────────────────────────────────────────────

function buildB2BSection(
  supplies: CrossCardSupply[],
  warnings: BuilderWarning[],
  errors: BuilderError[],
): GSTR1B2BGroup[] {
  const groups = new Map<string, GSTR1B2BGroup>();
  for (const s of supplies) {
    const ctin = s.gstin_recipient;
    if (!ctin) {
      pushErr(errors, 'GSTIN_MISSING', `B2B invoice ${s.invoice_no} missing recipient GSTIN`, [s.invoice_no]);
      continue;
    }
    if (!isValidGSTIN(ctin)) {
      pushErr(errors, 'GSTIN_INVALID', `Recipient GSTIN ${ctin} fails format check`, [s.invoice_no]);
      continue;
    }
    const recipientState = ctin.substring(0, 2);
    if (s.pos_state_code && s.pos_state_code !== recipientState) {
      pushWarn(warnings, 'POS_MISMATCH',
        `POS ${s.pos_state_code} differs from recipient state ${recipientState}`, [s.invoice_no]);
    }
    if (!s.hsn_sac) {
      pushWarn(warnings, 'HSN_MISSING', `B2B invoice ${s.invoice_no} has no HSN`, [s.invoice_no]);
    }
    const inv: GSTR1Invoice = {
      inum: s.invoice_no,
      idt: toGSTNDate(s.invoice_date),
      val: totalInvoiceValue(s),
      pos: s.pos_state_code || recipientState,
      rchrg: s.supply_type === 'rcm' ? 'Y' : 'N',
      itms: [{
        num: 1,
        itm_det: {
          txval: s.taxable_value,
          idt: toGSTNDate(s.invoice_date),
          igst: s.igst,
          cgst: s.cgst,
          sgst: s.sgst,
          cess: s.cess,
        },
      }],
    };
    const existing = groups.get(ctin);
    if (existing) existing.inv.push(inv);
    else groups.set(ctin, { ctin, inv: [inv] });
  }
  return Array.from(groups.values());
}

// ── B2CL builder ────────────────────────────────────────────────────

function buildB2CLSection(supplies: CrossCardSupply[]): GSTR1B2CLGroup[] {
  const groups = new Map<string, GSTR1B2CLEntry[]>();
  for (const s of supplies) {
    const pos = s.pos_state_code || '99';
    const entry: GSTR1B2CLEntry = {
      inum: s.invoice_no,
      idt: toGSTNDate(s.invoice_date),
      val: totalInvoiceValue(s),
      itms: [{
        num: 1,
        itm_det: { txval: s.taxable_value, igst: s.igst, cess: s.cess },
      }],
    };
    const list = groups.get(pos) ?? [];
    list.push(entry);
    groups.set(pos, list);
  }
  return Array.from(groups.entries()).map(([pos, inv]) => ({ pos, inv }));
}

// ── B2CS builder ────────────────────────────────────────────────────

function buildB2CSSection(
  supplies: CrossCardSupply[],
  warnings: BuilderWarning[],
): GSTR1B2CSRow[] {
  // group by pos + rate
  const map = new Map<string, GSTR1B2CSRow>();
  const ratesByPos = new Map<string, Set<number>>();
  for (const s of supplies) {
    const pos = s.pos_state_code || '99';
    const total_tax = s.igst + s.cgst + s.sgst;
    const rt = s.taxable_value > 0 ? Math.round((total_tax / s.taxable_value) * 100) : 0;
    const inter = s.igst > 0;
    const key = `${pos}|${rt}|${inter ? 'I' : 'A'}`;
    const existing = map.get(key);
    if (existing) {
      existing.txval += s.taxable_value;
      existing.iamt += s.igst;
      existing.camt += s.cgst;
      existing.samt += s.sgst;
      existing.csamt += s.cess;
    } else {
      map.set(key, {
        sply_ty: inter ? 'INTER' : 'INTRA',
        pos, rt,
        txval: s.taxable_value,
        iamt: s.igst, camt: s.cgst, samt: s.sgst, csamt: s.cess,
      });
    }
    const set = ratesByPos.get(pos) ?? new Set<number>();
    set.add(rt);
    ratesByPos.set(pos, set);
  }
  for (const [pos, set] of ratesByPos.entries()) {
    if (set.size > 1) {
      pushWarn(warnings, 'B2CS_RATE_HETEROGENEOUS',
        `B2CS group for POS ${pos} spans ${set.size} rates`, []);
    }
  }
  return Array.from(map.values());
}

// ── Exports builder ─────────────────────────────────────────────────

function buildExportSection(
  supplies: CrossCardSupply[],
  warnings: BuilderWarning[],
): GSTR1ExpEntry[] {
  const out: GSTR1ExpEntry[] = [];
  for (const s of supplies) {
    if (s.supply_type === 'export_without_pmt' && !s.amendment_orig_invoice) {
      // LUT reference proxy: amendment_orig_invoice often carries LUT ref · absent → warn
      pushWarn(warnings, 'EXPORT_WITHOUT_LUT',
        `Export ${s.invoice_no} without payment has no LUT reference`, [s.invoice_no]);
    }
    out.push({
      inum: s.invoice_no,
      idt: toGSTNDate(s.invoice_date),
      val: totalInvoiceValue(s),
      sbpcode: '', sbnum: '', sbdt: '',
      txval: s.taxable_value,
      igst: s.igst,
      cess: s.cess,
    });
  }
  return out;
}

// ── Pre-flight validation across supplies ────────────────────────────

function preflightSupplies(
  supplies: CrossCardSupply[],
  meta: BuildMeta,
  _warnings: BuilderWarning[],
  errors: BuilderError[],
): void {
  if (!isValidGSTIN(meta.gstin)) {
    pushErr(errors, 'GSTIN_INVALID', `Filer GSTIN ${meta.gstin} fails format check`, []);
  }
  const range = parseReturnPeriod(meta.return_period);
  for (const s of supplies) {
    if (s.taxable_value < 0) {
      pushErr(errors, 'AMOUNT_NEGATIVE',
        `Invoice ${s.invoice_no} taxable_value is negative`, [s.invoice_no]);
    }
    if (range && !inPeriod(s.invoice_date, range)) {
      pushErr(errors, 'DATE_OUT_OF_PERIOD',
        `Invoice ${s.invoice_no} date ${s.invoice_date} outside ${meta.return_period}`, [s.invoice_no]);
    }
  }
}

// ── Public: GSTR-1 ──────────────────────────────────────────────────

export function buildGSTR1(
  supplies: CrossCardSupply[],
  meta: BuildMeta,
): GSTRBuilderResult {
  const warnings: BuilderWarning[] = [];
  const errors: BuilderError[] = [];
  preflightSupplies(supplies, meta, warnings, errors);

  const grouped = groupSuppliesByType(supplies);
  const b2b = buildB2BSection(grouped.b2b, warnings, errors);
  const b2cl = buildB2CLSection(grouped.b2cl);
  const b2cs = buildB2CSSection(grouped.b2cs, warnings);
  const exp = buildExportSection(
    [...grouped.export_with_pmt, ...grouped.export_without_pmt],
    warnings,
  );
  const hsnRows = computeHSNSummary(supplies);
  const docIssue = computeDocIssueSection(supplies);
  const totals = computeTotalTax(supplies);

  const payload: GSTR1Payload = {
    gstin: meta.gstin,
    fp: meta.return_period,
    gt: meta.gross_turnover,
    cur_gt: totals.taxable_value,
    b2b,
    b2cl,
    b2cs,
    exp,
    cdnr: [],     // Pass A: CDNR deferred to Sprint 71
    cdnur: [],
    hsn: { data: hsnRows },
    doc_issue: docIssue,
  };

  return {
    builder: 'gstr-1',
    payload,
    valid: errors.length === 0,
    warnings,
    errors,
    totals,
  };
}

// ── Public: GSTR-1A (amendments) ─────────────────────────────────────

export function buildGSTR1A(
  supplies: CrossCardSupply[],
  meta: BuildAmendmentMeta,
): GSTRBuilderResult {
  const amendments = supplies.filter(s => s.amendment_flag === true);
  const baseResult = buildGSTR1(amendments, meta);
  // Mark builder type + add amendment meta
  const payload = baseResult.payload as GSTR1Payload;
  const amendmentPayload: Record<string, unknown> = {
    ...payload,
    orig_fp: meta.orig_return_period,
    amendment_count: amendments.length,
  };
  return {
    builder: 'gstr-1a',
    payload: amendmentPayload,
    valid: baseResult.valid,
    warnings: baseResult.warnings,
    errors: baseResult.errors,
    totals: baseResult.totals,
  };
}

// ── Public: GSTR-2B (reconciliation) ─────────────────────────────────

export function buildGSTR2B(
  supplies: CrossCardSupply[],
  imsActions: IMSActionInput[],
  meta: BuildMeta,
): GSTRBuilderResult {
  const warnings: BuilderWarning[] = [];
  const errors: BuilderError[] = [];
  if (!isValidGSTIN(meta.gstin)) {
    pushErr(errors, 'GSTIN_INVALID', `Filer GSTIN ${meta.gstin} fails format check`, []);
  }

  const actionMap = new Map<string, IMSActionInput['status']>();
  for (const a of imsActions) actionMap.set(a.source_invoice_ref, a.status);

  const buckets: Record<'itc_eligible' | 'itc_ineligible' | 'itc_reversed' | 'vendor_pending', CrossCardSupply[]> = {
    itc_eligible: [],
    itc_ineligible: [],
    itc_reversed: [],
    vendor_pending: [],
  };
  for (const s of supplies) {
    const status = actionMap.get(s.source_ref) ?? 'pending';
    if (status === 'accepted') buckets.itc_eligible.push(s);
    else if (status === 'rejected') buckets.itc_ineligible.push(s);
    else if (status === 'kept_pending') buckets.vendor_pending.push(s);
    else buckets.itc_eligible.push(s); // pending defaults to eligible until acted on
  }

  const totals = computeTotalTax(supplies);

  const summarise = (arr: CrossCardSupply[]): TotalTaxBreakdown => computeTotalTax(arr);

  const payload: Record<string, unknown> = {
    entity_gstin: meta.gstin,
    return_period: meta.return_period,
    summary: {
      itc_eligible: summarise(buckets.itc_eligible),
      itc_ineligible: summarise(buckets.itc_ineligible),
      itc_reversed: summarise(buckets.itc_reversed),
      vendor_pending: summarise(buckets.vendor_pending),
      total: totals,
    },
    b2b_details: supplies.map(s => ({
      supplier_gstin: s.gstin_supplier,
      invoice_no: s.invoice_no,
      invoice_date: s.invoice_date,
      taxable_value: s.taxable_value,
      igst: s.igst, cgst: s.cgst, sgst: s.sgst, cess: s.cess,
      ims_status: actionMap.get(s.source_ref) ?? 'pending',
    })),
  };

  return {
    builder: 'gstr-2b',
    payload,
    valid: errors.length === 0,
    warnings,
    errors,
    totals,
  };
}

// ── Public: GSTR-3B (summary return) ─────────────────────────────────

/**
 * Build GSTR-3B summary payload from outward + inward aggregations.
 * @sprint-extended Sprint 71 · T-Phase-5.A.1.3 · buildGSTR3B (DP-S71-1 Option A · engine extended in place)
 */
export function buildGSTR3B(
  outward: CrossCardSupply[],
  inward: CrossCardSupply[],
  meta: BuildMeta,
): GSTRBuilderResult {
  const warnings: BuilderWarning[] = [];
  const errors: BuilderError[] = [];

  if (!isValidGSTIN(meta.gstin)) {
    pushErr(errors, 'GSTIN_INVALID', `Filer GSTIN ${meta.gstin} fails format check`, []);
  }
  if (!/^\d{2}-\d{4}$/.test(meta.return_period)) {
    pushErr(errors, 'DATE_OUT_OF_PERIOD', `Return period ${meta.return_period} not MM-YYYY`, []);
  }
  const range = parseReturnPeriod(meta.return_period);
  const all = [...outward, ...inward];
  for (const s of all) {
    if (s.taxable_value < 0) {
      pushErr(errors, 'AMOUNT_NEGATIVE', `Invoice ${s.invoice_no} taxable_value negative`, [s.invoice_no]);
    }
    if (range && !inPeriod(s.invoice_date, range)) {
      pushErr(errors, 'DATE_OUT_OF_PERIOD',
        `Invoice ${s.invoice_no} date ${s.invoice_date} outside ${meta.return_period}`, [s.invoice_no]);
    }
  }

  const outwardGrouped = groupSuppliesByType(outward);
  const inwardGrouped = groupSuppliesByType(inward);

  const sumTax = (rows: CrossCardSupply[]): GSTRTaxAmounts => {
    const t = computeTotalTax(rows);
    return { txval: t.taxable_value, iamt: t.igst, camt: t.cgst, samt: t.sgst, csamt: t.cess };
  };

  // 3.1 sup_details
  const taxableOutward = [
    ...outwardGrouped.b2b, ...outwardGrouped.b2cl, ...outwardGrouped.b2cs,
  ];
  const zeroRated = [
    ...outwardGrouped.export_with_pmt, ...outwardGrouped.export_without_pmt,
    ...outwardGrouped.sez_with_pmt, ...outwardGrouped.sez_without_pmt,
  ];
  const nilExempt = [
    ...outwardGrouped.nil_rated, ...outwardGrouped.exempt, ...outwardGrouped.non_gst,
  ];
  const rcmInward = inwardGrouped.rcm;

  const sup_details: GSTR3BSupDetails = {
    osup_det: sumTax(taxableOutward),
    osup_zero: sumTax(zeroRated),
    osup_nil_exmp: sumTax(nilExempt),
    isup_rev: sumTax(rcmInward),
  };

  // 4 itc_elg
  const inwardAll = inward;
  const inwardTax = computeTotalTax(inwardAll);
  const itc_elg: GSTR3BITCElg = {
    itc_avl: [{
      ty: 'OTH',
      iamt: inwardTax.igst, camt: inwardTax.cgst, samt: inwardTax.sgst, csamt: inwardTax.cess,
    }],
    itc_rev: [],
    itc_net: {
      iamt: inwardTax.igst, camt: inwardTax.cgst, samt: inwardTax.sgst, csamt: inwardTax.cess,
    },
  };

  // 5 nil_sup
  const nilTotals = sumTax(nilExempt);
  const nil_sup: GSTR3BNilSup = {
    nil: {
      sply_ty: 'INTRA',
      nil_amt: nilTotals.txval,
      expt_amt: 0,
      ngsup_amt: 0,
    },
  };

  // 5.1 intr_dtls (Phase-1 zeros)
  const intr_dtls: GSTR3BIntrDtls = {
    intr_ltfee: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
  };

  const payload: GSTR3BPayload = {
    gstin: meta.gstin,
    ret_period: meta.return_period,
    sup_details,
    inward_sup: { isup_details: [] },
    itc_elg,
    intr_dtls,
    nil_sup,
  };

  return {
    builder: 'gstr-3b',
    payload,
    valid: errors.length === 0,
    warnings,
    errors,
    totals: computeTotalTax(outward),
  };
}

// ── Public: validateGSTR1Payload ─────────────────────────────────────

export function validateGSTR1Payload(
  payload: GSTR1Payload,
): { valid: boolean; warnings: BuilderWarning[]; errors: BuilderError[] } {
  const warnings: BuilderWarning[] = [];
  const errors: BuilderError[] = [];
  if (!isValidGSTIN(payload.gstin)) {
    pushErr(errors, 'GSTIN_INVALID', `Payload GSTIN ${payload.gstin} fails format check`, []);
  }
  if (!/^\d{2}-\d{4}$/.test(payload.fp)) {
    pushErr(errors, 'DATE_OUT_OF_PERIOD', `Return period ${payload.fp} not MM-YYYY`, []);
  }
  if (!Array.isArray(payload.b2b)) {
    pushErr(errors, 'GSTIN_INVALID', 'b2b section is not an array', []);
  }
  if (!payload.hsn || !Array.isArray(payload.hsn.data)) {
    pushWarn(warnings, 'HSN_MISSING', 'HSN summary missing or malformed', []);
  }
  for (const grp of payload.b2b ?? []) {
    if (!isValidGSTIN(grp.ctin)) {
      pushErr(errors, 'GSTIN_INVALID', `B2B group ctin ${grp.ctin} invalid`, grp.inv.map(i => i.inum));
    }
  }
  return { valid: errors.length === 0, warnings, errors };
}

// ── Public: computeHSNSummary ────────────────────────────────────────

export function computeHSNSummary(supplies: CrossCardSupply[]): GSTR1HSNRow[] {
  const rows = deriveHSNRows(supplies);
  return rows.map(r => ({
    num: r.num,
    hsn_sc: r.hsn,
    uqc: r.uqc,
    qty: r.qty,
    txval: r.txval,
    iamt: r.iamt,
    camt: r.camt,
    samt: r.samt,
    csamt: r.csamt,
  }));
}

// ── Public: computeDocIssueSection ───────────────────────────────────

export function computeDocIssueSection(supplies: CrossCardSupply[]): GSTR1DocIssue {
  // Phase 1 stub: single doc-type (tax invoice = 1), single range across all supplies.
  // Phase 2 will add cancellation tracking + per-doc-type ranges.
  if (supplies.length === 0) {
    return { doc_det: [{ num: 1, docs: [] }] };
  }
  const sorted = [...supplies].sort((a, b) => a.invoice_no.localeCompare(b.invoice_no));
  const from = sorted[0].invoice_no;
  const to = sorted[sorted.length - 1].invoice_no;
  return {
    doc_det: [{
      num: 1, // 1 = Tax Invoice per GSTN doc-type table
      docs: [{
        num: 1,
        from,
        to,
        totnum: supplies.length,
        cancel: 0,
        net_issue: supplies.length,
      }],
    }],
  };
}
