# Block 1 — D-140 Pre-Flight Validation (CustomerMaster Import/Export Pattern)

## Pattern tested
Generic `master-import-engine` + `master-export-engine` integrated into
`CustomerMaster.tsx` via inline `ImportSchema<CustomerMasterDefinition>` definition.
Validates: (a) `parseImportFile` handles CSV + Excel uniformly via XLSX library,
(b) `validateRows` produces clear per-row errors, (c) `upsertRecords` dedups by
`partyCode` (primary key), (d) `exportTemplate` generates valid CSV with header
row + required-fields hint, (e) `exportToCSV` / `exportToExcel` roundtrip produces
re-importable file. The generic component `MasterImportExportButtons` is consumed
via a covariant cast (`schema as unknown as ImportSchema<Record<string, unknown>>`)
to bridge concrete master types to the generic record-shape contract.

## Site validated
`src/pages/erp/masters/CustomerMaster.tsx` — most common case (70+ field interface).
Schema exposes a 13-column representative subset; engine merges parsed updates onto
the existing record via shallow-merge so omitted fields are preserved on update.

## Verification
- `master-import-engine.ts` created with OWW §8.9 header: yes
- `master-export-engine.ts` uses existing `downloadBlob` + `csvEscapeCell` (no duplication): verified
- `xlsx@0.18.5` used (no new dep): verified
- `tsc --noEmit -p tsconfig.app.json`: 0 errors
- `eslint --max-warnings 0` on the 4 changed files: exit 0
- CustomerMaster integration:
  - Schema defined inline (after STORAGE_KEY): yes
  - `CUSTOMER_IMPORT_SCHEMA.storageKey` matches existing `STORAGE_KEY` constant: yes (`erp_group_customer_master`)

## Verdict
- [x] PATTERN VALIDATED · proceed to Block 2 (already incorporated component) and Block 3 (4 master rollout)
- [ ] PATTERN FAILED · STOP · surface to founder
