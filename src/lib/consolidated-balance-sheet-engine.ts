/**
 * @file        src/lib/consolidated-balance-sheet-engine.ts
 * @sibling     NEW @ Sprint 111 · T-Phase-6.C.2.3 · Arc 3 · Pillar C.2 (Group Consolidation)
 * @realizes    Schedule III consolidated Balance Sheet from S109/S110 consolidated TB
 *              + NCI (Ind AS 110 minority interest) + Goodwill (Ind AS 103 + Ind AS 36 impairment flag).
 * @fr-44       Reads S110 `consolidateWithTranslation` (or S109 `consolidate` fallback) — NEVER re-rolls,
 *              NEVER re-translates, NEVER re-eliminates. Equity recognised as L1==='CE' only +
 *              FCTR-OCI synthetic (S110) + NCI synthetic (this engine) — §L-noted: SR is an L2 code
 *              whose l1Code is 'CE', not a separate L1; reserves live under CE-PP.
 * @reads-from  fx-translation-engine (consolidateWithTranslation) ·
 *              group-consolidation-engine (consolidate · computeEntityTrialBalance · type re-exports) ·
 *              intercompany-group-structure-engine (listGroupStructure · ownership_pct) ·
 *              intercompany-transaction-engine (listICTransactions · capital_infusion IC-INVEST) ·
 *              reportUtils (getL1Code · getL2Code — mirror of BalanceSheet.tsx classification)
 * @scope-wall  DP-A3-9 · BS + NCI + Goodwill ONLY.
 *              NO Cash Flow (lives in consolidated-cash-flow-engine — sibling) ·
 *              NO disclosure / notes (S112) · NO XBRL (Arc 4) · NO OOB (Arc 4).
 *              Scope-wall test asserts none of those exports exist here.
 * @sprint      T-Phase-6.C.2.3 · Sprint 111 · Arc 3 · Block 2 + Block 3
 * [JWT] Phase 8: GET /api/consolidation/balance-sheet?fy=:fy · GET /api/consolidation/nci?fy=:fy
 *               GET /api/consolidation/goodwill?fy=:fy
 */
import {
  consolidate,
  computeEntityTrialBalance,
  type ConsolidatedTrialBalance,
  type TBLine,
} from '@/lib/group-consolidation-engine';
import { consolidateWithTranslation } from '@/lib/fx-translation-engine';
import {
  listGroupStructure,
  type ConsolidationMethod,
} from '@/lib/intercompany-group-structure-engine';
import { listICTransactions } from '@/lib/intercompany-transaction-engine';
import { getL1Code } from '@/pages/erp/fincore/reports/reportUtils';
import { dAdd, dSub, dSum, dPct, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ── Public READS_FROM (FR-44 self-declaration) ─────────────────────────────
export const READS_FROM = {
  engines: [
    'fx-translation-engine',
    'group-consolidation-engine',
    'intercompany-group-structure-engine',
    'intercompany-transaction-engine',
    'reportUtils',
  ],
  storage_keys: [
    'erp_consolidated_bs_<fy>',  // side-store: persisted runs per FY
    'erp_goodwill_runs_<fy>',    // side-store: goodwill snapshots
  ],
} as const;

// ── Types ─────────────────────────────────────────────────────────────────

export type BSL1 = 'A' | 'L' | 'CE';

export interface BSGroupLine {
  /** L1 prefix for this aggregated bucket. */
  l1: BSL1;
  ledger_group_code: string;
  /** Net amount: A → debit−credit; L/CE → credit−debit (Schedule III nature). */
  amount: number;
}

export interface ConsolidatedBalanceSheet {
  fy: string;
  entity_count: number;
  assets: BSGroupLine[];
  liabilities: BSGroupLine[];
  equity: BSGroupLine[];
  asset_total: number;
  liability_total: number;
  equity_total: number;
  nci_total: number;
  goodwill_total: number;
  /** assets ≈ liabilities + equity + nci + goodwill — Schedule III balance check. */
  balanced: boolean;
  generated_at: string;
}

export interface NCIEntry {
  entity_id: string;
  ownership_pct: number;
  method: ConsolidationMethod;
  /** Sub net assets (Σ A − Σ L) at reporting date. */
  net_assets: number;
  /** (100 − ownership_pct)% × net_assets. */
  nci_amount: number;
}

export interface GoodwillAcquisitionInput {
  entity_id: string;
  /** Sub's net assets at the historical acquisition date (rupees, parent presentation currency). */
  net_assets_at_acquisition: number;
}

export interface GoodwillEntry {
  entity_id: string;
  ownership_pct: number;
  /** Sum of IC-INVEST capital_infusion amounts where this entity is the to_entity (acquiree). */
  consideration: number;
  /** ownership_pct × (acquisition net assets if supplied, else current net assets — §L-flagged). */
  acquired_share_of_net_assets: number;
  /** consideration − acquired_share. Positive → goodwill; negative → capital reserve (Ind AS 103). */
  goodwill: number;
  /** Ind AS 103 sign convention. */
  classification: 'goodwill' | 'capital_reserve';
  /** Ind AS 36 impairment FLAG (not a DCF) — set when goodwill > 0 and a heuristic trigger fires. */
  impairment_flag: boolean;
  /** §L-flag: true when current-net-assets fallback was used (no acquisition input supplied). */
  acquisition_fallback_used: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function bsKey(fy: string): string { return `erp_consolidated_bs_${fy}`; }
function gwKey(fy: string): string { return `erp_goodwill_runs_${fy}`; }

/** Net A nature = debit − credit; net L/CE nature = credit − debit. */
function natureNet(line: TBLine, l1: BSL1): number {
  if (l1 === 'A') return dSub(line.debit, line.credit);
  return dSub(line.credit, line.debit);
}

/** Compute a single entity's net assets (Σ A − Σ L) from its TB. */
export function computeEntityNetAssets(entity_id: string, fy: string): number {
  const tb = computeEntityTrialBalance(entity_id, fy);
  let assets = 0;
  let liabilities = 0;
  for (const l of tb.lines) {
    const l1 = getL1Code(l.ledger_group_code);
    if (l1 === 'A') assets = dAdd(assets, dSub(l.debit, l.credit));
    else if (l1 === 'L') liabilities = dAdd(liabilities, dSub(l.credit, l.debit));
  }
  return round2(dSub(assets, liabilities));
}

// ── NCI (Ind AS 110) ──────────────────────────────────────────────────────

/**
 * Non-Controlling Interest per Ind AS 110.
 * For every full-method sub with ownership_pct < 100:
 *   NCI = (100 − ownership_pct)% × sub net assets (Σ A − Σ L).
 * Equity-method and proportional subs return 0 NCI (their math already trims for the parent share).
 */
export function computeNCI(input: { fy: string }): NCIEntry[] {
  const nodes = listGroupStructure();
  return nodes.map((n) => {
    const net_assets = computeEntityNetAssets(n.entity_id, input.fy);
    let nci_amount = 0;
    if (n.consolidation_method === 'full' && n.ownership_pct < 100) {
      nci_amount = round2(dPct(net_assets, 100 - n.ownership_pct));
    }
    return {
      entity_id: n.entity_id,
      ownership_pct: n.ownership_pct,
      method: n.consolidation_method,
      net_assets,
      nci_amount,
    };
  });
}

// ── Goodwill (Ind AS 103) + Impairment FLAG (Ind AS 36) ───────────────────

/**
 * Goodwill per Ind AS 103. Consideration = sum of IC-INVEST `capital_infusion` amounts
 * where the sub is the to_entity (acquiree). Acquired-share basis comes from the optional
 * `acquisition` map (recommended); when omitted we fall back to current net assets and
 * §L-flag the approximation (`acquisition_fallback_used: true`).
 *
 * Impairment is FLAG-ONLY (Ind AS 36 surface indicator) — NOT a DCF. We flag a sub when
 * positive goodwill exists AND current net_assets < acquired share (book proxy for the
 * "indication of impairment" trigger). Real DCF lives outside this engine (S112+).
 */
export function computeGoodwill(input: {
  fy: string;
  acquisition?: GoodwillAcquisitionInput[];
}): GoodwillEntry[] {
  const nodes = listGroupStructure();
  const txns = listICTransactions().filter(
    (t) => t.txn_type === 'capital_infusion' && (t.status === 'posted' || t.status === 'settled'),
  );
  const acqMap = new Map<string, number>();
  for (const a of input.acquisition ?? []) acqMap.set(a.entity_id, a.net_assets_at_acquisition);

  const out: GoodwillEntry[] = [];
  for (const n of nodes) {
    if (n.ownership_pct === 0) continue;
    const consideration = round2(
      dSum(txns.filter((t) => t.to_entity === n.entity_id), (t) => t.amount),
    );
    if (consideration <= 0) continue;
    const currentNetAssets = computeEntityNetAssets(n.entity_id, input.fy);
    const acq = acqMap.get(n.entity_id);
    const fallback = acq == null;
    const basis = fallback ? currentNetAssets : (acq as number);
    const acquired_share = round2(dPct(basis, n.ownership_pct));
    const goodwill = round2(dSub(consideration, acquired_share));
    const classification: GoodwillEntry['classification'] = goodwill >= 0 ? 'goodwill' : 'capital_reserve';
    // Ind AS 36 surface trigger (flag-only): positive goodwill AND current net assets
    // below acquired share → indication of impairment to investigate.
    const impairment_flag = goodwill > 0 && currentNetAssets < acquired_share;
    out.push({
      entity_id: n.entity_id,
      ownership_pct: n.ownership_pct,
      consideration,
      acquired_share_of_net_assets: acquired_share,
      goodwill,
      classification,
      impairment_flag,
      acquisition_fallback_used: fallback,
    });
  }

  try {
    // [JWT] POST /api/consolidation/goodwill
    localStorage.setItem(gwKey(input.fy), JSON.stringify(out));
  } catch { /* quota silent */ }

  return out;
}

// ── Consolidated Balance Sheet (Schedule III) ─────────────────────────────

/**
 * Build the consolidated Balance Sheet from the FX-translated consolidated TB.
 *
 * - Equity is L1==='CE' ONLY (CE-SF · CE-PP · SR-under-CE) + FCTR-OCI synthetic (S110)
 *   + NCI synthetic (this engine). §L: L1 'SR' does NOT exist in finframe-seed — SR is
 *   an L2 whose l1Code is 'CE'. Reserves are recognised under CE without a separate L1.
 * - Goodwill is reported as an Asset addition (Schedule III non-current intangible) and
 *   netted into equity for the balance check via the NCI/Goodwill synthetic adjustment.
 */
export function buildBalanceSheet(input: {
  fy: string;
  acquisition?: GoodwillAcquisitionInput[];
}): ConsolidatedBalanceSheet {
  const tb: ConsolidatedTrialBalance = (() => {
    try { return consolidateWithTranslation({ fy: input.fy }); }
    catch { return consolidate({ fy: input.fy }); }
  })();

  const assets: BSGroupLine[] = [];
  const liabilities: BSGroupLine[] = [];
  const equity: BSGroupLine[] = [];

  for (const l of tb.lines) {
    const code = l.ledger_group_code;
    const l1 = getL1Code(code) as BSL1 | '';
    if (l1 === 'A') {
      assets.push({ l1, ledger_group_code: code, amount: round2(natureNet(l, 'A')) });
    } else if (l1 === 'L') {
      liabilities.push({ l1, ledger_group_code: code, amount: round2(natureNet(l, 'L')) });
    } else if (l1 === 'CE') {
      equity.push({ l1, ledger_group_code: code, amount: round2(natureNet(l, 'CE')) });
    } else if (code === 'FCTR-OCI') {
      // S110 synthetic recognised under equity (OCI bucket).
      equity.push({ l1: 'CE', ledger_group_code: code, amount: round2(natureNet(l, 'CE')) });
    }
    // P&L lines (I/E) flow into retained earnings — captured via S109's consolidated P&L,
    // not re-added here (this engine reports the BS view only).
  }

  const ncis = computeNCI({ fy: input.fy });
  const nci_total = round2(dSum(ncis, (n) => n.nci_amount));

  const goodwill = computeGoodwill({ fy: input.fy, acquisition: input.acquisition });
  const goodwill_total = round2(dSum(goodwill, (g) => g.goodwill));

  const asset_total = round2(dAdd(dSum(assets, (a) => a.amount), goodwill_total));
  const liability_total = round2(dSum(liabilities, (l) => l.amount));
  const equity_total = round2(dSum(equity, (e) => e.amount));

  // Schedule III balance: A + Goodwill ≈ L + Equity + NCI.
  const rhs = round2(dAdd(dAdd(liability_total, equity_total), nci_total));
  const balanced = Math.abs(dSub(asset_total, rhs)) < 1;

  const result: ConsolidatedBalanceSheet = {
    fy: input.fy,
    entity_count: tb.entity_count,
    assets,
    liabilities,
    equity,
    asset_total,
    liability_total,
    equity_total,
    nci_total,
    goodwill_total,
    balanced,
    generated_at: new Date().toISOString(),
  };

  try {
    // [JWT] POST /api/consolidation/balance-sheet
    localStorage.setItem(bsKey(input.fy), JSON.stringify(result));
  } catch { /* quota silent */ }

  logAudit({
    entityCode: 'GROUP',
    action: 'create',
    entityType: 'consolidated_balance_sheet_run',
    recordId: `cbs-${input.fy}-${Date.now()}`,
    recordLabel: `Consolidated BS · FY ${input.fy} · A ₹${asset_total.toFixed(2)} · L ₹${liability_total.toFixed(2)} · E ₹${equity_total.toFixed(2)} · NCI ₹${nci_total.toFixed(2)} · GW ₹${goodwill_total.toFixed(2)} · ${balanced ? 'balanced' : 'UNBALANCED'}`,
    beforeState: null,
    afterState: {
      fy: input.fy,
      entity_count: tb.entity_count,
      asset_total, liability_total, equity_total,
      nci_total, goodwill_total, balanced,
    } as Record<string, unknown>,
    sourceModule: 'consolidated-balance-sheet-engine',
  });

  return result;
}

/** Read the last persisted consolidated BS for an FY (page consumes this). */
export function loadConsolidatedBalanceSheet(fy: string): ConsolidatedBalanceSheet | null {
  try {
    // [JWT] GET /api/consolidation/balance-sheet
    const raw = localStorage.getItem(bsKey(fy));
    return raw ? (JSON.parse(raw) as ConsolidatedBalanceSheet) : null;
  } catch { return null; }
}
