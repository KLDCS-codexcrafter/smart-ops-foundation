# Cleanup-1a Sites In Scope (15 total)

| # | File | Line | Hook | Issue |
|---|------|------|------|-------|
| 1 | components/finecore/VoucherFormShell.tsx | 59:77 | useMemo | missing dep 'form' |
| 2 | components/finecore/pickers/LedgerPicker.tsx | 97:58 | useMemo | unnecessary dep 'open' |
| 3 | components/finecore/pickers/PartyPicker.tsx | 136:64 | useMemo | unnecessary dep 'open' |
| 4 | components/layout/CommandPalette.tsx | 42:5 | useMemo | unnecessary dep 'open' |
| 5 | components/layout/RecentActivityDrawer.tsx | 39:5 | useMemo | unnecessary dep 'revKey' |
| 6 | features/loan-emi/components/AccrualRunModal.tsx | 61:5 | useMemo | unnecessary dep 'refreshTick' |
| 7 | features/loan-emi/components/AccrualRunModal.tsx | 65:5 | useMemo | unnecessary dep 'refreshTick' |
| 8 | pages/erp/accounting/vouchers/DebitNote.tsx | 102:6 | useCallback | unnecessary deps 'inventoryLines','reasonCode' |
| 9 | pages/erp/accounting/vouchers/StockJournal.tsx | 119:6 | useCallback | unnecessary deps 'consumptionLines','productionLines' |
| 10 | pages/erp/customer-hub/transactions/CustomerCart.tsx | 104:5 | useMemo | unnecessary dep 'cart.id' |
| 11 | pages/erp/distributor/DistributorPayments.tsx | 80:6 | useMemo | unnecessary dep 'refresh' |
| 12 | pages/erp/finecore/DistributorIntimationQueue.tsx | 66:5 | useMemo | unnecessary dep 'refresh' |
| 13 | pages/erp/foundation/BranchOfficeForm.tsx | 156:3 | useMemo | missing dep 'entityId' |
| 14 | pages/erp/foundation/geography/GeographyHub.tsx | 60:6 | useMemo | unnecessary deps 'isSeeding','seedComplete' |
| 15 | pages/erp/salesx/DistributorBroadcast.tsx | 72:5 | useMemo | unnecessary dep 'refresh' |

NOTE: FinFrame.tsx 426:6 listed in original prompt is no longer present — fixed in prior Z1b.2c work.
