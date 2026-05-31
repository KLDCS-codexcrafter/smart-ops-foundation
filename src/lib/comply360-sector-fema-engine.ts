/**
 * @file        src/lib/comply360-sector-fema-engine.ts
 * @sibling     NEW @ Sprint 87 · DP-S87-4
 * @realizes    FEMA · FC-GPR + FC-TRS + Annual Return on Foreign Liabilities.
 * @reads-from  audit-trail-engine · audit-trail-aggregator
 * @sprint      Sprint 87 · T-Phase-5.D.4.2 · FLOOR 4 CLOSES
 * [JWT] Phase 8: POST /api/comply360/fema/{fcgpr,fctrs,annual}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: ['audit-trail-engine', 'comply360-audit-trail-aggregator-engine'],
  storage_keys: ['erp_fema_fc_gpr_filings', 'erp_fema_fc_trs_filings', 'erp_fema_annual_returns'],
} as const;

export type FEMAFilingStatus = 'draft' | 'ready_to_file' | 'filed' | 'rejected';

export interface FCGPRFiling {
  id: string;
  filing_date: string;
  investor_name: string;
  investor_country: string;
  investment_amount_inr: number;
  investment_amount_usd: number;
  shares_allotted: number;
  share_price_inr: number;
  filing_deadline: string;
  filing_status: FEMAFilingStatus;
  filed_at: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface FCTRSFiling {
  id: string;
  filing_date: string;
  transferor_name: string;
  transferee_name: string;
  shares_transferred: number;
  transfer_price_inr: number;
  is_resident_to_non_resident: boolean;
  filing_deadline: string;
  filing_status: FEMAFilingStatus;
  filed_at: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface AnnualForeignLiabilitiesReturn {
  id: string;
  fy: string;
  total_foreign_equity_inr: number;
  total_foreign_debt_inr: number;
  total_payable_inr: number;
  filing_deadline: string;
  filing_status: FEMAFilingStatus;
  filed_at: string | null;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

const G_KEY = 'erp_fema_fc_gpr_filings';
const T_KEY = 'erp_fema_fc_trs_filings';
const A_KEY = 'erp_fema_annual_returns';

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

export function createFCGPRFiling(
  input: Omit<FCGPRFiling, 'id' | 'recorded_at' | 'filed_at' | 'filing_status'>,
): FCGPRFiling {
  const f: FCGPRFiling = {
    ...input, id: uid('fema_gpr'), filing_status: 'draft', filed_at: null,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<FCGPRFiling[]>(G_KEY, []);
  all.push(f); writeJson(G_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('fema_fc_gpr_filing'),
    recordId: f.id, recordLabel: `FC-GPR · ${input.investor_name} · ${input.investor_country}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-fema-engine',
  });
  return f;
}

export function listFCGPRFilings(opts: { filing_status?: FEMAFilingStatus } = {}): FCGPRFiling[] {
  return readJson<FCGPRFiling[]>(G_KEY, []).filter((f) => !opts.filing_status || f.filing_status === opts.filing_status);
}

export function createFCTRSFiling(
  input: Omit<FCTRSFiling, 'id' | 'recorded_at' | 'filed_at' | 'filing_status'>,
): FCTRSFiling {
  const f: FCTRSFiling = {
    ...input, id: uid('fema_trs'), filing_status: 'draft', filed_at: null,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<FCTRSFiling[]>(T_KEY, []);
  all.push(f); writeJson(T_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('fema_fc_trs_filing'),
    recordId: f.id, recordLabel: `FC-TRS · ${input.transferor_name} → ${input.transferee_name}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-fema-engine',
  });
  return f;
}

export function listFCTRSFilings(opts: { filing_status?: FEMAFilingStatus } = {}): FCTRSFiling[] {
  return readJson<FCTRSFiling[]>(T_KEY, []).filter((f) => !opts.filing_status || f.filing_status === opts.filing_status);
}

export function createAnnualReturn(
  input: Omit<AnnualForeignLiabilitiesReturn, 'id' | 'recorded_at' | 'filed_at' | 'filing_status' | 'total_payable_inr'>,
): AnnualForeignLiabilitiesReturn {
  const f: AnnualForeignLiabilitiesReturn = {
    ...input, id: uid('fema_ann'),
    total_payable_inr: input.total_foreign_equity_inr + input.total_foreign_debt_inr,
    filing_status: 'draft', filed_at: null,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<AnnualForeignLiabilitiesReturn[]>(A_KEY, []);
  all.push(f); writeJson(A_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('fema_annual_return'),
    recordId: f.id, recordLabel: `FEMA Annual Return · ${input.fy} · ₹${f.total_payable_inr}`,
    beforeState: null, afterState: f as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-fema-engine',
  });
  return f;
}

export function listAnnualReturns(opts: { fy?: string } = {}): AnnualForeignLiabilitiesReturn[] {
  return readJson<AnnualForeignLiabilitiesReturn[]>(A_KEY, []).filter((f) => !opts.fy || f.fy === opts.fy);
}

export function markFilingFiled(filing_type: 'fc_gpr' | 'fc_trs' | 'annual', filing_id: string, by_bap: BAPAccountId): void {
  const key = filing_type === 'fc_gpr' ? G_KEY : filing_type === 'fc_trs' ? T_KEY : A_KEY;
  const all = readJson<Array<{ id: string; filing_status: FEMAFilingStatus; filed_at: string | null }>>(key, []);
  const idx = all.findIndex((f) => f.id === filing_id);
  if (idx < 0) throw new Error(`FEMA filing not found: ${filing_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], filing_status: 'filed', filed_at: new Date().toISOString() };
  writeJson(key, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'update',
    entityType: AUD(`fema_${filing_type === 'fc_gpr' ? 'fc_gpr_filing' : filing_type === 'fc_trs' ? 'fc_trs_filing' : 'annual_return'}`),
    recordId: filing_id, recordLabel: `FEMA filing marked filed · by ${by_bap}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    sourceModule: 'comply360-sector-fema-engine',
  });
}

registerAuditEntityType({ id: 'fema_fc_gpr_filing', module: 'tax-gst', label: 'FEMA · FC-GPR Filing' });
registerAuditEntityType({ id: 'fema_fc_trs_filing', module: 'tax-gst', label: 'FEMA · FC-TRS Filing' });
registerAuditEntityType({ id: 'fema_annual_return', module: 'tax-gst', label: 'FEMA · Annual Foreign Liabilities Return' });
