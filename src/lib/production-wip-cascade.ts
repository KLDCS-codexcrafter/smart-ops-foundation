/**
 * @file        src/lib/production-wip-cascade.ts
 * @sprint      T-Phase-3.PROD-1 · Sub-theme 5 · Q-LOCK-6 + Q-LOCK-7
 * @purpose     FinCore WIP voucher cascade · fires 2 journal vouchers per PO lifecycle:
 *              released→in_progress (WIP capitalization) and in_progress→completed (FG capitalization).
 * @disciplines D-127/128a 139 voucher type ABSOLUTE preserved · NEW voucher types live in
 *              non-fincore voucher type registry (production_wip_capitalization · production_fg_capitalization).
 * @[JWT]       Phase 2: POST /api/production/wip-cascade
 */

import type { ProductionOrder } from '@/types/production-order';
import type { Voucher, VoucherLedgerLine } from '@/types/voucher';
import { postVoucher, generateVoucherNo } from '@/lib/fincore-engine';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function buildJournalVoucher(
  po: ProductionOrder,
  voucherTypeId: 'production_wip_capitalization' | 'production_fg_capitalization',
  voucherTypeName: string,
  drLedger: { id: string; code: string; group: string; name: string },
  crLedger: { id: string; code: string; group: string; name: string },
  amount: number,
  narration: string,
): Voucher {
  const voucherId = newId('vch');
  const lines: VoucherLedgerLine[] = [
    {
      id: newId('vll'),
      ledger_id: drLedger.id,
      ledger_code: drLedger.code,
      ledger_group_code: drLedger.group,
      ledger_name: drLedger.name,
      dr_amount: amount,
      cr_amount: 0,
      narration,
    },
    {
      id: newId('vll'),
      ledger_id: crLedger.id,
      ledger_code: crLedger.code,
      ledger_group_code: crLedger.group,
      ledger_name: crLedger.name,
      dr_amount: 0,
      cr_amount: amount,
      narration,
    },
  ];

  return {
    id: voucherId,
    voucher_no: generateVoucherNo('JV', po.entity_id),
    voucher_type_id: voucherTypeId,
    voucher_type_name: voucherTypeName,
    base_voucher_type: 'Journal',
    entity_id: po.entity_id,
    date: new Date().toISOString().slice(0, 10),
    ledger_lines: lines,
    gross_amount: amount,
    total_discount: 0,
    total_taxable: amount,
    total_cgst: 0,
    total_sgst: 0,
    total_igst: 0,
    total_cess: 0,
    total_tax: 0,
    round_off: 0,
    net_amount: amount,
    tds_applicable: false,
    narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    ref_voucher_no: po.doc_no,
    status: 'draft',
  } as Voucher;
}

/**
 * Fire WIP capitalization voucher on released → in_progress.
 * DR Work-in-Progress · CR Raw Materials Inventory.
 * Amount source rationale (Q-LOCK-6): budget total at release · reservations
 * do not carry rate, so budget is the earliest reliable signal at PO start.
 */
export function fireProductionWIPCapitalization(po: ProductionOrder): string | null {
  const amount = po.cost_structure?.budget?.total ?? po.cost_structure?.master?.total ?? 0;
  if (amount <= 0) return null;
  try {
    const v = buildJournalVoucher(
      po,
      'production_wip_capitalization',
      'Production WIP Capitalization',
      { id: 'wip-suspense', code: 'WIP', group: 'current_assets', name: 'Work-in-Progress' },
      { id: 'rm-inventory', code: 'RM', group: 'current_assets', name: 'Raw Materials Inventory' },
      amount,
      `Production WIP capitalization · PO ${po.doc_no} started`,
    );
    postVoucher(v, po.entity_id);
    return v.id;
  } catch (e) {
    console.error('[production-wip-cascade] WIP capitalization failed', e);
    return null;
  }
}

/**
 * Fire FG capitalization voucher on in_progress → completed.
 * DR Finished Goods Inventory · CR Work-in-Progress.
 */
export function fireProductionFGCapitalization(po: ProductionOrder): string | null {
  const masterTotal = po.cost_structure?.master?.total ?? 0;
  const varianceAmt = po.cost_structure?.variance?.master_vs_actual?.total_amount ?? 0;
  const amount = masterTotal + varianceAmt;
  if (amount <= 0) return null;
  try {
    const v = buildJournalVoucher(
      po,
      'production_fg_capitalization',
      'Production FG Capitalization',
      { id: 'fg-inventory', code: 'FG', group: 'current_assets', name: 'Finished Goods Inventory' },
      { id: 'wip-suspense', code: 'WIP', group: 'current_assets', name: 'Work-in-Progress' },
      amount,
      `Production FG capitalization · PO ${po.doc_no} completed`,
    );
    postVoucher(v, po.entity_id);
    return v.id;
  } catch (e) {
    console.error('[production-wip-cascade] FG capitalization failed', e);
    return null;
  }
}
