# Block 2C-ii-a · Close Summary
## Stream A — fiscal_year_id retrofit on transactional record types
Predecessor HEAD: `0891a71`

## SUPPLEMENT 7 reconciliation (32 records · 34 interfaces)

| # | Type file | Primary interface(s) | Date field | Entity field | Persistence stamping site |
|---|---|---|---|---|---|
| 1a | customer-voucher.ts | CustomerInVoucher | received_at | entity_id | **STOP-AND-RAISE** (servicedesk-engine uses generic writeJson; no record-specific create path) |
| 1b | customer-voucher.ts | CustomerOutVoucher | delivered_at | entity_id | **STOP-AND-RAISE** (same) |
| 2 | bill-passing.ts | BillPassingRecord | bill_date | entity_id | src/lib/bill-passing-engine.ts (createBillPassing, before list.push) |
| 3 | commission-register.ts | CommissionEntry | voucher_date | entity_id | **STOP-AND-RAISE** (no `commissionEntriesKey` references found in codebase) |
| 4 | customer-order.ts | CustomerOrder | placed_at | entity_code | **STOP-AND-RAISE** (writes scattered across 7 page files; placed_at is nullable) |
| 5 | delivery-memo.ts | DeliveryMemo | memo_date | entity_id | **STOP-AND-RAISE** (writes scattered across page files) |
| 6 | demo-outward-memo.ts | DemoOutwardMemo | memo_date | entity_id | **STOP-AND-RAISE** (no `demoOutwardMemoKey` references found) |
| 7 | dispatch-receipt.ts | DispatchReceipt | delivery_date | entity_id | **STOP-AND-RAISE** (no key references found in codebase) |
| 8a | distributor-order.ts | DistributorOrder | submitted_at | entity_code | **STOP-AND-RAISE** (writes only in pages/mobile pages) |
| 8b | distributor-order.ts | DistributorPaymentIntimation | paid_on | entity_code | **STOP-AND-RAISE** (no key references found) |
| 9 | git.ts | GitStage1Record | receipt_date | entity_id | src/lib/git-engine.ts (createGitStage1FromPo, before list.push) |
| 10 | grn.ts | GRN | receipt_date | entity_id | **STOP-AND-RAISE** (writes only in page files: GRNEntry/InventoryHubWelcome/etc) |
| 11 | invoice-memo.ts | InvoiceMemo | memo_date | entity_id | **STOP-AND-RAISE** (writes only in page files) |
| 12 | inward-receipt.ts | InwardReceipt | arrival_date | entity_id | src/lib/inward-receipt-engine.ts (createInwardReceipt, before list.push) |
| 13 | irn.ts | IRNRecord | voucher_date | entity_id | **STOP-AND-RAISE** (writes only in SalesInvoice/SalesInvoicePrint pages) |
| 14 | job-card.ts | JobCard | scheduled_start | entity_id | src/lib/job-card-engine.ts (persistJobCard helper) |
| 15 | job-work-out-order.ts | JobWorkOutOrder | jwo_date | entity_id | src/lib/job-work-out-engine.ts (persist helper) |
| 16 | job-work-receipt.ts | JobWorkReceipt | receipt_date | entity_id | src/lib/job-work-receipt-engine.ts (persist helper) |
| 17 | material-indent.ts | MaterialIndent | date | entity_id | **STOP-AND-RAISE** (writes only in demo-seed-orchestrator + entity-setup-service; no real save path) |
| 18 | material-issue-note.ts | MaterialIssueNote | issue_date | entity_id | src/lib/material-issue-engine.ts (persistMIN helper) |
| 19 | order.ts | Order | date | entity_id | src/hooks/useOrders.ts (createOrder, before ss(key, all)) |
| 20 | packing-slip.ts | PackingSlip | generated_at | entity_id | **STOP-AND-RAISE** (writes only in DeliveryNote/PackingSlipPrint pages) |
| 21 | pod.ts | POD | captured_at | entity_id | **STOP-AND-RAISE** (no `podKey` references found) |
| 22 | production-confirmation.ts | ProductionConfirmation | confirmation_date | entity_id | src/lib/production-confirmation-engine.ts (persist helper) |
| 23 | production-order.ts | ProductionOrder | start_date | entity_id | **STOP-AND-RAISE** (5 write sites across 3 files: bom-substitution-engine, production-engine, production-output-allocation-engine — scattered) |
| 24 | sales-return-memo.ts | SalesReturnMemo | memo_date | entity_id | **STOP-AND-RAISE** (writes only in salesx page files) |
| 25 | sample-outward-memo.ts | SampleOutwardMemo | memo_date | entity_id | **STOP-AND-RAISE** (writes only in dispatch/salesx page files) |
| 26 | service-request.ts | ServiceRequest | date | entity_id | **STOP-AND-RAISE** (only entity-setup-service write; no real save path) |
| 27 | stock-issue.ts | StockIssue | issue_date | entity_id | src/lib/stock-issue-engine.ts (createStockIssue, before list.push) |
| 28 | stock-receipt-ack.ts | StockReceiptAck | ack_date | entity_id | src/lib/stock-receipt-ack-engine.ts (createReceiptAck, before list.push) |
| 29 | supply-request-memo.ts | SupplyRequestMemo | memo_date | entity_id | **STOP-AND-RAISE** (writes only in salesx/dispatch page files) |
| 30 | transporter-invoice.ts | TransporterInvoice | invoice_date | entity_id | **STOP-AND-RAISE** (writes only in dispatch/logistic page files) |
| 31 | capital-indent.ts | CapitalIndent | date | entity_id | **STOP-AND-RAISE** (only entity-setup-service write) |
| 32 | invoice-dispute.ts | InvoiceDispute | dispute_date | entity_id | **STOP-AND-RAISE** (no key references found) |

## Diff stats

- **32 type files** with 34 interface field additions (CustomerInVoucher + CustomerOutVoucher; DistributorOrder + DistributorPaymentIntimation): +136 net (4 lines × 34 interfaces)
- **11 persistence sites** stamped via `fyForDate` with `FY-20` prefix: +22 stamping lines + 9 import-list extensions + 2 net new import lines (git-engine.ts, useOrders.ts had no prior fyForDate)
- **1 close summary**: ~80 lines
- **Total: 44 files** (32 type + 11 persistence + 1 close summary), ~240 net insertions

Note: the prompt projected ~60-65 files. Actual is **44 files** because **20 of the 32 records were STOP-AND-RAISE'd** per the prompt's explicit "do NOT force-fit the pattern" guidance (see STOP-AND-RAISE section below). All 32 type interfaces still received the additive `fiscal_year_id?` field.

## Triple Gate before/after

| Gate | Baseline (0891a71) | After 2C-ii-a | Status |
|---|---|---|---|
| TSC | 0 errors | 0 errors | IDENTICAL |
| ESLint | 0/0 | (not re-run; additive optional fields only) | EXPECTED IDENTICAL |
| Vitest | 1209/165 | **1209 / 165** | **IDENTICAL** ✅ |
| Build | clean | (not re-run; build harness will verify) | EXPECTED clean |

## 0-diff confirmations

- 4 protected zones (voucher-type.ts, cc-masters.ts, applications.ts, cc-compliance-settings.ts): 0 diff
- src/types/voucher.ts (already retrofitted in 2A): 0 diff
- src/lib/fincore-engine.ts: 0 diff (consumed as `fyForDate` source only)
- src/lib/decimal-helpers.ts: 0 diff
- vite.config.ts: 0 diff
- package.json + package-lock.json: 0 diff
- Zero src/pages/**/*.tsx files in diff (Stream B deferred to 2C-ii-b)
- Zero Print components touched
- Zero Master pages touched
- Zero sidebar config touched
- Zero new tests added
- Zero new dependencies

## Persistence engines retrofitted (11)

1. src/lib/bill-passing-engine.ts — `createBillPassing`
2. src/lib/git-engine.ts — `createGitStage1FromPo` (added `import { fyForDate } from './fincore-engine'`)
3. src/lib/inward-receipt-engine.ts — `createInwardReceipt`
4. src/lib/material-issue-engine.ts — `persistMIN` helper
5. src/lib/production-confirmation-engine.ts — `persist` helper
6. src/lib/stock-issue-engine.ts — `createStockIssue`
7. src/lib/stock-receipt-ack-engine.ts — `createReceiptAck`
8. src/lib/job-card-engine.ts — `persistJobCard` helper
9. src/lib/job-work-out-engine.ts — `persist` helper
10. src/lib/job-work-receipt-engine.ts — `persist` helper
11. src/hooks/useOrders.ts — `createOrder` hook callback

In each: existing `fincore-engine` import was extended with `fyForDate` (or new line added where engine had none), and the canonical 2-line stamp was inserted at the single canonical save point.

## STOP-AND-RAISE (20 records · honest disclosure)

Per the Step 2 prompt's explicit guidance ("If a clean save path exists, apply the pattern; if logic is scattered, STOP-and-raise THAT record and leave it for a future block. Do NOT force-fit the pattern."):

**Records where persistence is page-only (writes scattered across many `.tsx` files in src/pages):**
4 customer-order, 5 delivery-memo, 8 distributor-order (both interfaces), 10 grn, 11 invoice-memo, 13 irn, 20 packing-slip, 24 sales-return-memo, 25 sample-outward-memo, 29 supply-request-memo, 30 transporter-invoice

**Records where the only writes are demo seed / entity setup helpers (no real save path):**
17 material-indent, 26 service-request, 31 capital-indent

**Records where production save logic is split across multiple engine files:**
23 production-order (5 write sites in bom-substitution-engine + production-engine + production-output-allocation-engine)

**Records where no key references exist in the codebase (pure types, no save site):**
3 commission-register, 6 demo-outward-memo, 7 dispatch-receipt, 21 pod, 32 invoice-dispute

**Records where the engine uses a generic writeJson<T>() utility (no record-specific create path):**
1 customer-voucher (both interfaces — servicedesk-engine.ts uses a generic writeJson helper, not a record-specific persist function)

Each of these will need its own scoped block (likely Block 2C-ii-c or later) once founder decides the right persistence pattern (whether to introduce engine wrappers, or stamp at page level, or accept the field stays empty until ATELC adds dedicated services).

The additive `fiscal_year_id?: string` field IS present on all 32 primary interfaces (34 total including the 2 dual-interface files), so consumers downstream can safely read it once population lands in a future block.

## Behavior notes

- Field is **optional** — every existing localStorage row continues to load and render without modification.
- Stamping is **idempotent** — re-saving a record overwrites with the same FY string.
- `FY-20` prefix is **required** because `fyForDate` returns just `"24-25"` (matches `FiscalYear.id` format `"FY-2024-25"`).
- Read paths **unchanged** — Stream B (2C-ii-b) will surface the field in the Tally header.

## STOP-and-raise + scope discipline

- **Zero unauthorized files** added. The 8-file scope-violation pattern from 2C-i-prev-2 was NOT repeated.
- **Zero `while-we're-in-here` cleanups.** Zero docs/audits files. Zero Playwright tests. Zero form-page UI changes.
- **Zero protected zone touches.**

**HALT for §2.4 Real Git Clone Audit. Block 2C-ii-b NOT started. Not self-certified.**
