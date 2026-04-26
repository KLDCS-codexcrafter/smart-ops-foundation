/**
 * sam-engine.ts — Pure commission calculation utility
 * No React. No localStorage. No side effects.
 * [JWT] All data passed in as parameters — no direct API calls.
 */

import Decimal from 'decimal.js';
import type { SAMPerson, SAMCommissionRateRow, SAMSlabRow } from '@/types/sam-person';
import type { SAMConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import type { VoucherInventoryLine, VoucherLedgerLine } from '@/types/voucher';
import { dAdd } from '@/lib/decimal-helpers';

// Decimal-safe arithmetic helpers (Z2a · prevents drift across multi-line aggregation)
// dAdd extracted to @/lib/decimal-helpers (T-H1.5-Z-Z2-prep-helpers Block 1)
const dPct = (base: number, pct: number): number =>
  new Decimal(base ?? 0).times(new Decimal(pct ?? 0)).dividedBy(100).toNumber();
const dMul = (a: number, b: number): number => new Decimal(a ?? 0).times(new Decimal(b ?? 0)).toNumber();

export interface CommissionLineBreakdown {
  item_name: string;
  qty: number;
  rate: number;
  taxable_value: number;
  commission_amount: number;
}

export interface CommissionResult {
  person_id: string;
  person_name: string;
  person_type: string;
  base_amount: number;
  commission_amount: number;
  rate_used: number;
  method: string;
  applicable_from: string;
  breakdown: CommissionLineBreakdown[];
}

export function getApplicableRate(
  rates: SAMCommissionRateRow[],
  invoiceDate: string
): SAMCommissionRateRow | null {
  const sorted = [...rates].sort((a, b) =>
    b.applicable_from.localeCompare(a.applicable_from)
  );
  return sorted.find(r => r.applicable_from <= invoiceDate) ?? null;
}

function getApplicableSlab(
  slabs: SAMSlabRow[],
  total: number
): SAMSlabRow | null {
  return slabs.find(s =>
    total >= s.from_amount &&
    (s.to_amount === null || total <= s.to_amount)
  ) ?? null;
}

function filterByPortfolio(
  lines: VoucherInventoryLine[],
  person: SAMPerson
): {
  lines: VoucherInventoryLine[];
  overrides: Map<string, number | null | undefined>;
} {
  if (person.portfolio.length === 0) {
    return { lines, overrides: new Map() };
  }
  const portfolioGroupIds = new Set(
    person.portfolio.map(p => p.stock_group_id)
  );
  const overrides = new Map<string, number | null | undefined>();
  person.portfolio.forEach(p =>
    overrides.set(p.stock_group_id, p.commission_override_pct)
  );
  const filtered = lines.filter(l => {
    const sgId = (l as unknown as Record<string, unknown>).stock_group_id as string | undefined;
    return !sgId || portfolioGroupIds.has(sgId);
  });
  return { lines: filtered, overrides };
}

export function calculatePersonCommission(
  person: SAMPerson,
  invLines: VoucherInventoryLine[],
  ledgerLines: VoucherLedgerLine[],
  ledgerFlags: Record<string, boolean>,
  invoiceDate: string,
  cfg: SAMConfig
): CommissionResult | null {
  const method = cfg.commissionCalcMethod;
  const breakdown: CommissionLineBreakdown[] = [];
  let commissionAmount = 0;
  let baseAmount = 0;
  let rateUsed = 0;
  let applicableFrom = '';

  const { lines: filteredLines, overrides } = filterByPortfolio(invLines, person);

  const ledgerAddon = ledgerLines
    .filter(l => ledgerFlags[l.ledger_id] === true)
    .reduce((s, l) => s + (l.dr_amount - l.cr_amount), 0);

  const serviceLines = ledgerLines.filter(l => {
    if (!ledgerFlags[l.ledger_id]) return false;
    const gc = l.ledger_group_code ?? '';
    return gc === 'DIRINC' || gc === 'INDINC';
  });
  const serviceBase = serviceLines
    .reduce((s, l) => s + (l.dr_amount - l.cr_amount), 0);

  if (method === 'slab_based') {
    const invoiceTotal =
      filteredLines.reduce((s, l) => s + l.taxable_value, 0) + ledgerAddon;
    const slab = getApplicableSlab(person.commission_slabs, invoiceTotal);
    if (!slab) return null;
    baseAmount = invoiceTotal;
    rateUsed = slab.rate_pct;
    commissionAmount = (invoiceTotal * slab.rate_pct) / 100;
    breakdown.push({
      item_name: 'Invoice total (slab)',
      qty: 1,
      rate: slab.rate_pct,
      taxable_value: invoiceTotal,
      commission_amount: commissionAmount,
    });
    return {
      person_id: person.id,
      person_name: person.display_name,
      person_type: person.person_type,
      base_amount: baseAmount,
      commission_amount: commissionAmount,
      rate_used: rateUsed,
      method,
      applicable_from: applicableFrom,
      breakdown,
    };
  }

  const rateRow = getApplicableRate(person.commission_rates, invoiceDate);
  if (!rateRow) return null;
  applicableFrom = rateRow.applicable_from;

  if (method === 'net_margin') {
    const marginPct = rateRow.margin_pct ?? 0;
    filteredLines.forEach(l => {
      const costPrice = 0;
      const margin = Decimal.max(
        0,
        new Decimal(l.taxable_value ?? 0).minus(new Decimal(l.qty ?? 0).times(costPrice)),
      ).toNumber();
      const lc = dPct(margin, marginPct);
      commissionAmount = dAdd(commissionAmount, lc);
      baseAmount = dAdd(baseAmount, margin);
      breakdown.push({
        item_name: l.item_name,
        qty: l.qty,
        rate: marginPct,
        taxable_value: margin,
        commission_amount: lc,
      });
    });
    rateUsed = marginPct;
  }

  if (method === 'item_amount' || method === 'both') {
    filteredLines.forEach(l => {
      const sgId = (l as unknown as Record<string, unknown>).stock_group_id as string | undefined;
      const overridePct = sgId ? overrides.get(sgId) : undefined;
      const pct = (overridePct != null ? overridePct : rateRow.item_pct) ?? 0;
      const lineBase = l.taxable_value;
      const lc = dPct(lineBase, pct);
      commissionAmount = dAdd(commissionAmount, lc);
      baseAmount = dAdd(baseAmount, lineBase);
      rateUsed = pct;
      breakdown.push({
        item_name: l.item_name,
        qty: l.qty,
        rate: pct,
        taxable_value: lineBase,
        commission_amount: lc,
      });
    });
    const nonServiceAddon = new Decimal(ledgerAddon ?? 0).minus(new Decimal(serviceBase ?? 0)).toNumber();
    if (nonServiceAddon !== 0) {
      const pct = rateRow.item_pct ?? 0;
      const lc = dPct(nonServiceAddon, pct);
      commissionAmount = dAdd(commissionAmount, lc);
      baseAmount = dAdd(baseAmount, nonServiceAddon);
      breakdown.push({
        item_name: 'Ledger absorption (AllowCommAssVal)',
        qty: 1,
        rate: pct,
        taxable_value: nonServiceAddon,
        commission_amount: lc,
      });
    }
  }

  if (method === 'item_qty' || method === 'both') {
    filteredLines.forEach(l => {
      const amtPerUnit = rateRow.item_amt_per_unit ?? 0;
      const lc = dMul(l.qty, amtPerUnit);
      if (method === 'item_qty') {
        commissionAmount = dAdd(commissionAmount, lc);
        baseAmount = dAdd(baseAmount, l.qty);
        rateUsed = amtPerUnit;
        breakdown.push({
          item_name: l.item_name,
          qty: l.qty,
          rate: amtPerUnit,
          taxable_value: l.taxable_value,
          commission_amount: lc,
        });
      } else {
        commissionAmount = dAdd(commissionAmount, lc);
      }
    });
  }

  if (cfg.enableCommissionOnService && serviceBase !== 0) {
    const svcPct = rateRow.service_pct ?? 0;
    const svcCommission = dPct(serviceBase, svcPct);
    commissionAmount = dAdd(commissionAmount, svcCommission);
    baseAmount += serviceBase;
    breakdown.push({
      item_name: 'Service income (AllowCommAssVal + Income group)',
      qty: 1,
      rate: svcPct,
      taxable_value: serviceBase,
      commission_amount: svcCommission,
    });
  }

  if (commissionAmount === 0 && baseAmount === 0) return null;

  return {
    person_id: person.id,
    person_name: person.display_name,
    person_type: person.person_type,
    base_amount: baseAmount,
    commission_amount: commissionAmount,
    rate_used: rateUsed,
    method,
    applicable_from: applicableFrom,
    breakdown,
  };
}

export function calculateInvoiceCommission(
  persons: SAMPerson[],
  invLines: VoucherInventoryLine[],
  ledgerLines: VoucherLedgerLine[],
  ledgerFlags: Record<string, boolean>,
  invoiceDate: string,
  cfg: SAMConfig
): CommissionResult[] {
  const results: CommissionResult[] = [];

  persons.forEach(person => {
    if (!person.is_active) return;

    if (
      person.person_type === 'receiver' &&
      person.primary_agent_id &&
      person.receiver_share_pct
    ) {
      const primaryAgent = persons.find(p => p.id === person.primary_agent_id);
      if (primaryAgent) {
        const agentResult = calculatePersonCommission(
          primaryAgent, invLines, ledgerLines, ledgerFlags, invoiceDate, cfg
        );
        if (agentResult) {
          const receiverAmt = dPct(agentResult.commission_amount, person.receiver_share_pct);
          results.push({
            person_id: person.id,
            person_name: person.display_name,
            person_type: 'receiver',
            base_amount: agentResult.commission_amount,
            commission_amount: receiverAmt,
            rate_used: person.receiver_share_pct,
            method: 'receiver_share',
            applicable_from: agentResult.applicable_from,
            breakdown: [{
              item_name: `${person.receiver_share_pct}% of ${primaryAgent.display_name} commission`,
              qty: 1,
              rate: person.receiver_share_pct,
              taxable_value: agentResult.commission_amount,
              commission_amount: receiverAmt,
            }],
          });
        }
      }
      return;
    }

    const result = calculatePersonCommission(
      person, invLines, ledgerLines, ledgerFlags, invoiceDate, cfg
    );
    if (result) results.push(result);
  });

  return results;
}
