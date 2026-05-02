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
| 1.2.6a | closed | 6 |
| 1.2.6b | closed | 7 |
| 1.2.6b-fix | closed | 8 |
| 1.2.6b-rpt | closed | 9 |
| 1.2.6b-rpt-fix | closed | 10 |
| 1.2.6c | closed | 11 |
| 1.2.6d | closed | 12 |
| 1.2.6d-hdr | closed | 13 |
| 1.2.6d-hdr-fix | closed (fyForDate split · react-refresh fixed) | 13 |
| 1.2.6e-tally-1 | closed | 14 |
| 1.2.6e-tally-1-fix | closed (all 12 form mounts · 6 missing UseLastVoucherButton + SRM MultiSourcePicker + 4 effective_date inputs) | 14 |
| 2.7-a | closed | 15 |
| 2.7-a-fix | closed (HSN auto-resolve on 4 forms + streak doc cleanup) | 15 |
| 2.7-b | closed (VoucherClassPicker · field-rule-engine · SaveButtonGroup · MobileApprovalsPage · ApprovalsPendingPage · VoucherClassMaster · 12 form mounts · 8 new tests · 224/224) | 16 |
| 2.7-c | closed | 17 |
| 2.7-d-1 | closed (Stock viz Q1-d · Save-and-New Q4-d · auto-save draft + recovery dialog · smart defaults extensions · 6 new tests · 241/241) | 18 |
| 2.7-d-2 | closed (Universal keyboard nav · bulk-paste · line-item search · help overlay · 248/248) | 19 |

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
