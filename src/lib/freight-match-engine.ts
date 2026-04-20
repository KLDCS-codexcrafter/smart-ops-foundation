/**
 * freight-match-engine.ts — 3-way match: LR × Expected × Declared
 * Pure. Applies tolerance hierarchy + payer model detection.
 */

import type { Voucher } from '@/types/voucher';
import type {
  TransporterInvoice, TransporterInvoiceLine, PayerModel, WorkflowMode,
} from '@/types/transporter-invoice';
import type {
  MatchLine, MatchStatus, ToleranceConfig, TenantToleranceDefault,
} from '@/types/freight-reconciliation';
import type { TransporterRateCard } from '@/types/transporter-rate';
import { computeExpectedFreight } from './freight-calc-engine';

export interface PayerCustomerLite {
  id: string;
  isHeadOffice?: boolean;
  freightTerm?: string;
}

export interface MatchContext {
  invoice: TransporterInvoice;
  dln_vouchers: Voucher[];
  rate_cards: TransporterRateCard[];
  tenant_tolerance: TenantToleranceDefault;
  customer_master?: PayerCustomerLite[];
}

/** Resolve tolerance with invoice > rate_card > tenant hierarchy. */
export function resolveTolerance(
  invoice: TransporterInvoice, rateCard: TransporterRateCard | null,
  tenant: TenantToleranceDefault,
): ToleranceConfig {
  if (invoice.tolerance_pct != null && invoice.tolerance_amount != null) {
    return {
      pct: invoice.tolerance_pct,
      amount_paise: invoice.tolerance_amount,
      source: 'invoice',
    };
  }
  // Rate-card tolerance deferred to 15c-3.
  void rateCard;
  return {
    pct: tenant.tolerance_pct,
    amount_paise: tenant.tolerance_amount_paise,
    source: 'tenant_default',
  };
}

/** Determine match status from expected, declared, and tolerance. */
export function classifyMatch(
  expected: number, declared: number, tolerance: ToleranceConfig,
): MatchStatus {
  const variance = declared - expected;
  const absVariance = Math.abs(variance);
  const varPct = expected > 0 ? (absVariance / expected) * 100 : 0;

  if (absVariance < 0.01) return 'exact_match';

  const exceedsPct = varPct > tolerance.pct;
  const exceedsAmount = absVariance * 100 > tolerance.amount_paise;
  if (!exceedsPct || !exceedsAmount) return 'within_tolerance';

  return variance > 0 ? 'over_billed' : 'under_billed';
}

/** Decide auto-action based on workflow mode + match status. */
export function autoDecideAction(
  status: MatchStatus, mode: WorkflowMode,
): 'approve' | 'flag' | 'dispute' | 'none' {
  if (status === 'exact_match' || status === 'within_tolerance') {
    if (mode === 'auto_approve') return 'approve';
    return 'flag';
  }
  if (mode === 'dispute_ticket') return 'dispute';
  return 'flag';
}

/** Detect payer model from DLN voucher. */
export function detectPayerModel(
  dln: Voucher | null,
  customerMaster: PayerCustomerLite[],
): PayerModel {
  if (!dln) return 'manufacturer';
  const party = customerMaster.find(c => c.id === dln.party_id);
  if (party?.isHeadOffice) return 'third_party';
  const freightTerm = (party?.freightTerm ?? '').toLowerCase();
  if (freightTerm.includes('cod') || freightTerm.includes('to_pay')) return 'buyer';
  if (freightTerm.includes('pass') || freightTerm.includes('reimburs')) return 'pass_through';
  return 'manufacturer';
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/** Match a single invoice line against DLN + rate card -> MatchLine */
export function matchInvoiceLine(
  line: TransporterInvoiceLine,
  ctx: MatchContext,
): MatchLine {
  const now = new Date().toISOString();
  const customers = ctx.customer_master ?? [];

  const dln = ctx.dln_vouchers.find(v =>
    v.lr_no === line.lr_no && v.base_voucher_type === 'Delivery Note',
  );

  if (!dln) {
    return {
      id: genId('mli'),
      entity_id: ctx.invoice.entity_id,
      invoice_id: ctx.invoice.id,
      invoice_line_id: line.id,
      lr_no: line.lr_no,
      dln_voucher_id: null, dln_voucher_no: null,
      expected_amount: 0,
      declared_amount: line.total,
      variance_amount: line.total,
      variance_pct: 100,
      status: 'ghost_lr',
      tolerance_used: {
        pct: ctx.tenant_tolerance.tolerance_pct,
        amount_paise: ctx.tenant_tolerance.tolerance_amount_paise,
        source: 'tenant_default',
      },
      payer_model: 'manufacturer',
      auto_decision: 'dispute',
      computed_at: now,
    };
  }

  const card = ctx.rate_cards.find(c =>
    c.logistic_id === ctx.invoice.logistic_id &&
    new Date(c.effective_from).getTime() <= new Date(dln.date).getTime() &&
    (c.effective_to === null || new Date(c.effective_to).getTime() >= new Date(dln.date).getTime()),
  ) ?? null;

  const tolerance = resolveTolerance(ctx.invoice, card, ctx.tenant_tolerance);
  const payerModel = detectPayerModel(dln, customers);

  const originState = dln.supplier_state_code ?? 'Maharashtra';
  const destState = dln.customer_state_code ?? dln.place_of_supply ?? originState;

  const calcResult = computeExpectedFreight({
    logistic_id: ctx.invoice.logistic_id,
    dln_date: dln.date,
    mode: 'surface',
    origin_state: originState,
    destination_state: destState,
    actual_weight_kg: line.transporter_declared_weight_kg,
    invoice_value_paise: dln.net_amount * 100,
    is_cod: false,
    all_rate_cards: ctx.rate_cards,
  });

  if (calcResult.ok === false) {
    const failStatus: MatchStatus =
      calcResult.reason === 'no_rate_card' ? 'missing_rate_card' :
      calcResult.reason === 'invalid_weight' ? 'missing_weight' :
      'rate_calc_failed';
    return {
      id: genId('mli'),
      entity_id: ctx.invoice.entity_id,
      invoice_id: ctx.invoice.id,
      invoice_line_id: line.id,
      lr_no: line.lr_no,
      dln_voucher_id: dln.id, dln_voucher_no: dln.voucher_no,
      expected_amount: 0,
      declared_amount: line.total,
      variance_amount: line.total,
      variance_pct: 0,
      status: failStatus,
      tolerance_used: tolerance,
      payer_model: payerModel,
      auto_decision: 'flag',
      computed_at: now,
    };
  }
    return {
      id: genId('mli'),
      entity_id: ctx.invoice.entity_id,
      invoice_id: ctx.invoice.id,
      invoice_line_id: line.id,
      lr_no: line.lr_no,
      dln_voucher_id: dln.id, dln_voucher_no: dln.voucher_no,
      expected_amount: 0,
      declared_amount: line.total,
      variance_amount: line.total,
      variance_pct: 0,
      status: failStatus,
      tolerance_used: tolerance,
      payer_model: payerModel,
      auto_decision: 'flag',
      computed_at: now,
    };
  }

  const expected = calcResult.breakdown.grand_total;
  const declared = line.total;
  const variance = declared - expected;
  const variancePct = expected > 0 ? (variance / expected) * 100 : 0;
  const status = classifyMatch(expected, declared, tolerance);
  const auto = autoDecideAction(status, ctx.invoice.workflow_mode);

  return {
    id: genId('mli'),
    entity_id: ctx.invoice.entity_id,
    invoice_id: ctx.invoice.id,
    invoice_line_id: line.id,
    lr_no: line.lr_no,
    dln_voucher_id: dln.id, dln_voucher_no: dln.voucher_no,
    expected_amount: expected,
    declared_amount: declared,
    variance_amount: variance,
    variance_pct: variancePct,
    status,
    tolerance_used: tolerance,
    payer_model: payerModel,
    auto_decision: auto,
    computed_at: now,
  };
}

/** Run reconciliation for an entire invoice -> array of MatchLine */
export function reconcileInvoice(ctx: MatchContext): MatchLine[] {
  return ctx.invoice.lines.map(line => matchInvoiceLine(line, ctx));
}

/** Summary stats for an invoice after reconciliation. */
export interface ReconciliationSummary {
  total_lines: number;
  exact_matches: number;
  within_tolerance: number;
  over_billed: number;
  under_billed: number;
  ghost_lrs: number;
  errors: number;
  total_declared: number;
  total_expected: number;
  total_variance: number;
  pct_auto_approved: number;
  pct_flagged: number;
  pct_disputed: number;
}

export function summarizeMatches(matches: MatchLine[]): ReconciliationSummary {
  const total = matches.length;
  const counts = {
    exact: matches.filter(m => m.status === 'exact_match').length,
    within: matches.filter(m => m.status === 'within_tolerance').length,
    over: matches.filter(m => m.status === 'over_billed').length,
    under: matches.filter(m => m.status === 'under_billed').length,
    ghost: matches.filter(m => m.status === 'ghost_lr').length,
    errors: matches.filter(m =>
      m.status === 'missing_rate_card' || m.status === 'missing_weight' ||
      m.status === 'rate_calc_failed',
    ).length,
  };
  const declared = matches.reduce((s, m) => s + m.declared_amount, 0);
  const expected = matches.reduce((s, m) => s + m.expected_amount, 0);
  const actions = {
    approved: matches.filter(m => m.auto_decision === 'approve').length,
    flagged: matches.filter(m => m.auto_decision === 'flag').length,
    disputed: matches.filter(m => m.auto_decision === 'dispute').length,
  };
  return {
    total_lines: total,
    exact_matches: counts.exact,
    within_tolerance: counts.within,
    over_billed: counts.over,
    under_billed: counts.under,
    ghost_lrs: counts.ghost,
    errors: counts.errors,
    total_declared: declared,
    total_expected: expected,
    total_variance: declared - expected,
    pct_auto_approved: total > 0 ? (actions.approved / total) * 100 : 0,
    pct_flagged: total > 0 ? (actions.flagged / total) * 100 : 0,
    pct_disputed: total > 0 ? (actions.disputed / total) * 100 : 0,
  };
}
