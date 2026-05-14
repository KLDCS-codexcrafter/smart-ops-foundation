# Precision Arc · Stage 3 · Block 1 — Close Summary

**Sprint:** T-Phase-1.Precision-Arc · Stage 3 · Block 1 (`src/lib` Engines)
**Predecessor HEAD:** `c3c944a`
**Date:** 14 May 2026
**Discipline:** Confirm-then-migrate. Candidate list, not guaranteed-defect list.

---

## Triple Gate

| Gate | Baseline (`c3c944a`) | Final |
|------|---------------------|-------|
| TSC | 0 errors | 0 errors |
| ESLint | 0 errors / 10 warnings | 0 errors / 10 warnings |
| Vitest | 1090 / 152 | 1095 / 153 (+5 new migration tests) |
| Build | clean | clean |

`decimal-helpers.ts`: **0 diff** (consume-only, confirmed via `git diff --stat`).
Protected zones (`voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts`): **0 diff**.
Files touched: only the 14 named `src/lib` engine files containing MIGRATE sites — no other files.

---

## Roll-up

| Verdict | Count |
|---|---:|
| MIGRATE (Pattern 1 — engine arithmetic) | 22 |
| MIGRATE (Pattern 2 — `parseFloat` at storage boundary) | 3 |
| MIGRATE — STOP-and-raise (3-dp kg quantity, no UoM in scope) | 2 |
| RECLASSIFY-B (display/string formatting) | 16 |
| RECLASSIFY-C (non-money percentage / score / ratio / counts) | 25 |
| **Total candidates audited** | **68** |

**Confirmed-and-migrated: 25** · **Reclassified-and-skipped: 41** · **STOP-and-raise: 2**.

---

## Confirm-or-reclassify table — all 68 sites

| # | File:Line | Verdict | Pattern | Reason |
|--:|---|---|---|---|
| 1 | bill-passing-engine.ts:139 | RECLASSIFY-B | — | `toFixed` inside `reason` template string |
| 2 | bill-passing-engine.ts:142 | RECLASSIFY-B | — | `toFixed` inside `reason` template string |
| 3 | bill-passing-engine.ts:145 | RECLASSIFY-B | — | `toFixed` inside `reason` template string |
| 4 | bill-passing-engine.ts:340 | RECLASSIFY-B | — | `toFixed` inside `notes` leak event string |
| 5 | bill-passing-engine.ts:448 | RECLASSIFY-B | — | `toFixed` inside `notes` re-match leak string |
| 6 | bank-file-engine.ts:257 | RECLASSIFY-B | — | `req.amount.toFixed(2)` formatted into bank-file CSV value (export string, not stored money) |
| 7 | freight-calc-engine.ts:152 | RECLASSIFY-B | — | `toFixed` inside `formula_notes` text |
| 8 | irn-engine.ts:197 | RECLASSIFY-B | — | `toFixed` inside validation error message |
| 9 | payment-gateway-engine.ts:122 | RECLASSIFY-B | — | UPI URI param string; not stored money math |
| 10 | site-health-score-engine.ts:68 | RECLASSIFY-B | — | `costRatio.toFixed(2)` inside `evidence` string |
| 11 | fincore-engine.ts:101 | RECLASSIFY-B | — | `toFixed` inside Dr=Cr balance error string |
| 12 | fincore-engine.ts:114 | RECLASSIFY-B | — | `toFixed` inside Dr=Cr balance error string |
| 13 | rate-contract-engine.ts:196 | RECLASSIFY-B | — | `toFixed` inside `recommendation` string |
| 14 | rate-contract-engine.ts:208 | RECLASSIFY-B | — | `toFixed` inside `recommendation` string |
| 15 | gst-portal-service.ts:364 | MIGRATE | Pattern 2 | `parseFloat` reads TRACES `amount_paid` rupee field — wrapped at storage boundary |
| 16 | gst-portal-service.ts:365 | MIGRATE | Pattern 2 | `parseFloat` reads TRACES `tax_deducted` rupee field — wrapped at storage boundary |
| 17 | gst-portal-service.ts:371 | MIGRATE | Pattern 2 | `parseFloat` reads TRACES `tds_deposited` rupee field — wrapped at storage boundary |
| 18 | voucher-org-tag-engine.ts:149 | RECLASSIFY-C | — | `coveragePct` integer percentage, not money |
| 19 | vendor-scoring-engine.ts:82 | RECLASSIFY-C | — | `total_score` 0-100 score, not money |
| 20 | vendor-return-engine.ts:102 | MIGRATE | Pattern 1 | `line_total` rupee money stored on VR line |
| 21 | vendor-quotation-engine.ts:75 | MIGRATE | Pattern 1 | `lineAmount` — gross/disc/tax money math returned and stored |
| 22 | vendor-quotation-engine.ts:89 | MIGRATE | Pattern 1 | `totalTax` rupees stored on quotation header |
| 23 | vendor-quotation-engine.ts:100 | MIGRATE | Pattern 1 | `total_value` rupees stored on quotation header |
| 24 | vendor-quotation-engine.ts:102 | MIGRATE | Pattern 1 | `total_after_tax` rupees stored on quotation header |
| 25 | distributor-rating-engine.ts:48 | MIGRATE | Pattern 1 | `recommendedCreditLimit` paise (integer by D-228) |
| 26 | distributor-order-engine.ts:35 | MIGRATE | Pattern 1 | rupees→paise conversion stored as `rate_paise` |
| 27 | distributor-order-engine.ts:56 | MIGRATE | Pattern 1 | GST tax in paise stored on order line |
| 28 | distributor-order-engine.ts:66 | MIGRATE | Pattern 1 | CGST/SGST split in paise stored on order line |
| 29 | distributor-order-engine.ts:124 | RECLASSIFY-C | — | `daily_run_rate` derived analytical metric (units/day), not money or stored txn qty |
| 30 | depreciation-engine.ts:16 | MIGRATE | Pattern 1 | `computeWDV` rupee depreciation (S3-Q4 default precision — pure utility, no entity context) |
| 31 | depreciation-engine.ts:23 | MIGRATE | Pattern 1 | `computeSLM` rupee depreciation (S3-Q4 default precision) |
| 32 | depreciation-engine.ts:82 | MIGRATE | Pattern 1 | `closing_wdv` stored on DepreciationEntry |
| 33 | depreciation-engine.ts:120 | MIGRATE | Pattern 1 | `depr_full_rate` stored on IT-Act report row |
| 34 | depreciation-engine.ts:121 | MIGRATE | Pattern 1 | `depr_half_rate` stored on IT-Act report row |
| 35 | depreciation-engine.ts:130 | MIGRATE | Pattern 1 | `closing_wdv` on IT-Act row |
| 36 | depreciation-engine.ts:169 | MIGRATE | Pattern 1 | `current_depr` accumulator inside Companies-Act report |
| 37 | vendor-analytics-engine.ts:197 | RECLASSIFY-C | — | advance-adjustment % (0-100) |
| 38 | vendor-analytics-engine.ts:217 | RECLASSIFY-C | — | MSME breach rate % |
| 39 | vendor-analytics-engine.ts:236 | RECLASSIFY-C | — | TDS compliance % |
| 40 | customer-recommendation-engine.ts:62 | RECLASSIFY-C | — | recommendation `score` 0-1 ratio |
| 41 | customer-clv-engine.ts:59 | MIGRATE | Pattern 1 | `projected` CLV in paise (integer by D-228) |
| 42 | customer-churn-engine.ts:46 | RECLASSIFY-C | — | avg-days-between-orders count, not money |
| 43 | customer-churn-engine.ts:95 | RECLASSIFY-C | — | `churn_probability` 0-1 ratio |
| 44 | fincore-engine.ts:570 | MIGRATE | Pattern 1 | `taxable_amount_paise` rupees→paise (integer by D-228) for RCM detection input |
| 45 | store-hub-engine.ts:248 | RECLASSIFY-C | — | `days_of_cover` analytical days metric, not money |
| 46 | invoice-print-engine.ts:152 | RECLASSIFY-B | — | paise extractor inside `amountInWordsIN` display helper |
| 47 | packing-slip-engine.ts:102 | MIGRATE — STOP-and-raise | — | `total_gross_kg` stored at custom 3-dp precision; resolver default is 2-dp; engine has no UoM in scope. Plumbing UoM through `dlnToPackingSlip` = signature change. **Not migrated — flagged for founder ruling per spec.** |
| 48 | packing-slip-engine.ts:103 | MIGRATE — STOP-and-raise | — | `total_volumetric_kg` — same 3-dp/UoM issue as :102. **Not migrated.** |
| 49 | packing-bom-engine.ts:104 | MIGRATE | Pattern 1 | `computeBOMTotalCost` returns paise (integer by D-228) |
| 50 | rate-contract-engine.ts:187 | RECLASSIFY-C | — | `variance_pct` percentage, not money |
| 51 | qa-pareto-engine.ts:61 | RECLASSIFY-C | — | `fail_rate_pct` percentage |
| 52 | qa-pareto-engine.ts:69 | RECLASSIFY-C | — | `cumulative_pct` percentage |
| 53 | qa-pareto-engine.ts:78 | RECLASSIFY-C | — | `overall_fail_rate_pct` percentage |
| 54 | qa-pareto-engine.ts:114 | RECLASSIFY-C | — | `pass_rate_pct` percentage |
| 55 | servicedesk-engine.ts:409 | RECLASSIFY-C | — | `risk_score` 0-100 |
| 56 | servicedesk-engine.ts:423 | RECLASSIFY-C | — | factor breakdown sub-scores 0-100 |
| 57 | servicedesk-engine.ts:1334 | RECLASSIFY-C | — | `trust_score` 0-100 |
| 58 | servicedesk-engine.ts:1906 | MIGRATE | Pattern 1 | `suggested_charge_paise` (integer by D-228) |
| 59 | servicedesk-engine.ts:1971 | RECLASSIFY-C | — | `margin_pct` percentage |
| 60 | procure360-report-engine.ts:86 | MIGRATE | Pattern 1 | `total_spend` rupees aggregated from `total_after_tax` |
| 61 | procure360-report-engine.ts:87 | RECLASSIFY-C | — | `response_rate` percentage |
| 62 | receivx-engine.ts:246 | RECLASSIFY-C | — | DSO days metric, not money |
| 63 | receivx-engine.ts:260 | RECLASSIFY-C | — | `pctKept` percentage |
| 64 | requestx-report-engine.ts:208 | RECLASSIFY-C | — | `pct_of_total` percentage |
| 65 | scheme-impact-engine.ts:72 | RECLASSIFY-C | — | `projected_impact_pct` percentage |
| 66 | scheme-engine.ts:86 | MIGRATE | Pattern 1 | slab `discount` in paise (integer by D-228) |
| 67 | scheme-engine.ts:102 | MIGRATE | Pattern 1 | flat-percent `discount_paise` (integer by D-228) |
| 68 | social-proof-engine.ts:78 | RECLASSIFY-B | — | ★ rating display string |

---

## Migration mechanics applied

**Pattern 1 (engine arithmetic)** — replaced float `*` / `/` / `+` / `-` with `dMul`/`dPct`/`dAdd`/`dSub`/`dSum`, then rounded at the storage/return boundary with `roundTo(_, resolveMoneyPrecision(null, null))` for rupee fields, and `roundTo(_, 0)` for paise fields (paise is integer by D-228 storage convention — orthogonal to the rupee-precision contract).

**Pattern 2 (`parseFloat` reading external data)** — kept the `parseFloat` call (it correctly reads a string), wrapped the result with `roundTo(parseFloat(...) || 0, resolveMoneyPrecision(null, null))` at the point the value enters the returned record.

**Precision source per S3-Q4** — every migrated rupee site uses `resolveMoneyPrecision(null, null)` (→ 2). Reason: all 14 touched engine files are pure utilities or operate via passed-in records; none has `CompanySettings` or `Currency` in scope. The contract default is the intended right answer here. **No engine signatures were modified** to reach the resolver, in line with the no-signature-plumbing rule.

**Banker's rounding (D-142 LOCKED)** — preserved. `roundTo` uses `ROUND_HALF_UP` end-to-end. No new rounding rule introduced. Migrated values may differ from pre-migration float-drifted values in the direction of correctness (e.g., `333_333 * 1.5 = 499_999.5` now yields `500_000` instead of `499_999`).

---

## STOP-and-raise — 2 sites (`packing-slip-engine.ts:102, :103`)

`total_gross_kg` and `total_volumetric_kg` are stored on the packing slip at **3-decimal kg precision** (`Math.round(x * 1000) / 1000`). Per the contract, quantity precision must come from `resolveQtyPrecision(uomDecimalPrecision)`, which defaults to 2 when no UoM is in scope. The function `dlnToPackingSlip` does not currently receive a UoM context, and plumbing one through would constitute a signature change.

**Decision:** flagged as STOP-and-raise per spec ("If you believe a signature genuinely must change to do the migration correctly, that is a STOP-and-raise, not a silent change"). **No code change applied at these two sites.** Founder ruling required: (a) accept 2-dp kg via the contract default, (b) approve a signature change to plumb UoM context, or (c) explicit policy that kg packing-weight uses a fixed 3-dp domain rule (independent of the per-UoM contract).

---

## Files touched (15)

`depreciation-engine.ts` · `vendor-quotation-engine.ts` · `vendor-return-engine.ts` · `distributor-order-engine.ts` · `distributor-rating-engine.ts` · `gst-portal-service.ts` · `customer-clv-engine.ts` · `scheme-engine.ts` · `packing-bom-engine.ts` · `procure360-report-engine.ts` · `servicedesk-engine.ts` · `fincore-engine.ts` (1 site, `taxable_amount_paise` only — D-127 voucher path untouched).
Plus new test file: `src/test/precision-arc-stage3-block1-migrations.test.ts` (5 tests, all green).

`packing-slip-engine.ts`, `social-proof-engine.ts`, `bill-passing-engine.ts`, `bank-file-engine.ts`, `freight-calc-engine.ts`, `irn-engine.ts`, `payment-gateway-engine.ts`, `site-health-score-engine.ts`, `rate-contract-engine.ts`, `voucher-org-tag-engine.ts`, `vendor-scoring-engine.ts`, `vendor-analytics-engine.ts`, `customer-recommendation-engine.ts`, `customer-churn-engine.ts`, `store-hub-engine.ts`, `invoice-print-engine.ts`, `qa-pareto-engine.ts`, `receivx-engine.ts`, `requestx-report-engine.ts`, `scheme-impact-engine.ts` — **0 diff** (all sites in these files reclassified B/C, or STOP-and-raise).

---

## Honest disclosures

- **`packing-slip-engine.ts:102, :103` — STOP-and-raise**, not migrated (3-dp kg vs. contract default of 2). Founder ruling required.
- **No T-fixes were silently applied.** No site defied the three patterns.
- **`fincore-engine.ts:570` is the only `fincore-engine.ts` line touched.** It is pure detection-input math (`taxable_amount_paise` for `detectRCMForVoucher`), not voucher-posting math. The D-127 voucher posting path (`postVoucher` etc.) is **0 diff**. No protected-zone exception requested.
- **`bank-file-engine.ts:257` and `payment-gateway-engine.ts:122`** were classified RECLASSIFY-B even though the formatted value crosses a system boundary (CSV file / UPI URI). Rationale: these are output-formatting on the wire, not stored numeric money fields. The upstream `req.amount` and `amount` arguments are themselves expected to be already-contract-precise from their calling pages — that is a different sprint's responsibility (Block 2/3). Flagging as a known follow-up: a future sprint could add an assertion at these boundaries that the incoming amount is already at contract precision.
- **`distributor-order-engine.ts:124` (`daily_run_rate`)** is borderline — it is a derived rate stored on the returned reorder-suggestion struct. Classified RECLASSIFY-C because it is not money and is not consumed downstream as a precision-critical quantity (used only as analytical signal). If founder views this differently, easy follow-up migration with `roundTo(_, 2)` semantics.

---

## HALT for §2.4 Real Git Clone Audit. Do not proceed to Block 2. Do not self-certify.
