# Block 1 — D-140 Pre-Flight Validation (Cash Ledger Schema)

## Pattern tested
Inline `ImportSchema<CashLedgerDefinition>` in `LedgerMaster.tsx` · uses existing
Z9 `MasterImportExportButtons` component · sub-tab-aware single placement
(per I-18 second option · `ledgerImportConfig` map keyed on `defSubTab`).
Validates: (a) covariant cast `as unknown as ImportSchema<Record<string, unknown>>`
bridges concrete `CashLedgerDefinition` to generic `Record<string, unknown>`,
(b) field selection matches Cash sub-tab UI form (audit fields excluded),
(c) primaryKey `'code'` produces correct upsert dedup, (d) `rowToRecord`
generates valid `CashLedgerDefinition` with required system fields
(`id` generated · audit fields nullable via `auditNulls` shared object).

## Site validated
`LedgerMaster.tsx` Cash sub-tab (simplest of 11 sub-types · 16 user-fillable fields).

## Verification
- `tsc --noEmit -p tsconfig.app.json`: **0 errors**
- `eslint src --max-warnings 0` exit: **0**
- `npm run build`: **SUCCESS** (40.07s)
- `CASH_LEDGER_IMPORT_SCHEMA` defined inline: **yes** (2 occurrences · definition + usage in `ledgerImportConfig`)
- Schema columns match Cash sub-tab UI form (visual parity check): **verified**
  (16 user-fillable fields: code, numericCode, name, alias, mailingName, parentGroupCode,
  parentGroupName, entityShortCode, location, cashLimit, alertThreshold, isMainCash,
  voucherSeries, status, description, notes)
- Audit fields excluded (`id` · `suspendedBy/At/Reason` · `reinstated*`): **verified**
  (excluded from `columns` array · set automatically by `rowToRecord` via `crypto.randomUUID()` and shared `auditNulls`)
- Covariant cast `as unknown as ImportSchema<Record<string, unknown>>` used: **verified**
  (typed alias `AnyImportSchema` declared inline; 11 covariant casts)
- No new `as any` introduced: **verified** (grep count: 0 in file)
- `validateRow` enforces status enum (`'active'` | `'suspended'`): **verified**

## Verdict
- [x] PATTERN VALIDATED · proceeded to Blocks 2-4 (Bank · Liability · Capital · LoanReceivable · Borrowing · Income · Expense · DutiesTax · PayrollStatutory · Asset schemas)
- [ ] PATTERN FAILED · STOP
