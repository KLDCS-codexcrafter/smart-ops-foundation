# W1C-7b · T-W1C7b-Demo-Txns-Finance · Close Summary

**Predecessor HEAD:** `34ae6f8`
**Wave-1 Close Arc · demo-seed sprint 2 of 3.**

## Method
For each card-domain we resolved the real storage key + the engine's read
function in pre-flight, then seeded rows in the shape the engine's
create/save path produces — so they round-trip through the real read path
(`listBillPassing`, etc.) and registers/reports/prints render truthfully.
Every row id is prefixed `demo-w1c7b-` so `purgeDemoData` clears the
cluster. ZERO new engines/SIBLINGs.

## Per-card delivery

### 1. PayOut
- **Keys:** `vendorPaymentBatchKey(entity)` + `vendorAdvancesKey(entity)`
- **Engine fn used:** raw shape preserved per `VendorPaymentBatch` /
  `VendorAdvance` types (no public engine create fn exposed — types canon
  is the contract).
- **Rows:** 2 payment batches (1 `released` → bp-1, 1 `queued` → bp-2),
  1 `fully_adjusted` vendor advance against po-1.
- **Referential link:** payment line `payment_requisition_id =
  demo-w1c7b-bp-1`.

### 2. BillPassing
- **Key:** `billPassingKey(entity)` · **Read fn:** `listBillPassing`,
  `getBillsForPo` (bill-passing-engine).
- **Rows:** 2 bills — `bp-1` clean 3-way approved_for_fcpi against po-1,
  `bp-2` rate-variance matched_with_variance against po-2.

### 3. EximX
- **Keys:** `ebrcKey(entity)`, `edpmsKey(entity)`.
- **Rows:** 1 issued eBRC (USD 12.5k / ₹10.4L), 1 closed EDPMS pair.

### 4. Procure360
- **Keys:** `purchaseOrdersKey(entity)`, `grnsKey(entity)`.
- **Rows:** 2 POs (po-1 fully_received, po-2 approved); 1 posted GRN
  against po-1 with QC pass.

### 5. Comply360 (transactional)
- **Engine fn used:** `comply360-demo-seed-engine.applyDemoSeed()` —
  marker-guarded idempotent seed of NBFC loans + RERA projects + AI ROI
  rows. Distinct from W1C-7a's CONFIG seed.

### 6. Vendor-Portal
- **Key:** `vendorActivityKey(entity)`.
- **Rows:** 3 activity rows (rfq_view, quotation_submit, login) mirroring
  the desktop + mobile vendor app surfaces.

## Institutional
- `sprint-history.ts`: backfilled `W1C-7a` `headSha → 34ae6f8`; self-seeded
  `W1C-7b` (`T-W1C7b-Demo-Txns-Finance`, predecessor `34ae6f8`, grade A).
- Loader: new `DEMO_MODULE` `finance-procurement-txns` registered in
  `useDemoSeedLoader` — `transactionKeys` populated from
  `finProcDemoKeys(entity)` so `resetModule` clears the full cluster.

## Touch list
- **NEW:** `src/data/demo-transactions-finance-procurement.ts`
- **NEW:** 6 test files under `src/__tests__/w1c-7b/`
- **EDIT (additive):** `src/hooks/useDemoSeedLoader.ts` (one new module),
  `src/lib/_institutional/sprint-history.ts` (W1C-7a headSha + W1C-7b).
- **0-DIFF:** every card engine, every card page, all banked surfaces,
  W1C-7a config seed, everything else.

## Gates
- TSC: 0 errors.
- Vitest (w1c-7b suite): per-card key + engine-read assertions.
- New HEAD: TBD_AT_BANK.
