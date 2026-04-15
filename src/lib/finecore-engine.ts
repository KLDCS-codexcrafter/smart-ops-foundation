/**
 * finecore-engine.ts — Template variable resolver for voucher forms
 * [JWT] Replace with server-side resolution at /api/accounting/resolve-vars
 */
import type { Voucher } from '@/types/voucher';

export interface PartyMasterRef {
  creditDays?: number;
}

export interface EntityProfileRef {
  legalEntityName: string;
  city: string;
}

export function resolveVars(
  form: Partial<Voucher>,
  partyMaster: PartyMasterRef | null,
  entityProfile: EntityProfileRef | null,
  currentUserName: string
): Record<string, string> {
  const dueDate = partyMaster && form.date
    ? new Date(new Date(form.date).getTime() + (partyMaster.creditDays || 30) * 86400000)
        .toLocaleDateString('en-IN')
    : '';
  return {
    party:        form.party_name        ?? '',
    voucher_no:   form.voucher_no        ?? '(auto on save)',
    amount:       form.net_amount != null
                    ? '₹' + form.net_amount.toLocaleString('en-IN') : '',
    date:         form.date
                    ? new Date(form.date).toLocaleDateString('en-IN') : '',
    due_date:     dueDate,
    ref_no:       form.ref_voucher_no    ?? form.vendor_bill_no ?? '',
    our_company:  entityProfile?.legalEntityName ?? '',
    our_city:     entityProfile?.city    ?? '',
    mode:         form.payment_instrument ?? '',
    credit_days:  String(partyMaster?.creditDays ?? 30),
    from_ledger:  form.from_ledger_name  ?? '',
    to_ledger:    form.to_ledger_name    ?? '',
    from_godown:  form.from_godown_name  ?? '',
    to_godown:    form.to_godown_name    ?? '',
    salesperson:  currentUserName,
  };
}
