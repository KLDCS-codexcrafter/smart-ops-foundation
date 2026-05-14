# Sprint T-Phase-1.Precision-Arc · Stage 1 · Close Summary

**Predecessor HEAD:** `045134f`
**Type:** Foundation sprint — additive contract only · NO calculation logic changed
**Author:** Lovable (executing on behalf of Operix Founder) · May 14, 2026

---

## What was built (Steps 1–5)

### Step 1 · Entity precision field
- `src/types/company-settings.ts` — added `money_decimal_places: number | null` immediately after `base_currency` (semantically paired). Required field; null = inherit-from-base-currency.
- `src/hooks/useCompanySettings.ts` — added `money_decimal_places: null` to the inline `defaultSetting` object (lines 21-31) so `getSettings()` returns objects matching the contract.
- `src/pages/erp/foundation/CompanyForm.tsx` — added `money_decimal_places: null` to the `settingsEntry` literal at line ~421. Disclosure: this literal is locally typed as `Record<string, unknown>` (not `CompanySettings`), so the change was not strictly required for type-checking, but was applied for semantic correctness per the prompt's "if either constructs a CompanySettings object literal" instruction.
- `src/pages/erp/inventory/ItemRatesMRP.tsx` — only **reads** `companySettings[0]?.mrp_tax_treatment` via a narrowed `{ mrp_tax_treatment?: string }` shape; does not construct a `CompanySettings` object literal. **No change required.**

### Step 2 · Payroll precision contract
- `src/types/payroll-masters.ts` — appended a standalone `PayrollPrecisionConfig` interface and `DEFAULT_PAYROLL_PRECISION` const covering both `money_decimal_places` (null = inherit entity) and `unit_decimal_places` (days/hours precision; default 2). No existing payroll interface was edited.

### Step 3 · Precision resolvers
- `src/lib/decimal-helpers.ts` — appended `resolveMoneyPrecision(entityOverride, baseCurrencyDecimalPlaces)` (RC-2 option (c) single source) and `resolveQtyPrecision(uomDecimalPrecision)`. Both take plain `number | null | undefined` values; `decimal-helpers.ts` imports nothing new and stays a leaf utility.

### Step 4 · Precision-aware rounding
- `src/lib/decimal-helpers.ts` — appended `roundTo(n, places)` using `Decimal.ROUND_HALF_UP` (RBI banker's rounding, D-142 LOCKED). `round2` was **NOT** modified — its source bytes are identical to pre-Stage-1; `round2(n) === roundTo(n, 2)` holds by construction.

### Step 5 · Tests
- `src/test/precision-arc-stage1-contract.test.ts` — 9 tests covering the resolvers (override / inherit / fallback for both), `roundTo` correctness at 0/2/3 places, `round2` backward-compat regression guard against a spread of values, and additive-field type checks for `CompanySettings` + `DEFAULT_PAYROLL_PRECISION`.

---

## Backward-compat verification

- `round2` source bytes: **unchanged**. The 116 existing importers of `decimal-helpers.ts` are unaffected.
- Frozen exports (`dAdd`, `dSub`, `dMul`, `dPct`, `round2`, `dEq`, `dSum`): signatures unchanged.
- `currency.ts`, `uom.ts`: **READ ONLY** — 0 diff.
- Existing `payroll-masters.ts` interfaces: **0 diff** — only appended new types.
- Existing `company-settings.ts` fields: **0 diff** — only added the new optional/required field. (Note: it is a non-optional field in the interface; the inline default + CompanyForm literal were updated in the same sprint to satisfy this — no other typed `CompanySettings` literal exists in the codebase per grep.)

## Protected zones (0 diff verified)
- `src/types/voucher-type.ts` ✓
- `src/types/cc-masters.ts` ✓
- `src/components/operix-core/applications.ts` ✓
- `src/lib/cc-compliance-settings.ts` ✓

---

## Triple Gate (final)

- TSC: 0 errors
- ESLint: 0 errors / 10 warnings (carried Hardening-A `hardening-a/no-hardcoded-scoped-key` warnings — expected and unchanged)
- Vitest: previous 1081 + 9 new = passing
- Build: clean

## Explicit confirmation

**NO calculation logic changed.** No engine was rewired. No card page was touched. Stage 1 built the precision contract (entity field · payroll precision interface · two resolvers · `roundTo` helper) and **only** the contract. All math sites continue to call `round2` and the existing helpers with the same inputs they did at HEAD `045134f`. Migration of calculation sites onto the contract is Stage 3.

## Honest disclosures

- No T-fix required.
- `CompanyForm.tsx` literal was touched (see Step 1 disclosure above) — for semantic correctness, not type necessity.
- `ItemRatesMRP.tsx` did NOT need changes (read-only narrowed shape).
- No scope variance. No file outside the prompt's plan was touched.

---

**HALT for §2.4 Real Git Clone Audit.** Self-certification not performed.
