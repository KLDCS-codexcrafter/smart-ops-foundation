/**
 * @file        src/lib/comply360-legal-contracts-engine.ts
 * @sibling     NEW @ Sprint 94 · Comply360 Floor 5.6 CAPSTONE · Q38 Legal Contracts
 * @realizes    Vendor / Customer / NDA contracts + stamp duty calculator + expiry tracker.
 *              28th USE-SITE READ.
 * @reads-from  comply360-legal-notices-engine (cross-reference) ·
 *              comply360-audit-framework-engine · comply360-calendar-engine ·
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 94 · T-Phase-5.F.5.6 · Floor 5.6 CAPSTONE
 * [JWT] Phase 8: POST /api/comply360/legal-contracts/{vendor,customer,nda,stamp-duty,renewal}
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-legal-notices-engine',
    'comply360-audit-framework-engine',
    'comply360-calendar-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: [
    'erp_legal_vendor_contracts', 'erp_legal_customer_contracts',
    'erp_legal_nda', 'erp_legal_stamp_duty', 'erp_legal_renewal_alert',
  ],
} as const;

registerAuditEntityType({ id: 'vendor_contract',        module: 'other', label: 'Vendor Contract' });
registerAuditEntityType({ id: 'customer_contract',      module: 'other', label: 'Customer Contract' });
registerAuditEntityType({ id: 'nda_agreement',          module: 'other', label: 'NDA Agreement' });
registerAuditEntityType({ id: 'stamp_duty_record',      module: 'other', label: 'Stamp Duty Record' });
registerAuditEntityType({ id: 'contract_renewal_alert', module: 'other', label: 'Contract Renewal Alert' });

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

export type ContractStatus = 'draft' | 'executed' | 'expired' | 'terminated';

// ═══ Vendor / Customer / NDA ═════════════════════════════════════════
interface BaseContract {
  id: string; counter_party: string; effective_date: string; expiry_date: string;
  value_paise: number; status: ContractStatus; ref_no: string;
}
export type VendorContract = BaseContract;
export type CustomerContract = BaseContract;
export interface NDAAgreement extends BaseContract {
  one_way: boolean;
}

const VEN_KEY = 'erp_legal_vendor_contracts';
const CUS_KEY = 'erp_legal_customer_contracts';
const NDA_KEY = 'erp_legal_nda';

export function recordVendorContract(input: Omit<VendorContract, 'id'>, by_bap: BAPAccountId): VendorContract {
  const r: VendorContract = { ...input, id: uid('vc') };
  const all = readJson<VendorContract[]>(VEN_KEY, []); all.push(r); writeJson(VEN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('vendor_contract'),
    recordId: r.id, recordLabel: `Vendor Contract · ${input.ref_no} · ${input.counter_party} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-contracts-engine',
  });
  return r;
}
export function listVendorContracts(filter: { status?: ContractStatus } = {}): VendorContract[] {
  return readJson<VendorContract[]>(VEN_KEY, []).filter((r) => !filter.status || r.status === filter.status);
}

export function recordCustomerContract(input: Omit<CustomerContract, 'id'>, by_bap: BAPAccountId): CustomerContract {
  const r: CustomerContract = { ...input, id: uid('cc') };
  const all = readJson<CustomerContract[]>(CUS_KEY, []); all.push(r); writeJson(CUS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('customer_contract'),
    recordId: r.id, recordLabel: `Customer Contract · ${input.ref_no} · ${input.counter_party} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-contracts-engine',
  });
  return r;
}
export function listCustomerContracts(): CustomerContract[] {
  return readJson<CustomerContract[]>(CUS_KEY, []);
}

export function recordNDA(input: Omit<NDAAgreement, 'id'>, by_bap: BAPAccountId): NDAAgreement {
  const r: NDAAgreement = { ...input, id: uid('nda') };
  const all = readJson<NDAAgreement[]>(NDA_KEY, []); all.push(r); writeJson(NDA_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('nda_agreement'),
    recordId: r.id, recordLabel: `NDA · ${input.ref_no} · ${input.counter_party} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-contracts-engine',
  });
  return r;
}
export function listNDAs(): NDAAgreement[] { return readJson<NDAAgreement[]>(NDA_KEY, []); }

// ═══ Stamp Duty ══════════════════════════════════════════════════════
export interface StampDutyRecord {
  id: string; instrument_kind: string; state: string;
  consideration_paise: number; rate_pct: number; duty_paise: number;
  paid_on: string; ref_no: string | null;
}
const SD_KEY = 'erp_legal_stamp_duty';

/** Stamp duty = consideration × rate% (rounded to paise). */
export function computeStampDuty(considerationPaise: number, ratePct: number): number {
  return Math.round(considerationPaise * (ratePct / 100));
}

export function recordStampDuty(input: Omit<StampDutyRecord, 'id' | 'duty_paise'>, by_bap: BAPAccountId): StampDutyRecord {
  const duty = computeStampDuty(input.consideration_paise, input.rate_pct);
  const r: StampDutyRecord = { ...input, id: uid('sd'), duty_paise: duty };
  const all = readJson<StampDutyRecord[]>(SD_KEY, []); all.push(r); writeJson(SD_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('stamp_duty_record'),
    recordId: r.id, recordLabel: `Stamp Duty · ${input.instrument_kind} · ${input.state} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-contracts-engine',
  });
  return r;
}
export function listStampDuty(): StampDutyRecord[] { return readJson<StampDutyRecord[]>(SD_KEY, []); }

// ═══ Renewal Alerts ══════════════════════════════════════════════════
export interface ContractRenewalAlert {
  id: string; contract_kind: 'vendor' | 'customer' | 'nda'; contract_ref: string;
  expiry_date: string; days_remaining: number; raised_on: string;
}
const RA_KEY = 'erp_legal_renewal_alert';
export function raiseContractRenewalAlert(input: Omit<ContractRenewalAlert, 'id'>, by_bap: BAPAccountId): ContractRenewalAlert {
  const r: ContractRenewalAlert = { ...input, id: uid('ra') };
  const all = readJson<ContractRenewalAlert[]>(RA_KEY, []); all.push(r); writeJson(RA_KEY, all);
  logAudit({
    entityCode: activeEntityCode(), action: 'create', entityType: AUD('contract_renewal_alert'),
    recordId: r.id, recordLabel: `Renewal Alert · ${input.contract_kind} · ${input.contract_ref} (by ${by_bap})`,
    beforeState: null, afterState: r as unknown as Record<string, unknown>,
    sourceModule: 'comply360-legal-contracts-engine',
  });
  return r;
}
export function listContractRenewalAlerts(): ContractRenewalAlert[] {
  return readJson<ContractRenewalAlert[]>(RA_KEY, []);
}

// ═══ Summary ═════════════════════════════════════════════════════════
export interface LegalContractsSummary {
  vendor_executed: number; customer_executed: number; nda_count: number;
  total_stamp_duty_paise: number; expiring_90_days: number;
}
export function getLegalContractsSummary(): LegalContractsSummary {
  const cutoff = Date.now() + 90 * 24 * 3600 * 1000;
  const all: BaseContract[] = [
    ...listVendorContracts(),
    ...listCustomerContracts(),
    ...listNDAs(),
  ];
  const expiring = all.filter((c) => c.status === 'executed' && new Date(c.expiry_date).getTime() <= cutoff).length;
  return {
    vendor_executed: listVendorContracts({ status: 'executed' }).length,
    customer_executed: listCustomerContracts().filter((c) => c.status === 'executed').length,
    nda_count: listNDAs().length,
    total_stamp_duty_paise: listStampDuty().reduce((s, r) => s + r.duty_paise, 0),
    expiring_90_days: expiring,
  };
}
