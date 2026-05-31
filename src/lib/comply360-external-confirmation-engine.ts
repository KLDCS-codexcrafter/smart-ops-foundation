/**
 * @file        src/lib/comply360-external-confirmation-engine.ts
 * @sibling     NEW @ Sprint 82 · DP-S82-2 · FULL External Confirmation workflow (extends S80b basic)
 * @reads-from  comply360-audit-framework-engine · comply360-audit-analytics-engine
 *              audit-trail-engine · comply360-audit-trail-aggregator-engine
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FLOOR 2 CLOSES
 * [JWT] Phase 8: POST /api/comply360/external-confirmation/*
 */
import { logAudit } from './audit-trail-engine';
import type { AuditEntityType as LogAuditEntityType } from '@/types/audit-trail';
import { registerAuditEntityType } from './comply360-audit-trail-aggregator-engine';
import type { BAPAccountId } from './comply360-audit-framework-engine';

export const READS_FROM = {
  engines: [
    'comply360-audit-framework-engine',
    'comply360-audit-analytics-engine',
    'audit-trail-engine',
    'comply360-audit-trail-aggregator-engine',
  ],
  storage_keys: ['erp_ec_letters', 'erp_ec_received', 'erp_ec_variances'],
} as const;

const LETTERS_KEY = 'erp_ec_letters';
const RECEIVED_KEY = 'erp_ec_received';
const VAR_KEY = 'erp_ec_variances';

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

export type ConfirmationType =
  | 'debtor_balance' | 'creditor_balance' | 'bank_balance' | 'inventory_held' | 'legal_consultations';
export type LetterStatus = 'draft' | 'sent' | 'received' | 'no_response' | 'disputed';

export interface ConfirmationLetter {
  id: string;
  engagement_id: string;
  confirmation_type: ConfirmationType;
  recipient_name: string;
  recipient_address: string;
  recipient_contact: string;
  reference_balance_inr: number;
  as_of_date: string;
  reply_deadline: string;
  letter_status: LetterStatus;
  sent_at: string | null;
  received_at: string | null;
  authored_by_bap: BAPAccountId;
  created_at: string;
}

export interface ConfirmationReceived {
  id: string;
  confirmation_letter_id: string;
  confirmed_balance_inr: number;
  reply_date: string;
  reply_method: 'email' | 'post' | 'fax' | 'in-person';
  reply_attachment_ref: string | null;
  reconciled: boolean;
  recorded_at: string;
  recorded_by_bap: BAPAccountId;
}

export interface ConfirmationVariance {
  id: string;
  confirmation_letter_id: string;
  variance_amount_inr: number;
  variance_pct: number;
  variance_explanation: string;
  resolved: boolean;
  resolved_at: string | null;
  recorded_at: string;
}

export function generateConfirmationLetter(
  input: Omit<ConfirmationLetter, 'id' | 'created_at' | 'letter_status' | 'sent_at' | 'received_at'>,
): ConfirmationLetter {
  const letter: ConfirmationLetter = {
    ...input,
    id: uid('ecl'),
    letter_status: 'draft',
    sent_at: null,
    received_at: null,
    created_at: new Date().toISOString(),
  };
  const all = readJson<ConfirmationLetter[]>(LETTERS_KEY, []);
  all.push(letter);
  writeJson(LETTERS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('external_confirmation_letter'),
    recordId: letter.id,
    recordLabel: `Confirmation Letter · ${input.confirmation_type} · ${input.recipient_name}`,
    beforeState: null,
    afterState: letter as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-confirmation-engine',
  });
  return letter;
}

export function markConfirmationSent(letter_id: string, by_bap: BAPAccountId): ConfirmationLetter {
  const all = readJson<ConfirmationLetter[]>(LETTERS_KEY, []);
  const idx = all.findIndex((l) => l.id === letter_id);
  if (idx < 0) throw new Error(`Confirmation letter not found: ${letter_id}`);
  const before = { ...all[idx] };
  all[idx] = { ...all[idx], letter_status: 'sent', sent_at: new Date().toISOString() };
  writeJson(LETTERS_KEY, all);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'update',
    entityType: AUD('external_confirmation_letter'),
    recordId: letter_id,
    recordLabel: `Confirmation sent · ${all[idx].recipient_name}`,
    beforeState: before as unknown as Record<string, unknown>,
    afterState: all[idx] as unknown as Record<string, unknown>,
    reason: `by ${by_bap}`,
    sourceModule: 'comply360-external-confirmation-engine',
  });
  return all[idx];
}

export function recordConfirmationReceived(
  input: Omit<ConfirmationReceived, 'id' | 'recorded_at' | 'reconciled'>,
): ConfirmationReceived {
  const received: ConfirmationReceived = {
    ...input,
    id: uid('ecr'),
    reconciled: false,
    recorded_at: new Date().toISOString(),
  };
  const all = readJson<ConfirmationReceived[]>(RECEIVED_KEY, []);
  all.push(received);
  writeJson(RECEIVED_KEY, all);
  // update parent letter status
  const letters = readJson<ConfirmationLetter[]>(LETTERS_KEY, []);
  const idx = letters.findIndex((l) => l.id === input.confirmation_letter_id);
  if (idx >= 0) {
    letters[idx] = { ...letters[idx], letter_status: 'received', received_at: received.recorded_at };
    writeJson(LETTERS_KEY, letters);
  }
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('external_confirmation_received'),
    recordId: received.id,
    recordLabel: `Confirmation received · ₹${input.confirmed_balance_inr}`,
    beforeState: null,
    afterState: received as unknown as Record<string, unknown>,
    sourceModule: 'comply360-external-confirmation-engine',
  });
  return received;
}

export function reconcileConfirmation(
  letter_id: string,
  by_bap: BAPAccountId,
): { reconciled: boolean; variance: ConfirmationVariance | null } {
  const letters = readJson<ConfirmationLetter[]>(LETTERS_KEY, []);
  const letter = letters.find((l) => l.id === letter_id);
  if (!letter) throw new Error(`Letter not found: ${letter_id}`);
  const received = readJson<ConfirmationReceived[]>(RECEIVED_KEY, [])
    .find((r) => r.confirmation_letter_id === letter_id);
  if (!received) return { reconciled: false, variance: null };

  const diff = received.confirmed_balance_inr - letter.reference_balance_inr;
  if (Math.abs(diff) <= 0.01) {
    // mark reconciled
    const all = readJson<ConfirmationReceived[]>(RECEIVED_KEY, []);
    const idx = all.findIndex((r) => r.id === received.id);
    if (idx >= 0) { all[idx] = { ...all[idx], reconciled: true }; writeJson(RECEIVED_KEY, all); }
    return { reconciled: true, variance: null };
  }

  const variance: ConfirmationVariance = {
    id: uid('ecv'),
    confirmation_letter_id: letter_id,
    variance_amount_inr: diff,
    variance_pct: letter.reference_balance_inr === 0
      ? 0
      : (diff / letter.reference_balance_inr) * 100,
    variance_explanation: 'Awaiting client reconciliation',
    resolved: false,
    resolved_at: null,
    recorded_at: new Date().toISOString(),
  };
  const variances = readJson<ConfirmationVariance[]>(VAR_KEY, []);
  variances.push(variance);
  writeJson(VAR_KEY, variances);
  logAudit({
    entityCode: activeEntityCode(),
    action: 'create',
    entityType: AUD('external_confirmation_variance'),
    recordId: variance.id,
    recordLabel: `Variance ₹${diff.toFixed(2)} on letter ${letter_id}`,
    beforeState: null,
    afterState: variance as unknown as Record<string, unknown>,
    reason: `by ${by_bap}`,
    sourceModule: 'comply360-external-confirmation-engine',
  });
  return { reconciled: false, variance };
}

export function listConfirmationLetters(
  engagement_id: string,
  opts?: { confirmation_type?: ConfirmationType; letter_status?: LetterStatus },
): ConfirmationLetter[] {
  return readJson<ConfirmationLetter[]>(LETTERS_KEY, [])
    .filter((l) => l.engagement_id === engagement_id)
    .filter((l) => !opts?.confirmation_type || l.confirmation_type === opts.confirmation_type)
    .filter((l) => !opts?.letter_status || l.letter_status === opts.letter_status);
}

registerAuditEntityType({ id: 'external_confirmation_letter', module: 'audit-trail', label: 'External Confirmation · Letter' });
registerAuditEntityType({ id: 'external_confirmation_received', module: 'audit-trail', label: 'External Confirmation · Received Reply' });
registerAuditEntityType({ id: 'external_confirmation_variance', module: 'audit-trail', label: 'External Confirmation · Variance' });
