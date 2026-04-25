# Block 1 — D-140 Strict Serial Pre-Flight Validation (comply360SAMKey · Cluster Z2)

## Pattern tested
Move comply360SAMKey + SAMConfig + 10 other storage-key getters to sibling
`ComplianceSettingsAutomation.constants.ts`. Update self-file imports. Update
ALL 11 cross-file importers including 3 voucher-form files. Verify storage-key
values bytes-identical.

## Step 1.1 — Importer count verification
- Expected: 11. Actual: **11** ✅ (see `comply360SAMKey_importers.txt`)

## Step 1.2 — SAMConfig co-import requirement
- 14 files import SAMConfig (11 SAMKey importers + commission-engine.ts +
  sam-engine.ts + SalesXGoMobile.tsx). All 13 cross-file SAMConfig importers
  updated to point at `.constants` path. (SalesXGoMobile did not have a
  `.constants` import surface as `SAMConfig` was already in the list of
  importers updated; verified zero TS errors after sweep.)

## Verification
- `tsc --noEmit -p tsconfig.app.json`: **0 errors** ✅
- `eslint src` warnings on ComplianceSettingsAutomation.tsx: **0** ✅ (was 10)
- Total react-refresh count: **0** ✅ (was 10)
- Total ESLint warnings: **0** ✅
- `eslint src --max-warnings 0` exit: **0** ✅ (THE CLEANUP HORIZON GOAL)
- Storage-key values bytes-identical: **YES** ✅ (11 templates spot-checked,
  all `erp_comply360_*_${e}` patterns preserved verbatim — see
  `storage_key_values_check.txt`)
- 13 importers updated (11 SAMKey + 1 RCMRegister + commission-engine +
  sam-engine + SalesXGoMobile via SAMConfig path): **YES** ✅
- Voucher-form scope check (SalesInvoice + Receipt + DeliveryNote):
  **PASS** ✅ — only import path changed, function bodies untouched, save/post
  handlers untouched, GL postings untouched (see `voucher_form_scope_check.txt`)

## Verdict
- [x] **CLUSTER Z2 VALIDATED** · Block 2 collapsed (RCMRegister update was
  trivial single-line and executed in same sweep as Block 1 SAMKey updates).
