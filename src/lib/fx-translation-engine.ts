/**
 * @file        src/lib/fx-translation-engine.ts
 * @sibling     NEW @ Sprint 110 · T-Phase-6.C.2.2 · Arc 3 · Pillar C.2 (Group Consolidation)
 * @ind-as      21 / IAS 21 · Current Rate (Closing Rate) method for foreign-subsidiary translation.
 * @fr-44       DISTINCT from fx-what-if-engine (a scenario SIMULATOR). This engine performs ACTUAL
 *              translation of real foreign-sub balances into the presentation currency (INR),
 *              recognising the residual exchange difference in FCTR/OCI. It REUSES dual-rate-engine
 *              (`loadForexRates`), the currency master and idea-1 (`getMasterAsOf`) for rate data
 *              and DOES NOT touch, wrap, import or duplicate `fx-what-if-engine`. 0-DIFF on it.
 * @reads-from  dual-rate-engine (loadForexRates) · currency master (world-currencies) ·
 *              idea-1-time-travel-masters-engine (getMasterAsOf · historical rate) ·
 *              group-consolidation-engine (computeEntityTrialBalance · consolidate)
 * @scope-wall  DP-A3-9 · TRANSLATION ONLY.
 *              NO Balance Sheet assembly (S111) · NO Cash Flow (S111) · NO NCI/Goodwill (S111) ·
 *              NO disclosure (S112) · NO scenario simulation (fx-what-if owns that · 0-DIFF).
 *              The scope-wall test asserts none of those export shapes exist on this module.
 * @s110-waiver `group-consolidation-engine.consolidate` gained ONE optional
 *              `entityTBProvider` param (default = today's behaviour). This file uses that hook
 *              to feed INR-translated TBs without duplicating S109's rollup. See §L close-summary.
 * @sprint      T-Phase-6.C.2.2 · Sprint 110 · Arc 3 · Block 2 + Block 3
 * [JWT] Phase 8: rate data flows in from /api/finance/forex-rates · /api/master-versions
 */
import { loadForexRates } from '@/lib/dual-rate-engine';
import type { ForexRate } from '@/types/currency';
import { getMasterAsOf } from '@/lib/idea-1-time-travel-masters-engine';
import {
  computeEntityTrialBalance,
  consolidate as s109Consolidate,
  type EntityTrialBalance,
  type ConsolidatedTrialBalance,
  type TBLine,
  type Classification,
} from '@/lib/group-consolidation-engine';
import { getL1Code } from '@/pages/erp/fincore/reports/reportUtils';
import { dAdd, dSub, dMul, dSum, round2 } from '@/lib/decimal-helpers';
import { logAudit } from '@/lib/audit-trail-engine';

// ── Public READS_FROM (FR-93 self-declaration) ────────────────────────────
export const READS_FROM = {
  engines: [
    'dual-rate-engine',
    'currency-master (world-currencies)',
    'idea-1-time-travel-masters-engine',
    'group-consolidation-engine',
  ],
  storage_keys: [
    'erp_GROUP_forex_rates',              // dual-rate (rate source entity)
    'erp_entity_functional_currencies',   // side-store: entity_id → ISO
    'erp_master_versions_ledger_forex_<iso>', // idea-1 historical chain
    'erp_fx_translations_<fy>',           // run log (side-store)
  ],
} as const;

/** The rate-source entity convention. Centralised rates seeded under this code. */
export const FX_RATE_SOURCE_ENTITY = 'GROUP';

/** Side-store: entity_id → functional ISO. Default 'INR'. */
const FUNCTIONAL_KEY = 'erp_entity_functional_currencies';
/** Side-store: persisted translation runs per FY (for listing in the page). */
const fxTranslationsKey = (fy: string): string => `erp_fx_translations_${fy}`;

// ── Types ─────────────────────────────────────────────────────────────────

export type FXRateType = 'closing' | 'average' | 'historical';

export interface FXRateSet {
  fy: string;
  from_currency: string;
  to_currency: 'INR';
  closing_rate: number;    // balance-sheet items (assets/liabilities)
  average_rate: number;    // P&L items (income/expense)
  historical_rate: number; // equity / share capital
  source: {
    closing: 'forex-master' | 'fallback';
    average: 'forex-master' | 'fallback';
    historical: 'idea-1' | 'fallback';
  };
}

export type TranslatedClassification = 'pnl' | 'bs' | 'equity';

export interface TranslatedLine {
  ledger_group_code: string;
  classification: TranslatedClassification;
  foreign_amount_debit: number;
  foreign_amount_credit: number;
  rate_applied: number;
  rate_type: FXRateType;
  inr_debit: number;
  inr_credit: number;
}

export interface FXTranslationResult {
  entity_id: string;
  fy: string;
  from_currency: string;
  to_currency: 'INR';
  rate_set: FXRateSet;
  lines: TranslatedLine[];
  fctr_amount: number;        // residual → OCI (positive = gain, negative = loss)
  balanced_pre_fctr: boolean; // whether the translated TB balances before FCTR
  translated_at: string;
}

// ── Functional currency side-store ────────────────────────────────────────

/** Read the entity→functional-currency map (defaults to {}). */
export function loadFunctionalCurrencyMap(): Record<string, string> {
  try {
    // [JWT] GET /api/foundation/entities/functional-currency
    const raw = localStorage.getItem(FUNCTIONAL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Get an entity's functional currency. Defaults to 'INR' when unset. */
export function getFunctionalCurrency(entity_id: string): string {
  const map = loadFunctionalCurrencyMap();
  const iso = map[entity_id];
  return iso && iso.length > 0 ? iso.toUpperCase() : 'INR';
}

/** Set/override an entity's functional currency (UI / tests). */
export function setFunctionalCurrency(entity_id: string, iso: string): void {
  const map = loadFunctionalCurrencyMap();
  map[entity_id] = iso.toUpperCase();
  // [JWT] PUT /api/foundation/entities/:id/functional-currency
  localStorage.setItem(FUNCTIONAL_KEY, JSON.stringify(map));
}

// ── Rate resolution (REUSES dual-rate + idea-1; NEVER fx-what-if) ─────────

/** Parse FY 'YYYY-YY' → inclusive [startISO, endISO] (Apr-Mar window). */
function fyWindow(fy: string): { start: string; end: string } {
  const startYear = Number.parseInt(fy.slice(0, 4), 10);
  if (Number.isNaN(startYear)) {
    const y = new Date().getFullYear();
    return { start: `${y}-04-01`, end: `${y + 1}-03-31` };
  }
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
}

/** Latest ForexRate whose applicable_from ≤ asOf, matching currency_id == iso. */
function latestRateOnOrBefore(rates: ForexRate[], iso: string, asOf: string): ForexRate | null {
  const matches = rates
    .filter((r) => r.currency_id === iso && r.applicable_from.slice(0, 10) <= asOf)
    .sort((a, b) => b.applicable_from.localeCompare(a.applicable_from));
  return matches[0] ?? null;
}

/** Pick a numeric closing-style rate, with documented fallback order. */
function pickClosingRate(r: ForexRate | null): number {
  if (!r) return 1;
  // Closing → standard if set, else buying, else selling, else last_voucher.
  return (
    r.standard_rate
    ?? r.buying_rate
    ?? r.selling_rate
    ?? r.last_voucher_rate
    ?? 1
  );
}

/** Period average rate: mean of selling+buying for the period's latest applicable rate. */
function pickAverageRate(r: ForexRate | null): number {
  if (!r) return 1;
  const s = r.selling_rate;
  const b = r.buying_rate;
  if (s != null && b != null) return round2(dMul(dAdd(s, b), 0.5));
  return r.standard_rate ?? s ?? b ?? r.last_voucher_rate ?? 1;
}

/** Historical rate via idea-1 getMasterAsOf (key `forex_<iso>`, master_type 'ledger' bucket). */
function pickHistoricalRate(iso: string, asOf: string): { rate: number; source: 'idea-1' | 'fallback' } {
  // S110 reuses idea-1's effective-dated version chain to keep historical
  // rates auditable. Key convention: `forex_<ISO>`. Snapshot shape:
  // { closing_rate, buying_rate, selling_rate, standard_rate }.
  const v = getMasterAsOf({ master_type: 'ledger', master_key: `forex_${iso}`, as_of_date: asOf });
  if (v && typeof v.snapshot === 'object' && v.snapshot != null) {
    const snap = v.snapshot as Record<string, unknown>;
    const candidate = [snap.standard_rate, snap.buying_rate, snap.closing_rate, snap.selling_rate]
      .find((n) => typeof n === 'number' && (n as number) > 0);
    if (typeof candidate === 'number') return { rate: candidate, source: 'idea-1' };
  }
  return { rate: 0, source: 'fallback' };
}

/** Resolve the three rate types for a given (fy, from_currency). INR is a 1:1 pass-through. */
export function getFXRateSet(input: { fy: string; from_currency: string }): FXRateSet {
  const iso = input.from_currency.toUpperCase();
  if (iso === 'INR') {
    return {
      fy: input.fy,
      from_currency: 'INR',
      to_currency: 'INR',
      closing_rate: 1,
      average_rate: 1,
      historical_rate: 1,
      source: { closing: 'fallback', average: 'fallback', historical: 'fallback' },
    };
  }
  const { start, end } = fyWindow(input.fy);
  const rates = loadForexRates(FX_RATE_SOURCE_ENTITY);
  const closingRate = latestRateOnOrBefore(rates, iso, end);
  const averageRate = latestRateOnOrBefore(rates, iso, end);
  const closing = pickClosingRate(closingRate);
  const average = pickAverageRate(averageRate);
  const histRes = pickHistoricalRate(iso, start);
  const historical = histRes.rate > 0 ? histRes.rate : closing;
  return {
    fy: input.fy,
    from_currency: iso,
    to_currency: 'INR',
    closing_rate: closing,
    average_rate: average,
    historical_rate: historical,
    source: {
      closing: closingRate ? 'forex-master' : 'fallback',
      average: averageRate ? 'forex-master' : 'fallback',
      historical: histRes.source,
    },
  };
}

// ── Classification (Ind AS 21) ────────────────────────────────────────────

/**
 * Map a ledger_group_code to Ind AS 21 translation classification:
 *   L1 ∈ {I,E}            → 'pnl'     (average rate)
 *   L1 === 'CE'           → 'equity'  (historical rate)
 *   else (A · L · SR · …) → 'bs'      (closing rate)
 * This refines S109's classify() (which buckets equity as BS) without modifying it.
 */
export function classifyForTranslation(ledger_group_code: string): TranslatedClassification {
  const l1 = getL1Code(ledger_group_code);
  if (l1 === 'I' || l1 === 'E') return 'pnl';
  if (l1 === 'CE') return 'equity';
  return 'bs';
}

function rateFor(classification: TranslatedClassification, set: FXRateSet): { rate: number; rate_type: FXRateType } {
  if (classification === 'pnl') return { rate: set.average_rate, rate_type: 'average' };
  if (classification === 'equity') return { rate: set.historical_rate, rate_type: 'historical' };
  return { rate: set.closing_rate, rate_type: 'closing' };
}

// ── Core translation ──────────────────────────────────────────────────────

/**
 * Translate a single foreign-subsidiary's TB into the presentation currency (INR).
 * Reads the per-entity TB through S109's `computeEntityTrialBalance` (0-DIFF) and
 * applies the Ind AS 21 Current Rate method. The residual exchange difference is
 * recognised as FCTR (OCI).
 */
export function translateForeignEntity(input: { entity_id: string; fy: string }): FXTranslationResult {
  const from_currency = getFunctionalCurrency(input.entity_id);
  const rate_set = getFXRateSet({ fy: input.fy, from_currency });
  const sourceTB = computeEntityTrialBalance(input.entity_id, input.fy);

  const lines: TranslatedLine[] = sourceTB.lines.map((l) => {
    const klass = classifyForTranslation(l.ledger_group_code);
    const { rate, rate_type } = rateFor(klass, rate_set);
    return {
      ledger_group_code: l.ledger_group_code,
      classification: klass,
      foreign_amount_debit: l.debit,
      foreign_amount_credit: l.credit,
      rate_applied: rate,
      rate_type,
      inr_debit: round2(dMul(l.debit, rate)),
      inr_credit: round2(dMul(l.credit, rate)),
    };
  });

  const totalDr = round2(dSum(lines, (l) => l.inr_debit));
  const totalCr = round2(dSum(lines, (l) => l.inr_credit));
  // FCTR = the residual exchange difference that makes the translated TB balance.
  // Convention: a positive fctr_amount represents a gain credited to OCI; negative = loss.
  const fctr_amount = round2(dSub(totalDr, totalCr));
  const balanced_pre_fctr = Math.abs(fctr_amount) < 0.01;

  const result: FXTranslationResult = {
    entity_id: input.entity_id,
    fy: input.fy,
    from_currency,
    to_currency: 'INR',
    rate_set,
    lines,
    fctr_amount,
    balanced_pre_fctr,
    translated_at: new Date().toISOString(),
  };

  // Persist run for the page (side-store · clearable · §H safe).
  try {
    const existing = JSON.parse(localStorage.getItem(fxTranslationsKey(input.fy)) ?? '[]') as FXTranslationResult[];
    const dedup = existing.filter((r) => r.entity_id !== input.entity_id);
    // [JWT] POST /api/finance/fx-translations
    localStorage.setItem(fxTranslationsKey(input.fy), JSON.stringify([...dedup, result]));
  } catch { /* quota silent */ }

  logAudit({
    entityCode: input.entity_id,
    action: 'create',
    entityType: 'fx_translation_run',
    recordId: `fxt-${input.entity_id}-${input.fy}-${Date.now()}`,
    recordLabel: `FX translation · ${input.entity_id} · FY ${input.fy} · ${from_currency}→INR · FCTR ₹${fctr_amount.toFixed(2)}`,
    beforeState: null,
    afterState: {
      entity_id: input.entity_id,
      fy: input.fy,
      from_currency,
      closing_rate: rate_set.closing_rate,
      average_rate: rate_set.average_rate,
      historical_rate: rate_set.historical_rate,
      line_count: lines.length,
      fctr_amount,
      balanced_pre_fctr,
    } as Record<string, unknown>,
    sourceModule: 'fx-translation-engine',
  });

  return result;
}

/**
 * Translated EntityTrialBalance shaped exactly like S109's `EntityTrialBalance` so it
 * can be fed back into `consolidate({ fy, entityTBProvider })` (S110 §H waiver hook).
 * INR-functional entities pass through unchanged (no FX activity).
 */
export function translateEntityTB(entity_id: string, fy: string): EntityTrialBalance {
  const from_currency = getFunctionalCurrency(entity_id);
  const passthrough = computeEntityTrialBalance(entity_id, fy);
  if (from_currency === 'INR') {
    return passthrough;
  }
  const t = translateForeignEntity({ entity_id, fy });
  const lines: TBLine[] = t.lines.map((l) => ({
    ledger_group_code: l.ledger_group_code,
    // S109 only knows 'pnl'|'bs' (Classification). Equity collapses to BS for the rollup.
    classification: (l.classification === 'pnl' ? 'pnl' : 'bs') as Classification,
    debit: l.inr_debit,
    credit: l.inr_credit,
  }));
  // Recognise the FCTR residual on a synthetic OCI line so the consolidated TB stays balanced.
  if (Math.abs(t.fctr_amount) >= 0.01) {
    if (t.fctr_amount > 0) {
      lines.push({ ledger_group_code: 'FCTR-OCI', classification: 'bs', debit: 0, credit: t.fctr_amount });
    } else {
      lines.push({ ledger_group_code: 'FCTR-OCI', classification: 'bs', debit: Math.abs(t.fctr_amount), credit: 0 });
    }
  }
  return {
    entity_id,
    method: passthrough.method,
    ownership_pct: passthrough.ownership_pct,
    lines,
  };
}

/**
 * Group consolidation with FX translation applied per entity.
 * Calls S109's `consolidate` via the §H-waiver `entityTBProvider` hook — S109 itself
 * is 0-DIFF except for the optional param (see group-consolidation-engine @s110-waiver).
 */
export function consolidateWithTranslation(input: { fy: string }): ConsolidatedTrialBalance {
  return s109Consolidate({
    fy: input.fy,
    entityTBProvider: (entity_id, fy) => translateEntityTB(entity_id, fy),
  });
}

/** List previously persisted translation runs for the FY (page consumes this). */
export function listTranslations(fy: string): FXTranslationResult[] {
  try {
    // [JWT] GET /api/finance/fx-translations?fy=:fy
    const raw = localStorage.getItem(fxTranslationsKey(fy));
    return raw ? (JSON.parse(raw) as FXTranslationResult[]) : [];
  } catch {
    return [];
  }
}

/** Clear persisted translations for an FY (UI button / tests). */
export function clearTranslations(fy: string): void {
  try { localStorage.removeItem(fxTranslationsKey(fy)); } catch { /* ignore */ }
}
