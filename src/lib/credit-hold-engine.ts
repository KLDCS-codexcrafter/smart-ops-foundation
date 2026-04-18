/**
 * credit-hold-engine.ts — Pure credit hold check
 * Sprint 8. Dual mode: entity default + per-customer override.
 * Pure — no localStorage, no React, no toast.
 */

import type { CreditHoldCheck, CreditHoldMode } from '@/types/credit-hold';
import type { OutstandingEntry } from '@/types/voucher';

export interface CustomerHoldInput {
  id: string;
  partyCode: string;
  partyName: string;
  creditLimit: number;
  warningLimit: number;
  credit_hold_mode?: CreditHoldMode | null; // per-customer override
}

/**
 * resolveEffectiveMode — per-customer mode wins if set, else entity default.
 */
export function resolveEffectiveMode(
  customer: CustomerHoldInput,
  entityDefault: CreditHoldMode,
): CreditHoldMode {
  return customer.credit_hold_mode ?? entityDefault;
}

/**
 * checkCreditHold — main check. Call this on Sales Order + Sales Invoice save.
 */
export function checkCreditHold(
  customer: CustomerHoldInput,
  newInvoiceAmount: number,
  allOutstanding: OutstandingEntry[],
  entityDefaultMode: CreditHoldMode,
  configuredRatio: number = 1.0,
  today: string = new Date().toISOString().slice(0, 10),
): CreditHoldCheck {
  const myOutstandings = allOutstanding.filter(o =>
    o.party_id === customer.id && (o.status === 'open' || o.status === 'partial'),
  );
  const currentOutstanding = myOutstandings.reduce((s, o) => s + o.pending_amount, 0);
  const overdueOutstanding = myOutstandings
    .filter(o => o.due_date < today)
    .reduce((s, o) => s + o.pending_amount, 0);

  const projectedExposure = currentOutstanding + newInvoiceAmount;
  const effectiveLimit = customer.creditLimit * configuredRatio;
  const ratio = customer.creditLimit > 0 ? projectedExposure / customer.creditLimit : 0;
  const overLimitBy = Math.max(0, projectedExposure - effectiveLimit);
  const effectiveMode = resolveEffectiveMode(customer, entityDefaultMode);

  const overLimit = customer.creditLimit > 0 && projectedExposure > effectiveLimit;
  const overWarning = customer.warningLimit > 0 && projectedExposure > customer.warningLimit;

  const isBlocked = effectiveMode === 'hard_block' && overLimit;
  const isWarning = effectiveMode === 'soft_warn' && (overLimit || overWarning);

  let blockReason: string | null = null;
  if (isBlocked || isWarning) {
    const parts: string[] = [];
    if (isBlocked) {
      parts.push(`${customer.partyName} is INR ${overLimitBy.toLocaleString('en-IN')} over credit limit.`);
    } else {
      parts.push(`${customer.partyName} is approaching credit limit.`);
    }
    parts.push(`Current outstanding: INR ${currentOutstanding.toLocaleString('en-IN')}.`);
    if (overdueOutstanding > 0) {
      parts.push(`Of which INR ${overdueOutstanding.toLocaleString('en-IN')} is overdue.`);
    }
    parts.push(`Credit limit: INR ${customer.creditLimit.toLocaleString('en-IN')}.`);
    blockReason = parts.join(' ');
  }

  return {
    party_id: customer.id, party_name: customer.partyName,
    credit_limit: customer.creditLimit,
    warning_limit: customer.warningLimit,
    current_outstanding: currentOutstanding,
    overdue_outstanding: overdueOutstanding,
    new_invoice_amount: newInvoiceAmount,
    projected_exposure: projectedExposure,
    ratio, configured_ratio: configuredRatio,
    over_limit_by: overLimitBy,
    effective_mode: effectiveMode,
    is_blocked: isBlocked,
    is_warning: isWarning,
    block_reason: blockReason,
  };
}
