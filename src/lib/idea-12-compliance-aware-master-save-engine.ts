/**
 * @file        src/lib/idea-12-compliance-aware-master-save-engine.ts
 * @sibling     NEW @ Sprint 101 · 🏁 Arc 0 Capstone · 💡 Idea 12
 * @orchestrator Pre-save GATE for any master persistence. USE-SITE INVOKES
 *              gstin-validator.validateGSTIN, india-validations PAN/CIN/TAN/UDYAM
 *              regexes, and hsn-resolver.lookupHSN. Does NOT reimplement any
 *              validator (FR-44 · 0-DIFF). Returns a verdict callers consume
 *              before writing: `ok:false` BLOCKS the save (hard), `warnings`
 *              are SOFT (e.g. URP-sentinel B2C parties).
 * @reads-from  gstin-validator · india-validations · hsn-resolver
 * @audit       Shares `master_lifecycle_event` with idea-9/idea-10.
 *              Action discriminator: 'compliance_block' (blocks logged only).
 * @sprint      T-Phase-6.A.0.6 · Block 4
 * [JWT] Phase 8: POST /api/master-compliance-gate
 */
import { logAudit } from '@/lib/audit-trail-engine';
import { validateGSTIN as validateGSTINPure, isUnregisteredParty } from '@/lib/gstin-validator';
import {
  PAN_REGEX, CIN_REGEX, TAN_REGEX, UDYAM_REGEX,
} from '@/lib/india-validations';
import { lookupHSN } from '@/lib/hsn-resolver';
import type { MasterType } from '@/lib/master-replication-engine';

export const READS_FROM = {
  engines: ['gstin-validator', 'india-validations', 'hsn-resolver'],
  storage_keys: [],
} as const;

export interface ComplianceGateResult {
  ok: boolean;
  blocks: string[];
  warnings: string[];
}

function s(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function checkCustomerOrVendor(record: Record<string, unknown>): ComplianceGateResult {
  const blocks: string[] = [];
  const warnings: string[] = [];
  const gstin = s(record['gstin']);
  const pan = s(record['pan']);
  if (gstin) {
    // USE-SITE call · FR-44 0-DIFF on gstin-validator.
    const r = validateGSTINPure(gstin);
    if (!r.valid) {
      if (isUnregisteredParty(gstin)) {
        warnings.push(`GSTIN treated as Unregistered (URP) for ${s(record['name']) || 'party'}`);
      } else {
        blocks.push(`GSTIN invalid: ${r.reason ?? 'unknown'}`);
      }
    }
  } else {
    warnings.push('GSTIN not supplied — party will be treated as Unregistered (B2C)');
  }
  if (pan) {
    if (!PAN_REGEX.test(pan.toUpperCase())) blocks.push('PAN format invalid (expect AAAAA0000A)');
  } else {
    warnings.push('PAN not supplied');
  }
  return { ok: blocks.length === 0, blocks, warnings };
}

function checkCompanyMaster(record: Record<string, unknown>): ComplianceGateResult {
  const blocks: string[] = [];
  const warnings: string[] = [];
  const cin = s(record['cin']);
  const tan = s(record['tan']);
  const udyam = s(record['udyam']);
  if (cin && !CIN_REGEX.test(cin.toUpperCase())) blocks.push('CIN format invalid (21 chars)');
  if (tan && !TAN_REGEX.test(tan.toUpperCase())) blocks.push('TAN format invalid');
  if (udyam && !UDYAM_REGEX.test(udyam.toUpperCase())) warnings.push('UDYAM format suspicious');
  return { ok: blocks.length === 0, blocks, warnings };
}

function checkItem(record: Record<string, unknown>): ComplianceGateResult {
  const blocks: string[] = [];
  const warnings: string[] = [];
  const code = s(record['hsn_sac_code']) || s(record['hsn_code']) || s(record['hsn']);
  if (!code) {
    warnings.push('HSN/SAC code missing — required before invoicing');
  } else {
    // USE-SITE call · FR-44 0-DIFF on hsn-resolver.
    const hit = lookupHSN(code);
    if (!hit) blocks.push(`HSN/SAC ${code} not found in seed/extension registry`);
  }
  return { ok: blocks.length === 0, blocks, warnings };
}

function checkLedger(record: Record<string, unknown>): ComplianceGateResult {
  // Generic ledger has no statutory regex; defer to record-bound party flag.
  return checkCustomerOrVendor(record);
}

/**
 * evaluateMasterSave — pre-save compliance verdict for a master record.
 * Pure dispatcher · delegates to existing validators (orchestration only).
 */
export function evaluateMasterSave(input: {
  master_type: MasterType | 'company';
  record: Record<string, unknown>;
  entity_code?: string;
  log_blocks?: boolean;
}): ComplianceGateResult {
  let result: ComplianceGateResult;
  switch (input.master_type) {
    case 'customer':
    case 'vendor':
      result = checkCustomerOrVendor(input.record);
      break;
    case 'item':
      result = checkItem(input.record);
      break;
    case 'ledger':
      result = checkLedger(input.record);
      break;
    case 'company':
      result = checkCompanyMaster(input.record);
      break;
    default:
      result = { ok: true, blocks: [], warnings: [] };
  }
  if (!result.ok && (input.log_blocks ?? true)) {
    logAudit({
      entityCode: input.entity_code ?? 'GLOBAL',
      action: 'reject',
      entityType: 'master_lifecycle_event',
      recordId: `compliance-block|${input.master_type}|${s(input.record['id']) || s(input.record['name']) || 'unknown'}`,
      recordLabel: `Compliance block on ${input.master_type}: ${result.blocks.join(' · ')}`,
      beforeState: null,
      afterState: { action: 'compliance_block', master_type: input.master_type, blocks: result.blocks },
      reason: 'compliance_block',
      sourceModule: 'mca-roc',
    });
  }
  return result;
}
