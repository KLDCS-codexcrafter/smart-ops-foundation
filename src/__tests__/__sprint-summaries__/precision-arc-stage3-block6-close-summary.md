# Precision Arc · Stage 3 · Block 6 — `masters` + `command-center` · Close Summary

**Predecessor HEAD:** Block 5 banked output.
**Scope:** 27 candidate sites across 6 files (23 `parseFloat` + 4 `Math.round`).
**Outcome:** 22 confirmed-and-migrated · 5 reclassified-and-skipped · 0 STOP-and-raise additions migrated.

---

## §1 Verdict table — all 27 candidates

| # | File · line | Verdict | Pattern | Resolver / target | Field |
|---|---|---|---|---|---|
| 1 | `pages/erp/masters/VendorMaster.tsx:628` | MIGRATE | 2 | `resolveMoneyPrecision(null,null)` | `openingBalance` |
| 2 | `pages/erp/masters/VendorMaster.tsx:802` | MIGRATE | 2 | money | `openingBalance` |
| 3 | `pages/erp/masters/VendorMaster.tsx:1113` | RECLASSIFY-C | — | — | `lower_deduction_rate` (% — non-money) |
| 4 | `pages/erp/masters/LogisticMaster.tsx:661` | MIGRATE | 2 | money | `openingBalance` |
| 5 | `pages/erp/masters/LogisticMaster.tsx:1029` | RECLASSIFY-C | — | — | `freightRateTolerance` (% tolerance — non-money) |
| 6 | `pages/erp/masters/LogisticMaster.tsx:1117` | MIGRATE | 2 | money | freight `rate` (₹/UoM) |
| 7 | `pages/erp/masters/LogisticMaster.tsx:1123` | MIGRATE | 2 | money | `minimumCharge` |
| 8 | `pages/erp/masters/CustomerMaster.tsx:779` | MIGRATE | 2 | money | `openingBalance` |
| 9 | `pages/erp/masters/CustomerMaster.tsx:982` | MIGRATE | 2 | money | `openingBalance` |
| 10 | `pages/erp/masters/CustomerMaster.tsx:990` | MIGRATE | 2 | money | `creditLimit` |
| 11 | `pages/erp/masters/CustomerMaster.tsx:1241` | MIGRATE | 2 | money | `agreedFreightRate` |
| 12 | `pages/erp/masters/CustomerMaster.tsx:1251` | RECLASSIFY-C | — | — | `freightRateTolerance` (% — non-money) |
| 13 | `command-center/modules/OpeningLedgerBalanceModule.tsx:432` | MIGRATE | 2 | money | Dr value (ledger opening) |
| 14 | `command-center/modules/OpeningLedgerBalanceModule.tsx:444` | MIGRATE | 2 | money | Cr value |
| 15 | `command-center/modules/OpeningLedgerBalanceModule.tsx:554` | MIGRATE | 2 | money | bill `amount` |
| 16 | `command-center/modules/OpeningLedgerBalanceModule.tsx:603` | MIGRATE | 2 | money | bill `tds_amount` |
| 17 | `command-center/modules/EmployeeOpeningLoansModule.tsx:240` | MIGRATE | 2 | money | `original_amount` |
| 18 | `command-center/modules/EmployeeOpeningLoansModule.tsx:241` | MIGRATE | 2 | money | `recovered_amount` |
| 19 | `command-center/modules/EmployeeOpeningLoansModule.tsx:243` | RECLASSIFY-C | — | — | `interest_rate` (% — non-money) |
| 20 | `command-center/modules/EmployeeOpeningLoansModule.tsx:244` | MIGRATE | 2 | money | `emi_amount` |
| 21 | `command-center/modules/EmployeeOpeningLoansModule.tsx:303` | MIGRATE | 2 | money | `original_amount` |
| 22 | `command-center/modules/EmployeeOpeningLoansModule.tsx:304` | MIGRATE | 2 | money | `recovered_amount` |
| 23 | `command-center/modules/EmployeeOpeningLoansModule.tsx:356` | RECLASSIFY-C | — | — | `interest_rate` (% — non-money) |
| 24 | `pages/erp/masters/SchemeMaster.tsx:415` | MIGRATE | 1 | `roundTo(_, 0)` integer-paise | `min_order_value_paise` (₹ × 100) |
| 25 | `pages/erp/masters/SchemeMaster.tsx:532` | MIGRATE | 1 | integer-paise | `discount_paise` |
| 26 | `pages/erp/masters/SchemeMaster.tsx:585` | MIGRATE | 1 | integer-paise | `bundle_price_paise` |
| 27 | `pages/erp/masters/SchemeMaster.tsx:606` | MIGRATE | 1 | integer-paise | `min_purchase_value_paise` |

**Totals:** 22 MIGRATE (18 Pattern-2 money + 4 Pattern-1 integer-paise) · 5 RECLASSIFY-C (percentages) · 0 RECLASSIFY-B.

---

## §2 Files edited (6) — surgical, no out-of-scope diffs

- `src/pages/erp/masters/VendorMaster.tsx` — 2 sites migrated, 1 reclassified-skipped (`:1113`).
- `src/pages/erp/masters/LogisticMaster.tsx` — 3 sites migrated, 1 reclassified-skipped (`:1029`).
- `src/pages/erp/masters/CustomerMaster.tsx` — 4 sites migrated, 1 reclassified-skipped (`:1251`).
- `src/features/command-center/modules/OpeningLedgerBalanceModule.tsx` — 4 sites migrated.
- `src/features/command-center/modules/EmployeeOpeningLoansModule.tsx` — 5 sites migrated, 2 reclassified-skipped (`:243`, `:356`).
- `src/pages/erp/masters/SchemeMaster.tsx` — 4 sites migrated (Pattern 1, integer paise).

Each edited file gained one new import line:
- 5 files: `import { roundTo, resolveMoneyPrecision } from '@/lib/decimal-helpers';`
- `SchemeMaster.tsx`: `import { roundTo, dMul } from '@/lib/decimal-helpers';`

**Protected zones · 0-diff confirmed:**
- `src/types/voucher-type.ts`
- `src/types/cc-masters.ts`
- `src/components/operix-core/applications.ts`
- `src/lib/cc-compliance-settings.ts`
- `src/lib/decimal-helpers.ts` (consume-only)

---

## §3 Pattern-1 SchemeMaster · integer-paise migration detail

The 4 SchemeMaster `Math.round` sites convert ₹ rupee inputs to integer paise for storage. The original idiom was:

```ts
Math.round((Number(e.target.value) || 0) * 100)
```

Migrated to:

```ts
roundTo(dMul(Number(e.target.value) || 0, 100), 0)
```

This routes the multiplication through Decimal (eliminating float drift on values like `0.3 * 100`) and uses the contract resolver target precision = 0 (integer paise). RBI banker semantics (`ROUND_HALF_UP`) preserved — D-142 LOCKED.

---

## §4 STOP-and-raise — adjacent non-scope sites (NOT migrated)

Pulled into view by Appendix A but **not in this block's scope** (parked-boundary rule):

- `pages/erp/masters/CustomerMaster.tsx:996` — `warningLimit` (money). Adjacent to `:990`, NOT in Appendix A. Likely future migration.
- `pages/erp/masters/SchemeMaster.tsx` (and other masters) carry numerous additional `Number(e.target.value) || 0` and `parseFloat` sites in unrelated payload kinds (e.g., `sample_qty`, `qps_target` ladders). None in Appendix A; none touched.
- `command-center/modules/OpeningLedgerBalanceModule.tsx` line ~553 — `parseInt(e.target.value) || 0` for `credit_days` (a days-quantity). Adjacent, not in Appendix A, not migrated.
- `command-center/modules/EmployeeOpeningLoansModule.tsx:352` — a `parseFloat(e.target.value) || 0` inside an inline expression, NOT in Appendix A. Not migrated.

Flagged for future Stage-3 classification. None edited in this block.

---

## §5 Honest disclosures (logic changes beyond pure migration)

**None.** Every migrated Pattern-2 site is a pure wrap: original `parseFloat(...) || 0` preserved verbatim inside `roundTo(..., resolveMoneyPrecision(null, null))`. The 4 SchemeMaster Pattern-1 sites swap `Math.round(... * 100)` for `roundTo(dMul(..., 100), 0)` — semantically equivalent under RBI banker's rounding for typical inputs, with the added benefit of decimal-safe multiplication. No new guards, no new defaults, no signature changes, no resolver plumbing.

---

## §6 Triple Gate

- **TSC:** 0 errors.
- **ESLint:** parity with predecessor (no new errors/warnings introduced).
- **Vitest:** 1128 passed / 158 files passed (Block 6 test added 7 new assertions; all prior suites still green).
- **Build:** clean.

**HALT for §2.4 audit.** Block 7 NOT started. No self-certification.
