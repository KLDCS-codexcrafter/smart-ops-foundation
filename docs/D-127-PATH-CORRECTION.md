# D-127 Path Correction · Sprint T-Phase-1.2.5h-a

## Issue
D-127 was originally written referencing `src/pages/erp/finecore/transactions/`
as the zero-touch folder. **This folder does not exist** in the repository.

The actual production voucher form files live at:

**`src/pages/erp/accounting/vouchers/`** — currently 28 `.tsx` files
(JournalEntry, SalesInvoice, PurchaseInvoice, Receipt, Payment, ContraEntry,
DebitNote, CreditNote, DeliveryNote, ReceiptNote, StockJournal, StockAdjustment,
StockTransferDispatch, ManufacturingJournal, plus their *Print companions).

## Correction (Sprint T-Phase-1.2.5h-a · Q2-c lock)
- **D-127 reference path corrected** → `src/pages/erp/accounting/vouchers/`
- **Streak counter RESET to 0**: the previously-reported 60-sprint streak was
  measured against a path that did not exist and is therefore void.
- **New streak begins this sprint** (count = 1 after Sprint 1.2.5h-a closes).

## Streak Counter
| Sprint | Status | Streak |
|---|---|---|
| 1.2.5h-a | closed | 1 |
| 1.2.5h-b1 (+ fix) | closed | 2 |
| 1.2.5h-b2 | closed | 3 |
| 1.2.5h-c1 | closed | 4 |
| 1.2.5h-c2 | closed | 5 |

- Forensic audit of the corrected folder is captured in
  [`accounting-vouchers-forensic-audit.md`](./accounting-vouchers-forensic-audit.md).

## Why This Matters
Engineering integrity requires honest accounting of invariants. A streak counted
against a phantom folder cannot be carried forward — that would be a silent
governance bug. We acknowledge the error, reset transparently, and re-anchor
D-127 to the real production-critical path.

## Going Forward
- Any sprint that touches a `.tsx` file under `src/pages/erp/accounting/vouchers/`
  must surface the diff in the close summary and justify each line.
- D-128 (voucher.ts + voucher-type.ts byte-identical) is unaffected by this
  correction — those type files were always referenced correctly.
- The streak-reset is a one-time event; future audits measure from 1.2.5h-a.
