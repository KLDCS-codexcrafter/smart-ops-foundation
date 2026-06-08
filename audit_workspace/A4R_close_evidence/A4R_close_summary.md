# A.4-Residual Close Summary · T-A4R-Dispatch-Residual

**Pillar:** A · **Predecessor HEAD:** `d9556537` (A.5 banked · 102 ⭐) · **Target:** 103 ⭐
**Posture:** staged · CONSUMES existing dispatch/WMS/FinCore surfaces · NEVER rebuilds.

## Bucket Disposition (FT-Dispatch / Pending_Work §2)

| Item | Title | Tier | Disposition (A.4R) | Consumes-Existing |
|------|-------|------|--------------------|-------------------|
| 005 | Sample non-refundable → expense | Tier-L | **LIVE** · `bookSampleExpense` wraps `postSampleExpenseVoucherForSOM` + `postMarketingExpenseVoucherForDOM` | `sample-expense-voucher-engine` · FinCore postVoucher path |
| 006 | Refundable sample return → stock | Tier-L | **LIVE** · `returnRefundableSampleToStock` wraps `postStockTransferForReturnedSampleSOM` | `sample-expense-voucher-engine` · FinCore stock-transfer path |
| 007 | Packing-material purchase → replenishment | Tier-L | **LIVE** · `triggerPackingReplenishment` + new `PackingReplenishmentSuggestions` surface | `PackingMaterialMaster` levels (`current_stock`/`reorder_level`) |
| 012 | Demo-serial register | Tier-L | **LIVE** · `buildDemoSerialRegister` + new `DemoSerialRegister` surface | `DemoOutwardMemo.items[].serial_no` |
| 016 | GPS shipment tracking | Tier-XL | **EXCLUDED · Wave-2** (Bucket-2 · external GPS API) | grep=0 |
| 017 | ML transit ETA | Tier-XL | **EXCLUDED · Wave-2** (Bucket-2 · ML model) | grep=0 |
| 018 | Packing-BOM variance → supplier feedback | Tier-L | **LIVE** · `computePackingBomVariance` (math) + `emitBomVarianceToSupplier` (SEAM-ONLY outbox · reason `wave2_supplier_portal_absent`) | Planned/actual BOM lines · existing `packing-bom-engine` consumed |
| 020 | Reusable-packing return tracking | Tier-L | **LIVE** · `summarizeReusablePacking` + new `ReusablePackingReturn` surface | `ReturnablePackaging` master · `useReturnablePackaging` hook |
| 021 | Driver mobile app | Tier-XL | **EXCLUDED · Wave-2** (Bucket-2 · driver-app) | grep=0 |
| 022 | Courier rate compare | Tier-L | **LIVE** · `compareCourierRates` + new `CourierRateCompare` surface · honest empty when no cards | `TransporterRateCard.zone_rates` · `minimum_chargeable` |
| 023 | Dispatch analytics | Tier-L | **LIVE** · `buildDispatchAnalyticsSnapshot` + new `DispatchAnalytics` surface · `honest_empty` flag | `deliveryMemosKey` · `sampleOutwardMemosKey` · `demoOutwardMemosKey` · reusable + replenishment |

**Result:** 7/7 Bucket-3 items shipped · 3 Bucket-2 items honestly EXCLUDED.

## New SIBLING (exactly 1)

- **`src/lib/dispatch-residual-engine.ts`** · 9 exports · pure aggregator over existing dispatch/WMS/FinCore surfaces · no duplicate accounting · no GPS / ML / external courier API.

## New Surfaces (6 · all PageFloorShell-mounted · presentation-only)

| Surface | Module ID | Engine Call | Item |
|---------|-----------|-------------|------|
| `transactions/SampleDemoResidualActions.tsx` | `dops-t-residual-actions` | `bookSampleExpense` · `returnRefundableSampleToStock` | 005 · 006 |
| `reports/PackingReplenishmentSuggestions.tsx` | `dops-r-packing-replenishment` | `triggerPackingReplenishment` | 007 |
| `reports/DemoSerialRegister.tsx` | `dops-r-demo-serial-register` | `buildDemoSerialRegister` | 012 |
| `reports/CourierRateCompare.tsx` | `dops-r-courier-rate-compare` | `compareCourierRates` | 022 |
| `reports/ReusablePackingReturn.tsx` | `dops-r-reusable-packing-return` | `summarizeReusablePacking` | 020 |
| `reports/DispatchAnalytics.tsx` | `dops-r-dispatch-analytics` | `buildDispatchAnalyticsSnapshot` | 023 |

## Walls Held (0-DIFF)

- `DemoOutwardIssue.tsx`, `SampleOutwardIssue.tsx` — issue/memo core logic byte-identical · residual actions live on the NEW surface.
- `PackingMaterialMaster.tsx`, `PackingSlipPrint.tsx`, `DeliveryMemoEntry.tsx`, `DispatchExceptions.tsx`, `EWBMonitor.tsx` — untouched.
- WMS engines (`wms-pick-pack-engine`, `wms-putaway-engine`, `wms-manifest-engine`) — untouched.
- `transporter-rate.ts`, `sample-expense-voucher-engine.ts`, `fincore-engine.ts`, `packing-bom-engine.ts` — consumed read-only.
- `audit-trail-engine.ts` — no new audit type · reuses `dispatch_txn_event`.
- hash-chain · retention · `applications.ts` · entitlements · routes — untouched.
- `DispatchOpsSidebar` existing module IDs preserved · new items appended only.

## History & Sibling-Register

- A.5 row flipped from `TBD_AT_BANK` → `d9556537`.
- A.4R row appended with `predecessorSha: 'd9556537'` · `newSiblings: ['dispatch-residual-engine']`.
- `sibling-register.ts` row appended for `dispatch-residual-engine`.

## Acceptance Criteria

| AC | Status |
|----|--------|
| AC1 Block-0 6/6 + Bucket-3 greenfield + consume-surfaces confirmed | PASS |
| AC2 ONE new engine + register row | PASS (`dispatch-residual-engine`) |
| AC3 005/006/007 consume FinCore/stock paths (no duplicate accounting) | PASS |
| AC4 022 courier compare honest-empty when no rate cards | PASS (test asserts) |
| AC5 023 analytics aggregates existing data (no fabricated metrics) | PASS (`honest_empty` flag + test) |
| AC6 012 serial register reads `serial_no` (no fabricated serials) | PASS (test asserts skip-on-empty) |
| AC7 GPS/ML/external-courier-API ABSENT (Bucket-2 excluded) | PASS (grep · §H guard) |
| AC8 existing dispatch/WMS surfaces 0-DIFF except additive | PASS |
| AC9 ≥20 it() green | PASS (28 it() in `src/test/sprint-a4r/`) |
| AC10 history + A.5 flip | PASS |
| AC11 walls zero diff | PASS |
| AC12 no new deps · Triple Gate · close summary with disposition table | PASS |

## Streak

102 → **103 ⭐**
