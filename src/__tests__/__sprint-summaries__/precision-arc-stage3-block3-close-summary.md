# Sprint T-Phase-1.Precision-Arc · Stage 3 · Block 3 · pay-hub — Close Summary

**Predecessor HEAD:** `7a11a22` (Block 2 banked A POST-T1)
**Scope:** 28 candidate sites across 6 `pay-hub` files (Appendix A of Step 2 Lovable Prompt v1).
**Pattern:** Pattern 2 (parseFloat at form `onChange` boundary) — wall-to-wall.

---

## 1. Triple Gate

| Gate    | Baseline (`7a11a22`)         | Final (Block 3)              |
|---------|------------------------------|------------------------------|
| TSC     | 0 errors                     | **0 errors**                 |
| ESLint  | 0 errors / 10 warnings       | **0 errors / 10 warnings** (parity; 2 pre-existing `hardening-a/no-hardcoded-scoped-key` warnings in `EmployeeMaster.tsx:104,113` untouched) |
| Vitest  | 1099 passed / 154 files      | **1105 passed / 155 files** (+6 new tests, 1 new file) |
| Build   | clean                        | **clean**                    |

---

## 2. Confirm-or-reclassify verdict table — all 28

| # | File:Line | Field | Verdict | Pattern |
|---|-----------|-------|---------|---------|
| 1  | `src/pages/erp/pay-hub/transactions/StatutoryReturns.tsx:994` | `cf('totalAmount', …)` (return challan) | **MIGRATE** | 2 |
| 2  | `src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:349` | `declaredAmount` (proof submit) | **MIGRATE** | 2 |
| 3  | `…/PayslipGeneration.tsx:669` | `medicalInsuranceSelf` (80D) | **MIGRATE** | 2 |
| 4  | `…/PayslipGeneration.tsx:673` | `medicalInsuranceParents` (80D) | **MIGRATE** | 2 |
| 5  | `…/PayslipGeneration.tsx:684` | `educationLoanInterest` (80E) | **MIGRATE** | 2 |
| 6  | `…/PayslipGeneration.tsx:688` | `donations80G` | **MIGRATE** | 2 |
| 7  | `…/PayslipGeneration.tsx:692` | `savingsInterest80TTA` | **MIGRATE** | 2 |
| 8  | `…/PayslipGeneration.tsx:715` | `hra.rentPerMonth` (nested object spread) | **MIGRATE** | 2 |
| 9  | `…/PayslipGeneration.tsx:757` | `homeLoan.interestPaid` (nested object spread) | **MIGRATE** | 2 |
| 10 | `…/PayslipGeneration.tsx:761` | `homeLoan.principalPaid` (nested object spread) | **MIGRATE** | 2 |
| 11 | `…/PayslipGeneration.tsx:781` | `prevEmployerGross` | **MIGRATE** | 2 |
| 12 | `…/PayslipGeneration.tsx:785` | `prevEmployerTDS` | **MIGRATE** | 2 |
| 13 | `…/PayslipGeneration.tsx:789` | `prevEmployerPF` | **MIGRATE** | 2 |
| 14 | `src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx:330` | `minCTC` (CTC band threshold — money) | **MIGRATE** | 2 |
| 15 | `…/SalaryStructureMaster.tsx:335` | `maxCTC` (CTC band threshold — money) | **MIGRATE** | 2 |
| 16 | `…/SalaryStructureMaster.tsx:384` | `calculationValue` (component fixed-amount input) | **MIGRATE** | 2 |
| 17 | `…/SalaryStructureMaster.tsx:409` | `previewCTC` (preview computation input) | **MIGRATE** | 2 |
| 18 | `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1408` | `principalAmount` (loan) | **MIGRATE** | 2 |
| 19 | `…/EmployeeMaster.tsx:1409` | `emiAmount` (loan) | **MIGRATE** | 2 |
| 20 | `…/EmployeeMaster.tsx:1444` | `elOpeningBalance` (leave-days quantity — uses `resolveQtyPrecision`) | **MIGRATE** | 2 |
| 21 | `…/EmployeeMaster.tsx:1462` | `prevEmp.grossSalary` | **MIGRATE** | 2 |
| 22 | `…/EmployeeMaster.tsx:1463` | `prevEmp.tdsDeducted` | **MIGRATE** | 2 |
| 23 | `…/EmployeeMaster.tsx:1494` | `hourly_rate_production` (₹/hr) | **MIGRATE** | 2 |
| 24 | `src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:888` | `principalAmount` (with `.replace(/,/g,'')` strip) | **MIGRATE** | 2 |
| 25 | `…/EmployeeFinance.tsx:944` | `advForm.amount` (with strip) | **MIGRATE** | 2 |
| 26 | `…/EmployeeFinance.tsx:1006` | `expForm.amount` (with strip) | **MIGRATE** | 2 |
| 27 | `…/EmployeeFinance.tsx:1045` | `flexiTotal` (with strip) | **MIGRATE** | 2 |
| 28 | `src/pages/erp/pay-hub/transactions/Onboarding.tsx:756` | `journeyForm.offerAmount` | **MIGRATE** | 2 |

**Tally:** 28 confirmed-and-migrated · 0 reclassified · 0 STOP-and-raise on the in-scope set.

All 28 turned out to be genuine money-field form inputs landing in component/form state — exactly the Pattern 2 prediction. None reclassified to Class B/C.

---

## 3. Migration mechanic applied

Every migrated site followed the canonical Pattern 2 transform:

```ts
// before
onChange={e => duf('field', parseFloat(e.target.value) || 0)}
// after
onChange={e => duf('field', roundTo(parseFloat(e.target.value) || 0, resolveMoneyPrecision(null, null)))}
```

For the 4 `EmployeeFinance.tsx` sites, the pre-existing `.replace(/,/g,'')` thousands-separator strip was preserved inside the `parseFloat`:

```ts
roundTo(parseFloat(e.target.value.replace(/,/g,'')) || 0, resolveMoneyPrecision(null, null))
```

For the 3 `PayslipGeneration.tsx` nested-object sites (`:715`, `:757`, `:761`), the `roundTo` wraps the `parseFloat(...) || 0` *inside* the object spread — the spread shape itself is unchanged.

The `|| 0` fallback was kept on every site (correctly handles empty/invalid input). The `roundTo` wraps the whole expression including the `|| 0`.

---

## 4. Precision source (S3-Q4)

All 28 money migrations used `resolveMoneyPrecision(null, null)` → 2 (contract default).

**Why:** these are page-level form components. Neither `CompanySettings.money_decimal_places` nor a `Currency` row is cleanly in scope at the `onChange` handler. Plumbing entity context through component prop drilling would be a signature change — explicitly out of Block 3 scope (and of Stage 3 generally per S3-Q4). Consistent with Blocks 1 and 2.

**No signature changes.** **`PayrollPrecisionConfig` not wired** — future consideration.

---

## 5. STOP-and-raise — adjacent non-scope sites

While editing the 6 in-scope files, the following adjacent `parseFloat` sites were observed in the same files but are **NOT in Appendix A**. Per the new hard rule (learned from Block 2's parked-boundary crossing), they were **NOT migrated**:

| File:Line | Field | Notes |
|-----------|-------|-------|
| `src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx:654` | `duf(key, parseFloat(e.target.value) || 0)` (generic key inside a map over `Section80CKeys`) | Adjacent to migrated 80C inputs but not in Appendix A. **Already in the parked needs-founder-ruling set (the 248)** — swept and parked at Stage 2, not missed. |
| `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx:1204` | `vpfPercentage` (percentage, not money) | Likely Class C (percentage); not in Appendix A. |
| `…/EmployeeMaster.tsx:1227` | `annualCTC` (with `.replace(/,/g,'')` strip) — **money** | Adjacent money site, not in Appendix A. |
| `…/EmployeeMaster.tsx:1311` | `pfNomineePct` (percentage) | Likely Class C. |
| `…/EmployeeMaster.tsx:1312` | `gratuityNomineePct` (percentage) | Likely Class C. |
| `…/EmployeeMaster.tsx:1432` | `lp.premiumAnnual` (LIC) — **money** | Adjacent money site, not in Appendix A. **Already in the parked needs-founder-ruling set (the 248)** — swept and parked at Stage 2, not missed. |
| `…/EmployeeMaster.tsx:1433` | `lp.sumAssured` (LIC) — **money** | Adjacent money site, not in Appendix A. |
| `…/EmployeeMaster.tsx:1448` | `medicalRembCap` — **money** | Adjacent money site, not in Appendix A. |
| `src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx:1053` | `flexiComponents[comp]` (with strip) — **money** | Adjacent money site, not in Appendix A. |

**Disposition:** none touched. Correction to earlier wording: at least 2 of the flagged adjacents — `PayslipGeneration.tsx:654` and `EmployeeMaster.tsx:1432` — are **already in the Stage 2 parked needs-founder-ruling set (the 248)**. They were swept at Stage 2 and parked, NOT missed. The remaining adjacents (`EmployeeMaster.tsx:1227, 1433, 1448`, `EmployeeFinance.tsx:1053`, plus the percentage sites `:1204, :1311, :1312`) are flagged here for founder ruling: confirm whether each is parked-already or a true sweep-miss, then either fold into a future block or formally classify under the Stage 2 audit table.

---

## 6. Tests

New: `src/test/precision-arc-stage3-block3-migrations.test.ts` — 6 tests (one per migrated file). Asserts:
- No float drift after the `roundTo(parseFloat(...) || 0, MP())` wrap
- `ROUND_HALF_UP` semantics on `*.005`-class inputs
- Empty/invalid input → 0 fallback preserved
- `.replace(/,/g,'')` thousands-separator strip preserved for `EmployeeFinance.tsx`

All existing pay-hub suites remain green (1099 → 1105 total, +6 from this block).

---

## 7. Honest disclosures

- **No logic changes beyond pure migration.** No guards, no defensive defaults, no signature changes.
- **No T-fix beyond a self-caught test math typo** (`750000.999` → `751001` corrected to `750001` before final run).
- **No site defied Pattern 2.** All 28 were exactly as predicted: `parseFloat(e.target.value[.replace(/,/g,'')]) || 0` in form `onChange` handlers.
- **`decimal-helpers.ts` 0-diff confirmed.** Helpers consumed: `roundTo`, `resolveMoneyPrecision`. Both pre-existing.
- **Protected zones 0-diff confirmed:** `src/types/voucher-type.ts`, `src/types/cc-masters.ts`, `src/components/operix-core/applications.ts`, `src/lib/cc-compliance-settings.ts` — none touched.
- **Surgical scope held:** only the 6 named pay-hub files + 1 new test file.
- **RBI banker's rounding (`ROUND_HALF_UP`, D-142 LOCKED) preserved** — `roundTo` already implements it; no new rounding rule.

---

## 8. Files changed

**Edited (6 — the in-scope pay-hub files):**
- `src/pages/erp/pay-hub/transactions/StatutoryReturns.tsx`
- `src/pages/erp/pay-hub/transactions/PayslipGeneration.tsx`
- `src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx`
- `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx`
- `src/pages/erp/pay-hub/transactions/EmployeeFinance.tsx`
- `src/pages/erp/pay-hub/transactions/Onboarding.tsx`

**Created (2):**
- `src/test/precision-arc-stage3-block3-migrations.test.ts`
- `src/__tests__/__sprint-summaries__/precision-arc-stage3-block3-close-summary.md` (this file)

---

**HALT for §2.4 Real Git Clone Audit. Block 4 NOT started. No self-certification.**
