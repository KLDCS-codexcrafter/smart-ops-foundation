/**
 * @file        src/lib/comply360-tier2-extensions-engine.ts
 * @sibling     NEW @ Sprint 94 · Comply360 Floor 5.6 CAPSTONE · Q38 Tier-2 Extensions
 * @realizes    3 sub-regimes CONSOLIDATED INTERNAL (S91 waste-management pattern):
 *              Sub-regime 1 · GST Tier-2 (GSTR-4/5/7/8 + e-Invoicing + EWB-01/02 + RFD-01)
 *              Sub-regime 2 · IT Tier-2 (TDS u/s 195 foreign + Advance Tax + PAN/TAN)
 *              Sub-regime 3 · Exim Tier-2 (AD Code + BRC + MEIS/RoDTEP/RoSCTL + RCMC +
 *                Sec 65 Customs + ECB-2 + FEMA APR/FLA/ODI)
 *              29th USE-SITE READ at MAXIMUM SCALE. §H 0-DIFF preserved on upstream
 *              tax/exim engines via wrapper pattern.
 * @reads-from  comply360-gst-aggregator-engine · comply360-gstr-builder-engine ·
 *              comply360-tax-audit-3cd-engine · comply360-tds-aggregator-engine ·
 *              comply360-tds-194q-engine · eximx-pulse-publisher ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE
 * [JWT] Phase 8: POST /api/comply360/tier2-extensions/{gst,it,exim}/*
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-gst-aggregator-engine',
    'comply360-gstr-builder-engine',
    'comply360-tax-audit-3cd-engine',
    'comply360-tds-aggregator-engine',
    'comply360-tds-194q-engine',
    'eximx-pulse-publisher',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    // GST T2
    'erp_gst_t2_gstr4', 'erp_gst_t2_gstr5', 'erp_gst_t2_gstr7', 'erp_gst_t2_gstr8',
    'erp_gst_t2_einvoice', 'erp_gst_t2_ewb', 'erp_gst_t2_rfd01',
    // IT T2
    'erp_it_t2_tds195', 'erp_it_t2_advance_tax', 'erp_it_t2_pan_tan',
    // Exim T2
    'erp_exim_t2_adcode', 'erp_exim_t2_brc', 'erp_exim_t2_meis',
    'erp_exim_t2_rcmc', 'erp_exim_t2_sec65', 'erp_exim_t2_ecb2', 'erp_exim_t2_fema',
  ],
} as const;

// GST T2 entity types (module: 'tax-gst')
registerAuditEntityType({ id: 'gstr4_filing',  module: 'tax-gst', label: 'GSTR-4 Filing (Composition)' });
registerAuditEntityType({ id: 'gstr5_filing',  module: 'tax-gst', label: 'GSTR-5 Filing (Non-resident)' });
registerAuditEntityType({ id: 'gstr7_filing',  module: 'tax-gst', label: 'GSTR-7 Filing (TDS deductor)' });
registerAuditEntityType({ id: 'gstr8_filing',  module: 'tax-gst', label: 'GSTR-8 Filing (e-commerce TCS)' });
registerAuditEntityType({ id: 'e_invoice',     module: 'tax-gst', label: 'IRP e-Invoice (IRN)' });
registerAuditEntityType({ id: 'ewb_record',    module: 'tax-gst', label: 'E-Way Bill (EWB-01/02)' });
registerAuditEntityType({ id: 'rfd01_refund',  module: 'tax-gst', label: 'RFD-01 Refund Application' });

// IT T2 entity types (module: 'tds')
registerAuditEntityType({ id: 'tds_195_foreign',     module: 'tds', label: 'TDS u/s 195 (Foreign payment)' });
registerAuditEntityType({ id: 'advance_tax_record',  module: 'tds', label: 'Advance Tax Instalment' });
registerAuditEntityType({ id: 'pan_tan_application', module: 'tds', label: 'PAN/TAN Application' });

// Exim T2 entity types (module: 'other')
registerAuditEntityType({ id: 'ad_code',             module: 'other', label: 'AD Code Registration' });
registerAuditEntityType({ id: 'brc_record',          module: 'other', label: 'Bank Realisation Certificate (BRC)' });
registerAuditEntityType({ id: 'meis_rodtep_claim',   module: 'other', label: 'MEIS / RoDTEP / RoSCTL Claim' });
registerAuditEntityType({ id: 'rcmc_certificate',    module: 'other', label: 'RCMC Certificate' });
registerAuditEntityType({ id: 'sec_65_customs',      module: 'other', label: 'Section 65 Customs (Manufacture in Bond)' });
registerAuditEntityType({ id: 'ecb2_form',           module: 'other', label: 'Form ECB-2 (External Commercial Borrowing)' });
registerAuditEntityType({ id: 'fema_apr_fla_odi',    module: 'other', label: 'FEMA APR / FLA / ODI Filing' });

function AUD(t: string): LogAuditEntityType { return t as unknown as LogAuditEntityType; }
function uid(p: string): string { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function readJson<T>(k: string, fb: T): T {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T) : fb; } catch { return fb; }
}
function writeJson(k: string, v: unknown): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* quota */ }
}
function activeEntityCode(): string {
  try { return localStorage.getItem('erp_active_entity_code') ?? 'OPERIX-DEMO'; } catch { return 'OPERIX-DEMO'; }
}

export type FilingStatus = 'draft' | 'filed' | 'late_filed';

// ═══════════════════════════════════════════════════════════════════════
// SUB-REGIME 1 · GST Tier-2
// ═══════════════════════════════════════════════════════════════════════
export interface GSTR4Filing { id: string; fy: string; gstin: string; turnover_paise: number; tax_paise: number; status: FilingStatus; }
export interface GSTR5Filing { id: string; period: string; gstin: string; outward_paise: number; tax_paise: number; status: FilingStatus; }
export interface GSTR7Filing { id: string; period: string; gstin: string; tds_deducted_paise: number; status: FilingStatus; }
export interface GSTR8Filing { id: string; period: string; gstin: string; tcs_collected_paise: number; status: FilingStatus; }
export interface EInvoiceRecord { id: string; irn: string; invoice_no: string; invoice_date: string; value_paise: number; ack_no: string; }
export interface EWBRecord { id: string; ewb_no: string; kind: '01' | '02'; from_pin: string; to_pin: string; value_paise: number; valid_until: string; }
export interface RFD01Refund { id: string; arn: string; period: string; refund_kind: string; amount_paise: number; status: 'submitted' | 'sanctioned' | 'rejected'; }

const G4 = 'erp_gst_t2_gstr4', G5 = 'erp_gst_t2_gstr5', G7 = 'erp_gst_t2_gstr7', G8 = 'erp_gst_t2_gstr8';
const EI = 'erp_gst_t2_einvoice', EW = 'erp_gst_t2_ewb', RF = 'erp_gst_t2_rfd01';

export function fileGSTR4(input: Omit<GSTR4Filing, 'id'>, by_bap: BAPAccountId): GSTR4Filing {
  const r: GSTR4Filing = { ...input, id: uid('g4') };
  const all = readJson<GSTR4Filing[]>(G4, []); all.push(r); writeJson(G4, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('gstr4_filing'), recordId: r.id, recordLabel: `GSTR-4 · ${input.fy} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listGSTR4(): GSTR4Filing[] { return readJson<GSTR4Filing[]>(G4, []); }

export function fileGSTR5(input: Omit<GSTR5Filing, 'id'>, by_bap: BAPAccountId): GSTR5Filing {
  const r: GSTR5Filing = { ...input, id: uid('g5') };
  const all = readJson<GSTR5Filing[]>(G5, []); all.push(r); writeJson(G5, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('gstr5_filing'), recordId: r.id, recordLabel: `GSTR-5 · ${input.period} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listGSTR5(): GSTR5Filing[] { return readJson<GSTR5Filing[]>(G5, []); }

export function fileGSTR7(input: Omit<GSTR7Filing, 'id'>, by_bap: BAPAccountId): GSTR7Filing {
  const r: GSTR7Filing = { ...input, id: uid('g7') };
  const all = readJson<GSTR7Filing[]>(G7, []); all.push(r); writeJson(G7, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('gstr7_filing'), recordId: r.id, recordLabel: `GSTR-7 · ${input.period} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listGSTR7(): GSTR7Filing[] { return readJson<GSTR7Filing[]>(G7, []); }

export function fileGSTR8(input: Omit<GSTR8Filing, 'id'>, by_bap: BAPAccountId): GSTR8Filing {
  const r: GSTR8Filing = { ...input, id: uid('g8') };
  const all = readJson<GSTR8Filing[]>(G8, []); all.push(r); writeJson(G8, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('gstr8_filing'), recordId: r.id, recordLabel: `GSTR-8 · ${input.period} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listGSTR8(): GSTR8Filing[] { return readJson<GSTR8Filing[]>(G8, []); }

export function recordEInvoice(input: Omit<EInvoiceRecord, 'id'>, by_bap: BAPAccountId): EInvoiceRecord {
  const r: EInvoiceRecord = { ...input, id: uid('ei') };
  const all = readJson<EInvoiceRecord[]>(EI, []); all.push(r); writeJson(EI, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('e_invoice'), recordId: r.id, recordLabel: `IRN · ${input.irn} · ${input.invoice_no} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listEInvoices(): EInvoiceRecord[] { return readJson<EInvoiceRecord[]>(EI, []); }

export function recordEWB(input: Omit<EWBRecord, 'id'>, by_bap: BAPAccountId): EWBRecord {
  const r: EWBRecord = { ...input, id: uid('ew') };
  const all = readJson<EWBRecord[]>(EW, []); all.push(r); writeJson(EW, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('ewb_record'), recordId: r.id, recordLabel: `EWB-${input.kind} · ${input.ewb_no} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listEWB(): EWBRecord[] { return readJson<EWBRecord[]>(EW, []); }

export function submitRFD01(input: Omit<RFD01Refund, 'id'>, by_bap: BAPAccountId): RFD01Refund {
  const r: RFD01Refund = { ...input, id: uid('rf') };
  const all = readJson<RFD01Refund[]>(RF, []); all.push(r); writeJson(RF, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('rfd01_refund'), recordId: r.id, recordLabel: `RFD-01 · ${input.arn} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listRFD01(): RFD01Refund[] { return readJson<RFD01Refund[]>(RF, []); }

// ═══════════════════════════════════════════════════════════════════════
// SUB-REGIME 2 · IT Tier-2
// ═══════════════════════════════════════════════════════════════════════
export interface TDS195Foreign { id: string; payee_name: string; country: string; nature_of_payment: string; gross_paise: number; tds_paise: number; dtaa_rate_pct: number | null; deducted_on: string; }
export interface AdvanceTaxRecord { id: string; fy: string; instalment: 1 | 2 | 3 | 4; due_on: string; paid_paise: number; paid_on: string | null; }
export interface PANTANApplication { id: string; kind: 'PAN' | 'TAN'; applicant_name: string; ack_no: string; applied_on: string; granted_on: string | null; pan_tan: string | null; }

const T195 = 'erp_it_t2_tds195', ADV = 'erp_it_t2_advance_tax', PT = 'erp_it_t2_pan_tan';

export function recordTDS195(input: Omit<TDS195Foreign, 'id'>, by_bap: BAPAccountId): TDS195Foreign {
  const r: TDS195Foreign = { ...input, id: uid('t195') };
  const all = readJson<TDS195Foreign[]>(T195, []); all.push(r); writeJson(T195, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('tds_195_foreign'), recordId: r.id, recordLabel: `TDS 195 · ${input.payee_name} · ${input.country} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listTDS195(): TDS195Foreign[] { return readJson<TDS195Foreign[]>(T195, []); }

export function recordAdvanceTax(input: Omit<AdvanceTaxRecord, 'id'>, by_bap: BAPAccountId): AdvanceTaxRecord {
  const r: AdvanceTaxRecord = { ...input, id: uid('adv') };
  const all = readJson<AdvanceTaxRecord[]>(ADV, []); all.push(r); writeJson(ADV, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('advance_tax_record'), recordId: r.id, recordLabel: `Advance Tax · ${input.fy} · Q${input.instalment} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listAdvanceTax(filter: { fy?: string } = {}): AdvanceTaxRecord[] {
  return readJson<AdvanceTaxRecord[]>(ADV, []).filter((r) => !filter.fy || r.fy === filter.fy);
}

export function applyPANTAN(input: Omit<PANTANApplication, 'id'>, by_bap: BAPAccountId): PANTANApplication {
  const r: PANTANApplication = { ...input, id: uid('pt') };
  const all = readJson<PANTANApplication[]>(PT, []); all.push(r); writeJson(PT, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('pan_tan_application'), recordId: r.id, recordLabel: `${input.kind} · ${input.applicant_name} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listPANTANApplications(): PANTANApplication[] { return readJson<PANTANApplication[]>(PT, []); }

// ═══════════════════════════════════════════════════════════════════════
// SUB-REGIME 3 · Exim Tier-2
// ═══════════════════════════════════════════════════════════════════════
export interface ADCodeRecord { id: string; ad_code: string; bank_name: string; branch_ifsc: string; port_code: string; registered_on: string; }
export interface BRCRecord { id: string; brc_no: string; export_invoice_no: string; realised_paise: number; realised_on: string; currency: string; }
export interface MEISRodtepClaim { id: string; scheme: 'MEIS' | 'RoDTEP' | 'RoSCTL'; shipping_bill_no: string; claim_paise: number; status: 'pending' | 'sanctioned' | 'rejected'; }
export interface RCMCCertificate { id: string; epc_name: string; rcmc_no: string; issued_on: string; valid_until: string; }
export interface Sec65CustomsRecord { id: string; bond_no: string; warehouse_code: string; from_date: string; to_date: string; }
export interface ECB2Form { id: string; lrn: string; period: string; principal_paise: number; interest_paise: number; filed_on: string; }
export interface FEMAFilingRecord { id: string; kind: 'APR' | 'FLA' | 'ODI'; period: string; filed_on: string; ack_ref: string | null; }

const AD = 'erp_exim_t2_adcode', BRC = 'erp_exim_t2_brc', ME = 'erp_exim_t2_meis';
const RC = 'erp_exim_t2_rcmc', S65 = 'erp_exim_t2_sec65', ECB = 'erp_exim_t2_ecb2', FM = 'erp_exim_t2_fema';

export function registerADCode(input: Omit<ADCodeRecord, 'id'>, by_bap: BAPAccountId): ADCodeRecord {
  const r: ADCodeRecord = { ...input, id: uid('ad') };
  const all = readJson<ADCodeRecord[]>(AD, []); all.push(r); writeJson(AD, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('ad_code'), recordId: r.id, recordLabel: `AD Code · ${input.ad_code} · ${input.bank_name} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listADCodes(): ADCodeRecord[] { return readJson<ADCodeRecord[]>(AD, []); }

export function recordBRC(input: Omit<BRCRecord, 'id'>, by_bap: BAPAccountId): BRCRecord {
  const r: BRCRecord = { ...input, id: uid('brc') };
  const all = readJson<BRCRecord[]>(BRC, []); all.push(r); writeJson(BRC, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('brc_record'), recordId: r.id, recordLabel: `BRC · ${input.brc_no} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listBRCs(): BRCRecord[] { return readJson<BRCRecord[]>(BRC, []); }

export function recordMEISClaim(input: Omit<MEISRodtepClaim, 'id'>, by_bap: BAPAccountId): MEISRodtepClaim {
  const r: MEISRodtepClaim = { ...input, id: uid('me') };
  const all = readJson<MEISRodtepClaim[]>(ME, []); all.push(r); writeJson(ME, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('meis_rodtep_claim'), recordId: r.id, recordLabel: `${input.scheme} · ${input.shipping_bill_no} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listMEISClaims(filter: { status?: MEISRodtepClaim['status'] } = {}): MEISRodtepClaim[] {
  return readJson<MEISRodtepClaim[]>(ME, []).filter((r) => !filter.status || r.status === filter.status);
}

export function registerRCMC(input: Omit<RCMCCertificate, 'id'>, by_bap: BAPAccountId): RCMCCertificate {
  const r: RCMCCertificate = { ...input, id: uid('rc') };
  const all = readJson<RCMCCertificate[]>(RC, []); all.push(r); writeJson(RC, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('rcmc_certificate'), recordId: r.id, recordLabel: `RCMC · ${input.rcmc_no} · ${input.epc_name} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listRCMCs(): RCMCCertificate[] { return readJson<RCMCCertificate[]>(RC, []); }

export function recordSec65Customs(input: Omit<Sec65CustomsRecord, 'id'>, by_bap: BAPAccountId): Sec65CustomsRecord {
  const r: Sec65CustomsRecord = { ...input, id: uid('s65') };
  const all = readJson<Sec65CustomsRecord[]>(S65, []); all.push(r); writeJson(S65, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('sec_65_customs'), recordId: r.id, recordLabel: `Sec 65 Bond · ${input.bond_no} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listSec65Customs(): Sec65CustomsRecord[] { return readJson<Sec65CustomsRecord[]>(S65, []); }

export function fileECB2(input: Omit<ECB2Form, 'id'>, by_bap: BAPAccountId): ECB2Form {
  const r: ECB2Form = { ...input, id: uid('ecb') };
  const all = readJson<ECB2Form[]>(ECB, []); all.push(r); writeJson(ECB, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('ecb2_form'), recordId: r.id, recordLabel: `ECB-2 · ${input.lrn} · ${input.period} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listECB2Forms(): ECB2Form[] { return readJson<ECB2Form[]>(ECB, []); }

export function fileFEMAFiling(input: Omit<FEMAFilingRecord, 'id'>, by_bap: BAPAccountId): FEMAFilingRecord {
  const r: FEMAFilingRecord = { ...input, id: uid('fm') };
  const all = readJson<FEMAFilingRecord[]>(FM, []); all.push(r); writeJson(FM, all);
  logAudit({ entityCode: activeEntityCode(), action: 'create', entityType: AUD('fema_apr_fla_odi'), recordId: r.id, recordLabel: `FEMA ${input.kind} · ${input.period} (by ${by_bap})`, beforeState: null, afterState: r as unknown as Record<string, unknown>, sourceModule: 'comply360-tier2-extensions-engine' });
  return r;
}
export function listFEMAFilings(): FEMAFilingRecord[] { return readJson<FEMAFilingRecord[]>(FM, []); }

// ═══ Consolidated Tier-2 Extensions Summary ══════════════════════════
export interface Tier2ExtensionsSummary {
  gst_t2_filings: number;
  e_invoices_count: number;
  ewb_count: number;
  rfd01_sanctioned: number;
  tds_195_count: number;
  advance_tax_paid: number;
  exim_brc_count: number;
  meis_pending: number;
  rcmc_active: number;
  fema_filings_count: number;
}
export function getTier2ExtensionsSummary(): Tier2ExtensionsSummary {
  return {
    gst_t2_filings:
      listGSTR4().length + listGSTR5().length + listGSTR7().length + listGSTR8().length,
    e_invoices_count: listEInvoices().length,
    ewb_count: listEWB().length,
    rfd01_sanctioned: listRFD01().filter((r) => r.status === 'sanctioned').length,
    tds_195_count: listTDS195().length,
    advance_tax_paid: listAdvanceTax().filter((r) => r.paid_on !== null).length,
    exim_brc_count: listBRCs().length,
    meis_pending: listMEISClaims({ status: 'pending' }).length,
    rcmc_active: listRCMCs().length,
    fema_filings_count: listFEMAFilings().length,
  };
}
