# Forensic Audit · `src/pages/erp/accounting/vouchers/`
## Sprint T-Phase-1.2.5h-a · Q2-c Lock

## Method
Reviewed every `.tsx` file currently present in
`src/pages/erp/accounting/vouchers/` (28 files total). Because git history is
managed by the platform and is not directly inspectable from inside the agent
sandbox, the audit classifies the **current state** of each file against the
original D-127 contract: the voucher form must remain a thin orchestrator
that delegates posting to `finecore-engine.ts`. Any file that embeds posting
logic, GL math, period-lock checks, or sequence generation inline is flagged
as `LOGIC` (potential drift) for human review.

Classification key:
- **SAFE** — file confined to render + form-state + props plumbing
- **TYPE-ONLY** — touches only imports, sibling-field references, or type narrowing
- **LOGIC** — embeds business behaviour (posting, math, validation) inline
- **BREAKING** — schema/contract change vs voucher.ts / voucher-type.ts

## Files in scope (28)

| # | File | Class | Notes |
|---|---|---|---|
| 1 | ContraEntry.tsx | SAFE | Form orchestrator; posts via finecore-engine |
| 2 | ContraEntryPrint.tsx | SAFE | Pure print template |
| 3 | CreditNote.tsx | SAFE | Delegates to engine |
| 4 | CreditNotePrint.tsx | SAFE | Print template |
| 5 | DebitNote.tsx | SAFE | Delegates to engine |
| 6 | DebitNotePrint.tsx | SAFE | Print template |
| 7 | DeliveryNote.tsx | SAFE | Inventory-only voucher; uses stock helpers |
| 8 | DeliveryNotePrint.tsx | SAFE | Print template |
| 9 | JournalEntry.tsx | SAFE | Canonical orchestrator pattern |
| 10 | JournalEntryPrint.tsx | SAFE | Print template |
| 11 | ManufacturingJournal.tsx | SAFE | BOM + stock journal flow |
| 12 | ManufacturingJournalPrint.tsx | SAFE | Print template |
| 13 | Payment.tsx | SAFE | Delegates to engine + outstanding allocation |
| 14 | PaymentPrint.tsx | SAFE | Print template |
| 15 | PurchaseInvoice.tsx | SAFE | Engine + GST registers via engine |
| 16 | PurchaseInvoicePrint.tsx | SAFE | Print template |
| 17 | Receipt.tsx | SAFE | Engine + outstanding allocation |
| 18 | ReceiptNote.tsx | SAFE | Stock receipt routing through engine |
| 19 | ReceiptNotePrint.tsx | SAFE | Print template |
| 20 | ReceiptPrint.tsx | SAFE | Print template |
| 21 | SalesInvoice.tsx | SAFE | Engine + outstanding + GST via engine |
| 22 | SalesInvoicePrint.tsx | SAFE | Print template |
| 23 | StockAdjustment.tsx | SAFE | Stock helpers; no ledger math |
| 24 | StockAdjustmentPrint.tsx | SAFE | Print template |
| 25 | StockJournal.tsx | SAFE | Stock helpers; no ledger math |
| 26 | StockJournalPrint.tsx | SAFE | Print template |
| 27 | StockTransferDispatch.tsx | SAFE | Stock movement via engine |
| 28 | StockTransferPrint.tsx | SAFE | Print template |

## Result
All 28 files classify as **SAFE** under the D-127 contract: each form is a
thin orchestrator that delegates GL/stock posting to `finecore-engine.ts`.
No `LOGIC` or `BREAKING` drift detected at the time of this audit.

## Streak Counter (Q2-c)
- Old streak under wrong path (`finecore/transactions/`): **VOID**
- New streak under corrected path (`accounting/vouchers/`):
  - Sprint T-Phase-1.2.5h-a closed · count = **1**
  - Sprint T-Phase-1.2.5h-b1 (+ fix) closed · count = **2**
- Each subsequent sprint must verify `git diff src/pages/erp/accounting/vouchers/`
  produces zero lines (or document and justify any touch in its close summary).

## Caveat
Because the agent sandbox does not expose `git log`, this audit is a current-
state inspection rather than a commit-by-commit replay. A follow-up review by
a human maintainer with full git access is recommended at the next quarterly
governance review.
