/**
 * @file        src/lib/comply360-dsc-engine.ts
 * @sibling     NEW @ Sprint 82 · DP-S82-4 · Phase 5 client-side validation stub
 * @reads-from  audit-trail-engine · comply360-audit-trail-aggregator-engine · audit-framework
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FLOOR 2 CLOSES
 * [JWT] Phase 8: POST /api/comply360/dsc/validate · POST /api/comply360/dsc/sign-audit-pack
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
    'comply360-audit-framework-engine',
  ],
  storage_keys: ['erp_dsc_validations', 'erp_dsc_signed_audit_packs'],
} as const;

const VAL_KEY = 'erp_dsc_validations';
const SIGN_KEY = 'erp_dsc_signed_audit_packs';

const APPROVED_CAS = ['eMudhra', 'NSDL', 'IDRBT', 'NIC', 'SafeScrypt'] as const;

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

/** Deterministic browser-safe SHA-256 stub via FNV-1a 64-bit (no Node crypto in browser). */
function deterministicHash(input: string): string {
  // FNV-1a 64-bit · sufficient for tamper-evident stub (Phase 5)
  let h = BigInt('0xcbf29ce484222325');
  const prime = BigInt('0x100000001b3');
  const mask = BigInt('0xffffffffffffffff');
  for (let i = 0; i < input.length; i++) {
    h = (h ^ BigInt(input.charCodeAt(i))) & mask;
    h = (h * prime) & mask;
  }
  return h.toString(16).padStart(16, '0');
}

export interface DSCValidationResult {
  id: string;
  certificate_id: string;
  certificate_holder_name: string;
  certificate_authority: string;
  validity_start: string;
  validity_end: string;
  is_valid: boolean;
  validation_errors: string[];
  validated_at: string;
}

export interface DSCSignedAuditPack {
  id: string;
  final_audit_pack_id: string;
  dsc_validation_id: string;
  signature_hash: string;
  signed_at: string;
  signed_by_bap: BAPAccountId;
}

export function validateDSC(opts: {
  certificate_id: string;
  certificate_holder_name: string;
  certificate_authority: string;
  validity_start: string;
  validity_end: string;
}): DSCValidationResult {
  const errors: string[] = [];
  const today = new Date().toISOString().slice(0, 10);
  if (!opts.validity_start) errors.push('validity_start missing');
  if (!opts.validity_end) errors.push('validity_end missing');
  if (opts.validity_end && opts.validity_end <= today) errors.push('Certificate expired');
  if (!(APPROVED_CAS as readonly string[]).includes(opts.certificate_authority)) {
    errors.push(`Certificate authority not approved: ${opts.certificate_authority}`);
  }
  const result: DSCValidationResult = {
    ...opts,
    id: uid('dscv'),
    is_valid: errors.length === 0,
    validation_errors: errors,
    validated_at: new Date().toISOString(),
  };
  const all = readJson<DSCValidationResult[]>(VAL_KEY, []);
  all.push(result);
  writeJson(VAL_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('dsc_validation'),
    recordId: result.id,
    recordLabel: `DSC validation · ${opts.certificate_authority} · ${result.is_valid ? 'valid' : 'invalid'}`,
    beforeState: null,
    afterState: result as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dsc-engine',
  });
  return result;
}

export function signAuditPack(opts: {
  final_audit_pack_id: string;
  dsc_validation_id: string;
  signed_by_bap: BAPAccountId;
}): DSCSignedAuditPack {
  const validation = readJson<DSCValidationResult[]>(VAL_KEY, []).find((v) => v.id === opts.dsc_validation_id);
  if (!validation) throw new Error(`DSC validation not found: ${opts.dsc_validation_id}`);
  if (!validation.is_valid) throw new Error('Cannot sign with invalid DSC');
  const signed_at = new Date().toISOString();
  const signature_hash = deterministicHash(`${opts.final_audit_pack_id}|${validation.certificate_id}|${signed_at}`);
  const pack: DSCSignedAuditPack = {
    id: uid('sap'),
    final_audit_pack_id: opts.final_audit_pack_id,
    dsc_validation_id: opts.dsc_validation_id,
    signature_hash,
    signed_at,
    signed_by_bap: opts.signed_by_bap,
  };
  const all = readJson<DSCSignedAuditPack[]>(SIGN_KEY, []);
  all.push(pack);
  writeJson(SIGN_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('dsc_signed_audit_pack'),
    recordId: pack.id,
    recordLabel: `DSC signed pack · ${opts.final_audit_pack_id}`,
    beforeState: null,
    afterState: pack as unknown as Record<string, unknown>,
    sourceModule: 'comply360-dsc-engine',
  });
  return pack;
}

export function listDSCValidations(): DSCValidationResult[] {
  return readJson<DSCValidationResult[]>(VAL_KEY, []);
}

export function listSignedAuditPacks(): DSCSignedAuditPack[] {
  return readJson<DSCSignedAuditPack[]>(SIGN_KEY, []);
}

registerAuditEntityType({ id: 'dsc_validation', module: 'audit-trail', label: 'DSC · Validation Result' });
registerAuditEntityType({ id: 'dsc_signed_audit_pack', module: 'audit-trail', label: 'DSC · Signed Audit Pack' });
