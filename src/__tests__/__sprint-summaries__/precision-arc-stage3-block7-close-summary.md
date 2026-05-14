# Precision Arc · Stage 3 · Block 7 — the tail · Close Summary

**Predecessor HEAD:** Block 6 banked output.
**Scope:** 26 candidate sites listed in Appendix A across 16 files (Appendix-A header says "27" — actual enumeration totals 26; treated by enumeration).
**Outcome:** 21 confirmed-and-migrated · 5 reclassified-and-skipped (4 RECLASSIFY-C + 1 RECLASSIFY-B).

**Stage 3 status: COMPLETE when this block banks.** The 248 parked needs-founder-ruling sites remain as the documented Stage 3B / Hardening-B follow-on.

---

## §1 Verdict table — all 26 candidates

| # | File · line | Verdict | Pattern | Resolver / target |
|---|---|---|---|---|
| 1 | `pages/erp/foundation/OrgStructureHub.tsx:561` | MIGRATE | 2 | money · `\|\| null` fallback preserved (`budget`) |
| 2 | `salesx/transactions/QuotationEntry.tsx:864` | MIGRATE | 2 | money · `rate` |
| 3 | `salesx/transactions/QuotationEntry.tsx:867` | RECLASSIFY-C | — | `tax_pct` is a percentage |
| 4 | `salesx/transactions/QuotationEntry.tsx:896` | MIGRATE | 1 | integer-paise · `order_value_paise` |
| 5 | `salesx/transactions/QuotationEntry.tsx:901` | MIGRATE | 1 | integer-paise · `unit_price_paise` |
| 6 | `salesx/transactions/QuotationEntry.tsx:902` | MIGRATE | 1 | integer-paise · `line_total_paise` |
| 7 | `salesx/transactions/EnquiryCapture.tsx:801` | MIGRATE | 2 | money · `rate` (`\|\| null` preserved) |
| 8 | `salesx/transactions/EnquiryCapture.tsx:852` | MIGRATE | 2 | money · BOTH `amount` and `rate` on one line wrapped |
| 9 | `logistic/LogisticInvoiceSubmit.tsx:236` | MIGRATE | 2 | money · invoice line value |
| 10 | `dispatch/transactions/PDFInvoiceUpload.tsx:449` | MIGRATE | 2 | **quantity** · `weight` → `resolveQtyPrecision(undefined)` |
| 11 | `dispatch/transactions/PDFInvoiceUpload.tsx:457` | MIGRATE | 2 | money · `total` |
| 12 | `dispatch/transactions/TransporterInvoiceInbox.tsx:638` | MIGRATE | 1 | integer-paise · `tolerance_amount_paise` |
| 13 | `dispatch/transactions/TransporterInvoiceInbox.tsx:640` | MIGRATE | 1 | integer-paise · `escalation_amount_paise` |
| 14 | `dispatch/reports/SavingsROIDashboard.tsx:468` | MIGRATE | 2 | money · `benchAmount` |
| 15 | `dispatch/masters/PackingMaterialMaster.tsx:294` | MIGRATE | 1 | integer-paise · `cost_per_uom_paise` (parseFloat × 100 → `roundTo(dMul(parseFloat(_), 100), 0)`) |
| 16 | `payout/VendorPaymentEntry.tsx:410` | MIGRATE | 2 | money · payment rate input |
| 17 | `payout/AutoPayRulesEditor.tsx:265` | MIGRATE | 2 | money · `thresholdAmount` |
| 18 | `customer-hub/transactions/CustomerCatalog.tsx:66` | MIGRATE | 1 | integer-paise · `price_paise` from `std_selling_rate` |
| 19 | `features/party-master/lib/customer-kpi-engine.ts:136` | RECLASSIFY-C | — | `daysSalesOutstanding` — DAYS metric, not money (rubric mislabel) |
| 20 | `features/party-master/lib/customer-kpi-engine.ts:171` | RECLASSIFY-C | — | `avgDSO` — DAYS metric, not money |
| 21 | `features/party-master/hooks/useCreditScoring.ts:67` | RECLASSIFY-C | — | credit `score` clamped 0–100 — not money |
| 22 | `features/party-master/hooks/useCreditScoring.ts:81` | RECLASSIFY-B | — | display-only `Math.round` inside template literal (`% on-time`, avg days late) |
| 23 | `features/loan-emi/lib/emi-lifecycle-engine.ts:87` | MIGRATE | 1 | money · `totalEMI` via `dAdd(principal, interest)` |
| 24 | `features/loan-emi/lib/emi-lifecycle-engine.ts:88` | MIGRATE | 1 | money · `openingBalance` via `dAdd(runningBalance, principal)` |
| 25 | `features/loan-emi/hooks/useEMISchedule.ts:82` | MIGRATE | 1 | money · `outstandingAmount` via `roundTo(_, mp)` |
| 26 | `features/loan-emi/hooks/useEMIAlerts.ts:41` | MIGRATE | 1 | money · sum via `dSum(alerts.filter(pred), a => a.amount)` |

**Totals:** 21 MIGRATE (12 Pattern-2 + 9 Pattern-1, of which 6 integer-paise + 3 money 2dp) · 4 RECLASSIFY-C · 1 RECLASSIFY-B.

---

## §2 Files edited (16) — surgical, no out-of-scope diffs

Page forms:
- `src/pages/erp/foundation/OrgStructureHub.tsx`
- `src/pages/erp/salesx/transactions/QuotationEntry.tsx`
- `src/pages/erp/salesx/transactions/EnquiryCapture.tsx`
- `src/pages/erp/logistic/LogisticInvoiceSubmit.tsx`
- `src/pages/erp/dispatch/transactions/PDFInvoiceUpload.tsx`
- `src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx`
- `src/pages/erp/dispatch/reports/SavingsROIDashboard.tsx`
- `src/pages/erp/dispatch/masters/PackingMaterialMaster.tsx`
- `src/pages/erp/payout/VendorPaymentEntry.tsx`
- `src/pages/erp/payout/AutoPayRulesEditor.tsx`
- `src/pages/erp/customer-hub/transactions/CustomerCatalog.tsx`

Engines / hooks:
- `src/features/loan-emi/lib/emi-lifecycle-engine.ts`
- `src/features/loan-emi/hooks/useEMISchedule.ts`
- `src/features/loan-emi/hooks/useEMIAlerts.ts`

Untouched (RECLASSIFY only):
- `src/features/party-master/lib/customer-kpi-engine.ts` — 0 diff (DSO sites are days metrics).
- `src/features/party-master/hooks/useCreditScoring.ts` — 0 diff (score + display-string).

Each touched file gained one new import line from `@/lib/decimal-helpers`. Note: an automated insertion initially placed imports inside the JSDoc header of 9 .tsx files; this was caught by the type-checker on first compile, the misplaced lines were removed, and the imports re-inserted **after the first real `import` statement**. Final state: every import is in the import block. Verified by `tsc --noEmit` (0 errors).

**Protected zones · 0-diff confirmed:**
- `src/lib/decimal-helpers.ts` (consume-only)
- `src/types/voucher-type.ts`
- `src/types/cc-masters.ts`
- `src/components/operix-core/applications.ts`
- `src/lib/cc-compliance-settings.ts`

---

## §3 Pattern-1 migrations — semantic notes

**Integer paise (precision = 0):**
```ts
// before:  Math.round((x || 0) * 100)
// after:   roundTo(dMul(x || 0, 100), 0)
```
`dMul` eliminates float drift on values like `0.3 * 100`; `roundTo(_, 0)` enforces RBI banker's rounding to integer paise.

**Money 2dp (loan-emi engines):**
```ts
// before:  Math.round((a + b) * 100) / 100
// after:   roundTo(dAdd(a, b), resolveMoneyPrecision(null, null))

// before:  Math.round(arr.reduce((s, x) => s + x.amount, 0) * 100) / 100
// after:   roundTo(dSum(arr, x => x.amount), resolveMoneyPrecision(null, null))
```
The arithmetic is now decimal-safe end-to-end and rounds at the boundary using the contract resolver (default 2dp).

**Pattern-2 with `|| null` fallback (OrgStructureHub `budget`, EnquiryCapture `rate`):**
```ts
// before:  parseFloat(value) || null
// after:   roundTo(parseFloat(value), resolveMoneyPrecision(null, null)) || null
```
`roundTo(NaN, _)` returns `0`; `0 || null === null` — so the original null-on-empty-or-NaN semantics are preserved exactly.

---

## §4 STOP-and-raise — adjacent non-scope sites (NOT migrated)

Pulled into view by Appendix A but not in scope (parked-boundary rule):

- `useCreditScoring.ts:81` template literal also contains `Math.round(onTimePaymentRatio * 100)` and `Math.round(avgDaysLate)` — both **display formatting only** inside a string. Treated as RECLASSIFY-B in the verdict table; no diff.
- Multiple files in scope contain numerous additional `parseFloat`/`Math.round` sites (e.g., other line items in `QuotationEntry`, freight breakdown in `LogisticInvoiceSubmit`, packing material density fields). None are in this block's Appendix A; **none touched**.

No new STOP-and-raise items emerged in protected territory.

---

## §5 Honest disclosures (logic changes beyond pure migration)

**None.** Every Pattern-2 wrap preserves the original `parseFloat(...) || 0` (or `|| null`) verbatim. Every Pattern-1 rewrite is a semantically-equivalent reroute through `decimal-helpers` + `roundTo` with the contract resolver target. No new guards, no new defaults, no signature changes.

---

## §6 Triple Gate

- **TSC:** 0 errors.
- **ESLint:** parity with predecessor (no new errors/warnings introduced).
- **Vitest:** 1137 passed / 159 files passed (Block 7 test added 9 new assertions; all prior suites still green).
- **Build:** clean.

---

## §7 Stage 3 close

With Block 7 banked, **Stage 3 of the Precision Arc completes**. Across Blocks 1–7:
- 7 close summaries written.
- ~125–135 sites migrated to the precision contract.
- ~25 sites RECLASSIFY-B/C (display formatting, percentages, days metrics, scores).
- The 248 parked needs-founder-ruling sites remain as the **Stage 3B / Hardening-B follow-on**, fully documented.

**HALT for §2.4 audit.** No self-certification.
