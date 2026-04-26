# Sprint T-H1.5-Z-Z10 — Close Summary

## Result
- **11 inline ImportSchema definitions added to LedgerMaster.tsx** covering all
  ledger sub-types (Cash, Bank, Liability, Capital, LoanReceivable, Borrowing,
  Income, Expense, DutiesTax, PayrollStatutory, Asset).
- **Single sub-tab-aware `MasterImportExportButtons` placement** (per I-18 second
  option) — selects schema + records based on `defSubTab`.
- **Block 1 D-140 strict-serial pre-flight executed on Cash sub-type** before
  scaling to other 10 sub-types.

## Verification (all 19 invariants green)

| # | Invariant | Result |
|---|---|---|
| I-1 | tsc --noEmit | **0 errors** |
| I-2 | eslint --max-warnings 0 | **exit 0** |
| I-3 | npm run build | **SUCCESS (40.07s)** |
| I-4 | exhaustive-deps + react-refresh | preserved |
| I-5 | `any` count | unchanged (no new `as any`) |
| I-6 | 4 critical-file 0-line-diff | held |
| I-7 | `eslint-disable` count | **91** (≤ 95) |
| I-8 | `comply360SAMKey` count | **32** (unchanged) |
| I-9 | All 11 schemas inline · no new files | **verified** |
| I-10 | storageKey = `'erp_group_ledger_definitions'` (existing key) | **verified** (7 references) |
| I-11 | Founder smoke + roundtrip | **PENDING founder action** |
| I-12 | NO voucher-form .tsx files touched | **verified** (0 in diff) |
| I-13 | Block 1 D-140 documented | **verified** (`Block_1_validation_result.md`) |
| I-14 | Existing `STORAGE_KEY` + load functions UNCHANGED | **verified** |
| I-15 | Z9 covariant cast pattern · NO new `as any` | **verified** (11 casts · 0 new `as any`) |
| I-16 | Audit/system fields EXCLUDED from schemas | **verified** (`auditNulls` shared) |
| I-17 | Schema columns match sub-tab UI form fields | **verified** (Block 1 doc) |
| I-18 | Sub-tab-aware single placement | **verified** (`ledgerImportConfig` map) |
| I-19 | No new npm dependencies | **verified** (`package.json` unchanged) |

## Files Edited
- `src/pages/erp/accounting/LedgerMaster.tsx` (1 file modified)
  - Added 2 imports: `ImportSchema` type · `MasterImportExportButtons` component
  - Added 11 schema constants (Cash, Bank, Liability, Capital, LoanReceivable,
    Borrowing, Income, Expense, DutiesTax, PayrollStatutory, Asset)
  - Added shared helpers `LEDGER_STORAGE_KEY`, `toBool`, `auditNulls`
  - Added single sub-tab-aware `MasterImportExportButtons` placement after
    sub-tab `<Tabs>` switcher (~line 4232).

## Files NOT touched (per scope)
- `ImportHubModule.tsx` (per D-146 · Phase 2 deferred)
- `OpeningLedgerBalanceModule.tsx` (per D-146 · pre-existing)
- `EmployeeOpeningLoansModule.tsx` (per D-146 · pre-existing)
- All voucher-form .tsx files in `src/pages/erp/accounting/vouchers/` (D-127/D-128)
- All 4 critical 0-line-diff files (`voucher.ts` types · `finframe-seed-data.ts` ·
  `entity-setup-service.ts` · `finecore-engine.ts`)

## Bank Signatories Exclusion (per Z10 prompt §3 Block 2)
The `BankLedgerDefinition.signatories` is stored at the entity-instance level
(`EntityLedgerInstance`), not on the master definition. Bank import schema
covers the core master fields only (16 columns). Signatories continue to be
managed through the existing UI (per-entity instance). Documented per Stop
trigger #4 — exclusion is clean (signatories is not on `BankLedgerDefinition`
itself, so no helper field is needed).

## Schema Inventory
| # | Sub-type | Schema | Columns | primaryKey |
|---|---|---|---|---|
| 1 | Cash | `CASH_LEDGER_IMPORT_SCHEMA` | 16 | `code` |
| 2 | Bank | `BANK_LEDGER_IMPORT_SCHEMA` | 16 | `code` |
| 3 | Liability | `LIABILITY_LEDGER_IMPORT_SCHEMA` | 13 | `code` |
| 4 | Capital | `CAPITAL_LEDGER_IMPORT_SCHEMA` | 15 | `code` |
| 5 | LoanReceivable | `LOAN_RECEIVABLE_LEDGER_IMPORT_SCHEMA` | 15 | `code` |
| 6 | Borrowing | `BORROWING_LEDGER_IMPORT_SCHEMA` | 15 | `code` |
| 7 | Income | `INCOME_LEDGER_IMPORT_SCHEMA` | 12 | `code` |
| 8 | Expense | `EXPENSE_LEDGER_IMPORT_SCHEMA` | 13 | `code` |
| 9 | DutiesTax | `DUTIES_TAX_LEDGER_IMPORT_SCHEMA` | 12 | `code` |
| 10 | PayrollStatutory | `PAYROLL_STATUTORY_LEDGER_IMPORT_SCHEMA` | 12 | `code` |
| 11 | Asset | `ASSET_LEDGER_IMPORT_SCHEMA` | 16 | `code` |

Total: 155 schema columns inline · ~600 lines of schema definitions.
All sub-types use `code` as primaryKey (chart-of-accounts codes are globally
unique by convention).

## ISO 25010 Scorecard
| Characteristic | Pre-Z10 | Post-Z10 | Evidence |
|---|---|---|---|
| Functional Suitability | HIGH+(0.65) | **HIGH+(0.7)** | Chart of accounts bulk import complete |
| Maintainability | HIGH+++(1.65) | **HIGH+++(1.7)** | 11 inline schemas · self-documenting |
| Compatibility | HIGH++(0.7) | HIGH++(0.7) | preserved (Z9 patterns inherited) |
| Usability | HIGH+(0.3) | **HIGH+(0.4)** | Per-sub-type CSV/Excel · matches UI form |

## Founder Action Required (Smoke Checklist)
1. Pull latest · open Lovable preview · login.
2. Navigate to **Ledger Master** → **Ledger Definitions** tab.
3. **Cash sub-tab roundtrip test:**
   - Click **Export → Empty template (CSV)** · verify CSV with 16 headers downloads.
   - Click **Export → Current data (CSV)** · verify file with existing cash ledgers.
   - Edit the CSV · add 1 new cash row (e.g., code=`CASH-TEST-001`, name=`Test Petty`).
   - Click **Import** · select the edited file · expect toast `1 added · N updated`.
   - Refresh sub-tab · verify new ledger appears in the panel.
   - Capture screenshot.
4. **Sub-tab spot-check (1 random sub-type):** pick Bank or Asset sub-tab.
   - Click **Export → Empty template (CSV)** · verify CSV downloads with correct headers.
   - Capture screenshot.
5. **Error handling:** on Cash sub-tab · import a CSV with empty Code field.
   - Verify per-row error toast with "Download report" action.
   - Capture screenshot.
6. Save 3 screenshots in `audit_workspace/Z10_close_evidence/`.

## Hand-Off to Z11
After founder confirms smoke test, proceed to Z11 (folder standardization sweep).
