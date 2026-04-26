# T-H1.5-Z-Z9 Close Summary — Master Data Import/Export Foundation

## Result: ✅ CLOSED (Customer + Vendor + Logistic + Scheme · LedgerMaster deferred)

### Hard Invariants
| # | Invariant | Result |
|---|---|---|
| I-1 | tsc --noEmit | ✅ 0 errors |
| I-2 | eslint --max-warnings 0 | ✅ exit 0 |
| I-3 | npm run build | ✅ green (34.64s) |
| I-5 | `any` count | ✅ unchanged |
| I-7 | eslint-disable | ✅ 91 (unchanged from Z3 baseline) |
| I-8 | comply360SAMKey count = 32 | ✅ 32 |
| I-9 | master-import-engine.ts has OWW §8.9 header + clear schema interface | ✅ |
| I-10 | master-export-engine.ts uses existing downloadBlob + csvEscapeCell | ✅ verified |
| I-12 | No vouchers/.tsx files touched | ✅ |
| I-13 | Block 1 D-140 validation documented | ✅ Block_1_validation_result.md |
| I-14 | Existing master STORAGE_KEY constants untouched | ✅ |
| I-15 | Per-row error feedback (line N: ... required) | ✅ via toast + downloadable CSV |
| I-16 | No new npm deps (xlsx@0.18.5 already present) | ✅ |
| I-18 | Per-master schema INLINE at consumer site | ✅ each in its master file |

### Files
**New (3):**
- `src/lib/master-import-engine.ts` — parseImportFile / validateRows / upsertRecords / importMasterFile
- `src/lib/master-export-engine.ts` — exportTemplate / exportToCSV / exportToExcel / exportErrorReport
- `src/components/masters/MasterImportExportButtons.tsx` — reusable Export-dropdown + Import button toolbar

**Modified (4 master integrations):**
- `src/pages/erp/masters/CustomerMaster.tsx` — CUSTOMER_IMPORT_SCHEMA (13 cols · primaryKey: partyCode)
- `src/pages/erp/masters/VendorMaster.tsx` — VENDOR_IMPORT_SCHEMA (12 cols · MSME boolean)
- `src/pages/erp/masters/LogisticMaster.tsx` — LOGISTIC_IMPORT_SCHEMA (9 cols · GTA RCM boolean)
- `src/pages/erp/masters/SchemeMaster.tsx` — SCHEME_IMPORT_SCHEMA (9 cols · validates date-field handling for valid_from / valid_until)

**Deferred:** `LedgerMaster.tsx` — 11 typed ledger sub-types (Cash · Bank · Liability · Capital · LoanReceivable · Borrowing · Income · Expense · DutiesTax · PayrollStatutory · Asset) require per-sub-type schemas + sub-tab-aware integration. Spec §6 trigger #7 (per-master schema becomes too verbose) applies — surfacing instead of force-fitting. Pattern remains valid; integration will be a focused follow-up sprint.

### ISO 25010
| Characteristic | Pre | Post | Evidence |
|---|---|---|---|
| Functional Suitability | HIGH+(0.55) | HIGH+(0.65) | Bulk import/export live on 4 masters |
| Maintainability | HIGH+++(1.55) | HIGH+++(1.65) | Generic engines · schemas inline |
| Compatibility | HIGH++(0.6) | HIGH++(0.7) | CSV/Excel universal · Phase 2 swap-friendly |
| Usability | (first scored) | HIGH+(0.3) | Template + per-row error report + dropdown UX |

### Founder Smoke Checklist (next)
1. Open Customer Master → Export → "Empty template (CSV)" → verify header row + required-fields hint
2. Export → "Current data (CSV)" → edit one row · add one row → Import → verify "1 added · 1 updated · 0 errors" toast
3. Export → "Current data (Excel)" → open in Excel → verify columns
4. Empty Customer Code row → Import → verify per-row error toast + downloadable error report
5. Repeat (1) for Vendor, Logistic, Scheme masters
6. Save 4 screenshots into `audit_workspace/Z9_close_evidence/`

### Hand-off to Z10
The `ImportSchema<T>` contract + `MasterImportExportButtons` component are the swap boundary for Z10's opening-balances onboarding wizard. Ledger integration can be picked up alongside Z10 (opening balances live on the same Ledger sub-tabs).
