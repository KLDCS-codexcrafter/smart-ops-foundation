/**
 * gstPortalService.ts — API abstraction layer for GSTN
 * Current: JSON export (manual). Future: live GSTN API.
 * [JWT] Replace submit* with POST /api/gst/submit-*
 */
import type { GSTEntry } from '@/types/voucher';
import { mapUOMtoUQC } from './uqcMap';

// ── GSTN JSON Types (portal-compliant) ────────────────────────────────
export interface GSTR1B2BInvoice {
  inum: string; idt: string; val: number; pos: string;
  rchrg: 'Y' | 'N'; itms: GSTR1Item[];
}
export interface GSTR1Item {
  num: number;
  itm_det: { txval: number; idt?: string; igst?: number; cgst?: number; sgst?: number; cess?: number };
}
export interface GSTR1Payload {
  gstin: string; fp: string; gt?: number; cur_gt?: number;
  b2b: any[]; b2cl: any[]; b2cs: any[]; exp: any[];
  cdnr: any[]; cdnur: any[]; hsn: { data: any[] }; doc_issue?: any;
}
export interface GSTR3BPayload {
  gstin: string; ret_period: string;
  sup_details: any; inward_sup: any; itc_elg: any; intr_dtls: any; nil_sup: any;
}
export interface GSTR9Payload {
  gstin: string; fy: string;
  tbl4: any; tbl5: any; tbl6: any; tbl7: any; tbl9: any; tbl17: any;
}

// ── Date format helper ────────────────────────────────────────────────
function toGSTNDate(d: string): string {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
}

// ── Payload Builders ────────────────────────────────────────────────
export function buildGSTR1Payload(gstin: string, period: string, entries: GSTEntry[]): GSTR1Payload {
  const outward = entries.filter(e => !e.is_cancelled &&
    ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type));

  // B2B: grouped by GSTIN
  const b2bMap = new Map<string, any>();
  outward.filter(e => e.supply_type === 'B2B' && e.base_voucher_type === 'Sales').forEach(e => {
    if (!b2bMap.has(e.party_gstin)) b2bMap.set(e.party_gstin, { ctin: e.party_gstin, inv: [] });
    b2bMap.get(e.party_gstin).inv.push({
      inum: e.voucher_no, idt: toGSTNDate(e.date), val: e.invoice_value,
      pos: e.place_of_supply, rchrg: e.is_rcm ? 'Y' : 'N',
      itms: [{ num: 1, itm_det: { txval: e.taxable_value, igst: e.igst_amount, cgst: e.cgst_amount, sgst: e.sgst_amount, cess: e.cess_amount } }],
    });
  });

  // B2CL: inter-state B2C > 2.5L
  const b2cl: any[] = [];
  const b2clEntries = outward.filter(e => e.supply_type === 'B2C' && e.is_inter_state && e.invoice_value > 250000);
  const b2clByState = new Map<string, any[]>();
  b2clEntries.forEach(e => {
    if (!b2clByState.has(e.place_of_supply)) b2clByState.set(e.place_of_supply, []);
    b2clByState.get(e.place_of_supply)!.push({
      inum: e.voucher_no, idt: toGSTNDate(e.date), val: e.invoice_value,
      itms: [{ num: 1, itm_det: { txval: e.taxable_value, igst: e.igst_amount, cess: e.cess_amount } }],
    });
  });
  b2clByState.forEach((inv, pos) => b2cl.push({ pos, inv }));

  // B2CS: remaining B2C
  const b2csEntries = outward.filter(e => e.supply_type === 'B2C' &&
    !(e.is_inter_state && e.invoice_value > 250000));
  const b2csMap = new Map<string, any>();
  b2csEntries.forEach(e => {
    const key = `${e.igst_rate || e.cgst_rate * 2}-${e.place_of_supply}-${e.is_inter_state ? 'I' : 'D'}`;
    if (!b2csMap.has(key)) b2csMap.set(key, { sply_ty: e.is_inter_state ? 'INTER' : 'INTRA', pos: e.place_of_supply, rt: e.igst_rate || e.cgst_rate * 2, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 });
    const r = b2csMap.get(key)!;
    r.txval += e.taxable_value; r.iamt += e.igst_amount; r.camt += e.cgst_amount; r.samt += e.sgst_amount; r.csamt += e.cess_amount;
  });

  // Exports
  const exp = outward.filter(e => ['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type))
    .map(e => ({ inum: e.voucher_no, idt: toGSTNDate(e.date), val: e.invoice_value, sbpcode: '', sbnum: '', sbdt: '', txval: e.taxable_value, igst: e.igst_amount, cess: e.cess_amount }));

  // CDNR: CN/DN for registered
  const cdnrMap = new Map<string, any>();
  outward.filter(e => ['Credit Note', 'Debit Note'].includes(e.base_voucher_type) && e.supply_type === 'B2B').forEach(e => {
    if (!cdnrMap.has(e.party_gstin)) cdnrMap.set(e.party_gstin, { ctin: e.party_gstin, nt: [] });
    cdnrMap.get(e.party_gstin).nt.push({
      ntty: e.base_voucher_type === 'Credit Note' ? 'C' : 'D',
      nt_num: e.voucher_no, nt_dt: toGSTNDate(e.date), val: e.invoice_value,
      itms: [{ num: 1, itm_det: { txval: e.taxable_value, igst: e.igst_amount, cgst: e.cgst_amount, sgst: e.sgst_amount, cess: e.cess_amount } }],
    });
  });

  // CDNUR: CN/DN for unregistered
  const cdnur = outward.filter(e => ['Credit Note', 'Debit Note'].includes(e.base_voucher_type) && e.supply_type !== 'B2B')
    .map(e => ({
      ntty: e.base_voucher_type === 'Credit Note' ? 'C' : 'D',
      nt_num: e.voucher_no, nt_dt: toGSTNDate(e.date), val: e.invoice_value,
      itms: [{ num: 1, itm_det: { txval: e.taxable_value, igst: e.igst_amount, cgst: e.cgst_amount, sgst: e.sgst_amount, cess: e.cess_amount } }],
    }));

  // HSN Summary
  const hsnMap = new Map<string, any>();
  outward.forEach(e => {
    if (!e.hsn_code) return;
    const uqc = e.uqc || mapUOMtoUQC('NOS');
    const key = `${e.hsn_code}-${uqc}`;
    if (!hsnMap.has(key)) hsnMap.set(key, { num: hsnMap.size + 1, hsn_sc: e.hsn_code, uqc, qty: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 });
    const h = hsnMap.get(key)!;
    h.qty += e.qty || 0; h.txval += e.taxable_value; h.iamt += e.igst_amount; h.camt += e.cgst_amount; h.samt += e.sgst_amount; h.csamt += e.cess_amount;
  });

  // Document Summary
  const totalInvoices = outward.filter(e => e.base_voucher_type === 'Sales').length;
  const cancelledInvoices = entries.filter(e => e.is_cancelled && e.base_voucher_type === 'Sales').length;

  const fp = period.replace('-', ''); // '2026-04' → '202604' → need MMYYYY
  const [yr, mn] = period.split('-');
  const fpFormatted = `${mn}${yr}`;

  return {
    gstin, fp: fpFormatted,
    gt: outward.reduce((s, e) => s + e.invoice_value, 0),
    b2b: Array.from(b2bMap.values()),
    b2cl,
    b2cs: Array.from(b2csMap.values()),
    exp,
    cdnr: Array.from(cdnrMap.values()),
    cdnur,
    hsn: { data: Array.from(hsnMap.values()) },
    doc_issue: { doc_det: [{ num: 1, docs: [{ num: totalInvoices, from: '', to: '', totnum: totalInvoices, cancel: cancelledInvoices, net_issue: totalInvoices - cancelledInvoices }] }] },
  };
}

export function buildGSTR3BPayload(gstin: string, period: string, entries: GSTEntry[]): GSTR3BPayload {
  const active = entries.filter(e => !e.is_cancelled && e.date.startsWith(period));

  const outTaxable = active.filter(e => ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type) && ['B2B', 'B2C'].includes(e.supply_type));
  const zeroRated = active.filter(e => ['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type));
  const rcmEntries = active.filter(e => e.is_rcm && e.base_voucher_type === 'Purchase');
  const exemptEntries = active.filter(e => ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type) && !['B2B', 'B2C'].includes(e.supply_type) && !['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type));

  const sumTax = (arr: GSTEntry[]) => ({
    txval: arr.reduce((s, e) => s + e.taxable_value, 0),
    iamt: arr.reduce((s, e) => s + e.igst_amount, 0),
    camt: arr.reduce((s, e) => s + e.cgst_amount, 0),
    samt: arr.reduce((s, e) => s + e.sgst_amount, 0),
    csamt: arr.reduce((s, e) => s + e.cess_amount, 0),
  });

  const itcDomestic = active.filter(e => e.base_voucher_type === 'Purchase' && e.itc_eligible && !e.is_rcm);
  const itcRCM = active.filter(e => e.is_rcm && e.itc_eligible);
  const itcReversed = active.filter(e => (e.itc_reversal ?? 0) > 0);

  const itcAvail = {
    iamt: itcDomestic.reduce((s, e) => s + e.igst_amount, 0) + itcRCM.reduce((s, e) => s + e.igst_amount, 0),
    camt: itcDomestic.reduce((s, e) => s + e.cgst_amount, 0) + itcRCM.reduce((s, e) => s + e.cgst_amount, 0),
    samt: itcDomestic.reduce((s, e) => s + e.sgst_amount, 0) + itcRCM.reduce((s, e) => s + e.sgst_amount, 0),
    csamt: itcDomestic.reduce((s, e) => s + e.cess_amount, 0) + itcRCM.reduce((s, e) => s + e.cess_amount, 0),
  };

  const itcRev = {
    iamt: itcReversed.reduce((s, e) => s + (e.itc_reversal ?? 0), 0),
    camt: 0, samt: 0, csamt: 0,
  };

  const [yr, mn] = period.split('-');

  return {
    gstin, ret_period: `${mn}${yr}`,
    sup_details: {
      osup_det: sumTax(outTaxable),
      osup_zero: sumTax(zeroRated),
      osup_nil_exmp: sumTax(exemptEntries),
      isup_rev: sumTax(rcmEntries),
    },
    inward_sup: { isup_details: [{ ty: 'S', inter: 0, intra: 0 }] },
    itc_elg: {
      itc_avl: [
        { ty: 'IMPG', iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: 'IMPS', iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: 'ISRC', ...sumTax(itcRCM) },
        { ty: 'ISD', iamt: 0, camt: 0, samt: 0, csamt: 0 },
        { ty: 'OTH', ...sumTax(itcDomestic) },
      ],
      itc_rev: [{ ty: 'RUL', ...itcRev }],
      itc_net: {
        iamt: itcAvail.iamt - itcRev.iamt,
        camt: itcAvail.camt - itcRev.camt,
        samt: itcAvail.samt - itcRev.samt,
        csamt: itcAvail.csamt - itcRev.csamt,
      },
    },
    intr_dtls: { intr_ltfee: { iamt: 0, camt: 0, samt: 0, csamt: 0 } },
    nil_sup: { nil: { sply_ty: 'INTRB2B', nil_amt: 0, expt_amt: 0, ngsup_amt: 0 } },
  };
}

export function buildGSTR9Payload(gstin: string, fy: string, entries: GSTEntry[]): GSTR9Payload {
  const [startYear] = fy.split('-').map(Number);
  const fyStart = `${startYear}-04-01`;
  const fyEnd = `${startYear + 1}-03-31`;
  const fyEntries = entries.filter(e => !e.is_cancelled && e.date >= fyStart && e.date <= fyEnd);

  const outward = fyEntries.filter(e => ['Sales', 'Credit Note', 'Debit Note'].includes(e.base_voucher_type));
  const inward = fyEntries.filter(e => e.base_voucher_type === 'Purchase');

  const sumFields = (arr: GSTEntry[]) => ({
    txval: arr.reduce((s, e) => s + e.taxable_value, 0),
    iamt: arr.reduce((s, e) => s + e.igst_amount, 0),
    camt: arr.reduce((s, e) => s + e.cgst_amount, 0),
    samt: arr.reduce((s, e) => s + e.sgst_amount, 0),
    csamt: arr.reduce((s, e) => s + e.cess_amount, 0),
  });

  return {
    gstin, fy,
    tbl4: { pt4A: sumFields(outward.filter(e => ['B2B', 'B2C'].includes(e.supply_type))) },
    tbl5: { pt5A: sumFields(outward.filter(e => ['EXP_WP', 'EXP_WOP', 'SEZWP', 'SEZWOP'].includes(e.supply_type))) },
    tbl6: {
      pt6A: sumFields(inward.filter(e => e.itc_eligible)),
      pt6B: sumFields(inward.filter(e => e.itc_eligible && !e.is_rcm)),
    },
    tbl7: { pt7A: { iamt: inward.reduce((s, e) => s + (e.itc_reversal ?? 0), 0), camt: 0, samt: 0, csamt: 0 } },
    tbl9: {
      tax_pay: sumFields(outward),
      paid_itc: sumFields(inward.filter(e => e.itc_eligible)),
    },
    tbl17: {
      hsn: fyEntries.filter(e => e.hsn_code).reduce((acc, e) => {
        const key = e.hsn_code;
        if (!acc[key]) acc[key] = { hsn_sc: key, uqc: e.uqc || 'NOS', qty: 0, txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 };
        acc[key].qty += e.qty || 0;
        acc[key].txval += e.taxable_value;
        acc[key].iamt += e.igst_amount; acc[key].camt += e.cgst_amount;
        acc[key].samt += e.sgst_amount; acc[key].csamt += e.cess_amount;
        return acc;
      }, {} as Record<string, any>),
    },
  };
}

// ── Submission (current: manual JSON download. Future: API POST) ──────
export type PortalMode = 'manual' | 'api';

export function submitGSTR1(payload: GSTR1Payload, mode: PortalMode = 'manual'): void {
  if (mode === 'manual') {
    downloadJSON(`GSTR1_${payload.gstin}_${payload.fp}.json`, payload);
  } else {
    // [FUTURE API] POST to https://api.gst.gov.in/returns/gstr1
    throw new Error('GSTN API integration not yet enabled. Set mode to manual.');
  }
}

export function submitGSTR3B(payload: GSTR3BPayload, mode: PortalMode = 'manual'): void {
  if (mode === 'manual') { downloadJSON(`GSTR3B_${payload.gstin}_${payload.ret_period}.json`, payload); }
  else { throw new Error('GSTN API not enabled'); }
}

// ── 2A/2B fetch (current: accept uploaded file. Future: fetch from GSTN) ──
export function parse2AFile(file: File): Promise<any> {
  // [JWT] Future: GET /api/gst/2a-data
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        res(JSON.parse(text));
      } catch { rej(new Error('Invalid JSON format')); }
    };
    reader.readAsText(file);
  });
}

function downloadJSON(filename: string, data: object) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── TRACES 26AS Text File Parser ──────────────────────────────────────
export interface TRACES26ASRow {
  sr_no: string; deductor_name: string; deductor_tan: string;
  section_code: string; payment_date: string;
  amount_paid: number; tax_deducted: number; tds_deposited: number;
  status: "F" | "P" | "U" | "";
  booking_date: string; remarks: string;
}

export function parse26ASTextFile(text: string): TRACES26ASRow[] {
  const rows: TRACES26ASRow[] = [];
  let inPartA = false;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("^PART B") || trimmed.startsWith("^PART C") ||
        trimmed.startsWith("^PART D") || trimmed.startsWith("^PART E") ||
        trimmed.startsWith("^PART F") || trimmed.startsWith("^PART G") ||
        trimmed.startsWith("^PART H")) { inPartA = false; continue; }
    if (trimmed.startsWith("^PART A")) { inPartA = true; continue; }
    if (trimmed.startsWith("1^")) inPartA = true;
    if (!inPartA) continue;
    const f = trimmed.split("^");
    if (f.length < 7) continue;
    const amtPaid = parseFloat(f[5] || "0") || 0;
    const taxDed = parseFloat(f[6] || "0") || 0;
    if (taxDed === 0) continue;
    rows.push({
      sr_no: f[0], deductor_name: f[1], deductor_tan: f[2],
      section_code: f[3], payment_date: f[4],
      amount_paid: amtPaid, tax_deducted: taxDed,
      tds_deposited: parseFloat(f[7] || "0") || 0,
      status: (f[8] || "") as TRACES26ASRow['status'],
      booking_date: f[9] || "", remarks: f[10] || "",
    });
  }
  return rows;
}
