# Precision Arc · Stage 3 · Block 5 — `accounting` + `fincore` · Close Summary

**Predecessor HEAD:** `2282440` (Block 4 banked)
**Scope:** 24 candidate sites across 7 files (all `parseFloat`).
**Outcome:** 20 confirmed-and-migrated · 4 reclassified-and-skipped · 0 STOP-and-raise additions outside the documented Payment.tsx adjacent line.

---

## §1 Verdict table — all 24 candidates

| # | File · line | Verdict | Pattern | Resolver | Notes |
|---|---|---|---|---|---|
| 1 | `fincore/reports/gst/ITCRegister.tsx:202` | MIGRATE | 2 | `resolveMoneyPrecision(null,null)` | reversal amount (money form input) |
| 2 | `fincore/reports/TDSAdvance.tsx:91` | MIGRATE | 2 | `resolveMoneyPrecision(null,null)` | challan amount (stored to localStorage) |
| 3 | `fincore/reports/BankReconciliation.tsx:78` | MIGRATE | 2 | `resolveMoneyPrecision(null,null)` | parsed statement debit (money) |
| 4 | `fincore/reports/BankReconciliation.tsx:79` | MIGRATE | 2 | `resolveMoneyPrecision(null,null)` | parsed statement credit (money) |
| 5 | `accounting/capital-assets/CapitalAssetMaster.tsx:292` | MIGRATE | 2 | money | `cpInvoiceAmount` |
| 6 | `accounting/capital-assets/CapitalAssetMaster.tsx:296` | MIGRATE | 2 | money | `cpAssetCost` |
| 7 | `accounting/capital-assets/CapitalAssetMaster.tsx:302` | MIGRATE | 2 | money | `cpGstAmount` |
| 8 | `accounting/capital-assets/AssetDisposal.tsx:168` | MIGRATE | 2 | money | `salePrice` |
| 9 | `accounting/LedgerMaster.tsx:4558` | MIGRATE | 2 | money | cash `openingBalance` (with comma-strip) |
| 10 | `accounting/LedgerMaster.tsx:4683` | MIGRATE | 2 | money | bank `openingBalance` |
| 11 | `accounting/LedgerMaster.tsx:4738` | MIGRATE | 2 | money | liability `openingBalance` |
| 12 | `accounting/LedgerMaster.tsx:4869` | MIGRATE | 2 | money | loan-receivable `loanAmount` |
| 13 | `accounting/LedgerMaster.tsx:4872` | RECLASSIFY-C | — | — | `interestRate` is a percentage (non-money) |
| 14 | `accounting/LedgerMaster.tsx:4928` | MIGRATE | 2 | money | borrowing `loanAmount` |
| 15 | `accounting/LedgerMaster.tsx:4931` | RECLASSIFY-C | — | — | `interestRate` is a percentage |
| 16 | `accounting/LedgerMaster.tsx:5247` | MIGRATE | 2 | money | `paidAmount` (mark-paid) |
| 17 | `accounting/LedgerMaster.tsx:5352` | RECLASSIFY-C | — | — | duties/tax `rate` is a percentage |
| 18 | `accounting/LedgerMaster.tsx:5409` | MIGRATE | 2 | money | duties/tax `openingBalance` |
| 19 | `accounting/LedgerMaster.tsx:5491` | MIGRATE | 2 | money | asset `grossBlock` |
| 20 | `accounting/LedgerMaster.tsx:5561` | MIGRATE | 2 | money | asset `openingBalance` |
| 21 | `accounting/LedgerMaster.tsx:5683` | MIGRATE | 2 | money | payroll `openingBalance` |
| 22 | `accounting/LedgerMaster.tsx:5727` | MIGRATE | 2 | money | custodian `cashBalanceAtHandover` |
| 23 | `accounting/LedgerMaster.tsx:5833` | MIGRATE | 2 | money | cheque-issue `amount` |
| 24 | `accounting/vouchers/Payment.tsx:535` | RECLASSIFY-C | — | — | `tdsRate` is a Rate% input (% — not money). See §3. |

**Totals:** 20 MIGRATE · 4 RECLASSIFY-C · 0 RECLASSIFY-B.

---

## §2 Files edited (7)

- `src/pages/erp/accounting/LedgerMaster.tsx` — 12 sites migrated, 3 reclassified-skipped (lines 4872/4931/5352).
- `src/pages/erp/accounting/capital-assets/CapitalAssetMaster.tsx` — 3 sites migrated.
- `src/pages/erp/accounting/capital-assets/AssetDisposal.tsx` — 1 site migrated.
- `src/pages/erp/fincore/reports/gst/ITCRegister.tsx` — 1 site migrated.
- `src/pages/erp/fincore/reports/TDSAdvance.tsx` — 1 site migrated.
- `src/pages/erp/fincore/reports/BankReconciliation.tsx` — 2 sites migrated.
- `src/pages/erp/accounting/vouchers/Payment.tsx` — **0 diff** (the sole candidate was reclassified — see §3).

Each edited file gained one new import line:
`import { roundTo, resolveMoneyPrecision } from '@/lib/decimal-helpers';`

**Protected zones:** `decimal-helpers.ts`, `voucher-type.ts`, `cc-masters.ts`, `applications.ts`, `cc-compliance-settings.ts` — all 0-diff.

---

## §3 D-127 voucher territory · `vouchers/Payment.tsx:535`

Per the Block 5 risk note, `Payment.tsx:535` was inspected before any edit. Confirmed:

- It is the `onChange` of the **Rate %** Input (label "Rate %", line 533) — a **percentage**, not money.
- It is form-input handling (not inside `postVoucher` / write path).

**Verdict: RECLASSIFY-C** (non-money percentage). NOT migrated. The D-127 voucher-posting path in `Payment.tsx` is **0-diff** in this block.

---

## §4 STOP-and-raise — adjacent non-scope sites

Pulled into view by Appendix A but **not migrated** (parked-boundary rule):

- `accounting/vouchers/Payment.tsx:537` — `setTdsAmount(Math.round(amount * r / 100))`. This is a `Math.round` arithmetic site computing a TDS money amount inside the D-127 voucher neighbourhood. Not in Appendix A; **not migrated**. Flagged for founder ruling — likely a real defect (should route through `dPct` + `roundTo(_, mp)`), but requires explicit sign-off because it is one logical line away from voucher-posting state.
- `accounting/LedgerMaster.tsx:4361` — `parseFloat(e.target.value.replace(/,/g, '')) || 0` (money-shaped). Adjacent to scope, **not in Appendix A**, not migrated.
- `accounting/LedgerMaster.tsx:4798/4801/4804` — capital `authorisedCapital`/`issuedCapital`/`paidUpCapital` (money). Adjacent, not in Appendix A, not migrated.
- `accounting/LedgerMaster.tsx:4807` — `faceValuePerShare` with non-zero fallback (`|| 10`). Adjacent, not migrated.
- `accounting/LedgerMaster.tsx:4819` — `profitSharingRatio` (percentage). Adjacent, not migrated.
- `accounting/LedgerMaster.tsx:5517/5541/5545` — depreciation/IT-act/salvage rates (percentages). Adjacent, not migrated.
- `accounting/LedgerMaster.tsx:5767` — `signingLimit` (money). Adjacent, not migrated.
- `accounting/capital-assets/CapitalAssetMaster.tsx:412` — `idSalvage` (money, salvage value). Adjacent (same file), not in Appendix A, not migrated.

All of the above are flagged for Stage-3 follow-up classification. None were touched.

---

## §5 Honest disclosures (logic changes beyond pure migration)

**None.** Every migrated site is a pure Pattern-2 wrap: original `parseFloat(...) || 0` (with or without `.replace(/,/g, ...)`) preserved verbatim inside `roundTo(..., resolveMoneyPrecision(null, null))`. No new guards, no new defaults, no signature changes, no resolver plumbing.

---

## §6 Triple Gate

- **TSC:** 0 errors.
- **ESLint:** parity with predecessor (no new errors/warnings introduced by these edits).
- **Vitest:** 1121 passed / 157 files passed (Block 5 test added 8 new assertions; all prior suites still green).
- **Build:** clean.

**HALT for §2.4 audit.** Block 6 NOT started. No self-certification.
