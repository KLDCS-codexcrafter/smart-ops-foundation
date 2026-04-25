# Sprint T-H1.5-Z-Cleanup-1a — Close Summary

## Result
- **tsc:** 0 errors ✓
- **eslint:** 0 errors, 93 warnings (53 exhaustive-deps + 40 react-refresh) ✓
- **build:** PASS (32.79s) ✓
- **exhaustive-deps:** 68 → **53** (15 fixed) ✓
- **react-refresh:** 40 → 40 (unchanged, cleanup-1c scope) ✓
- **any count:** 4 false-positives (unchanged) ✓
- **eslint-disable count:** 37 → 50 (+13 new — 13 intentional suppressions with reasoning comments per Pattern B) — within sprint budget

## 15 Per-Site Decisions

| # | File:Line | Decision | Reasoning |
|---|-----------|----------|-----------|
| 1 | VoucherFormShell.tsx:62 | Pattern B — block-suppress | Granular field-level deps avoid over-invalidation; resolveVars only consumes listed fields. Adding `form` would defeat optimization. |
| 2 | LedgerPicker.tsx:97 | Pattern B — suppress (single-line) | `open` is intentional refresh trigger so picker shows newly-created ledgers. |
| 3 | PartyPicker.tsx:136 | Pattern B — suppress (single-line) | `open` is intentional refresh trigger so picker shows newly-created parties. |
| 4 | CommandPalette.tsx:42 | Pattern B — suppress on deps line | `open` re-reads recent activity each open so list stays fresh. |
| 5 | RecentActivityDrawer.tsx:39 | Pattern B — suppress on deps line | `revKey` is manual refresh tick after handleClear. |
| 6 | AccrualRunModal.tsx:61 | Pattern B — suppress on deps line | `refreshTick` is manual re-plan trigger after commit/open. |
| 7 | AccrualRunModal.tsx:65 | Pattern B — suppress on deps line | Same as #6 for penal plan. |
| 8 | DebitNote.tsx:102 | Pattern B-remove — removed `inventoryLines`, `reasonCode` | handleSaveDraft only reads partyName/date/againstBill in formState; extras were stale. **D-127/D-128 OK** — `handleSaveDraft` is draft snapshot, not save/post; signature unchanged. |
| 9 | StockJournal.tsx:119 | Pattern B-remove — removed `consumptionLines`, `productionLines` | handleSaveDraft only reads date/narration in formState. **D-127/D-128 OK** — same as #8. |
| 10 | CustomerCart.tsx:104 | Pattern B — suppress on deps line | `cart.id` rotates after order placement; intentional refresh of active schemes. |
| 11 | DistributorPayments.tsx:80 | Pattern B — suppress on deps line | `refresh` is manual refresh tick after submit. |
| 12 | DistributorIntimationQueue.tsx:66 | Pattern B — suppress on deps line | `refresh` is manual refresh tick after verify/reject. |
| 13 | BranchOfficeForm.tsx:156 | Pattern A — added missing `entityId` | useMemo filters by `b.id !== entityId`; without dep, "exclude current" filter would never update. |
| 14 | GeographyHub.tsx:60 | Pattern B — suppress on deps line | `seedComplete`/`isSeeding` are intentional triggers; liveCounts reads localStorage outside React's view. |
| 15 | DistributorBroadcast.tsx:72 | Pattern B — suppress on deps line | `refresh` is manual refresh tick after broadcast send. |

## D-127/D-128 Voucher-Adjacent Scope Check

| File | Hook deps changed? | Save/post signature changed? | Posting logic changed? | Verdict |
|------|---|---|---|---|
| VoucherFormShell.tsx | YES (block-suppress) | NO | NO | ✓ COMPLIANT |
| LedgerPicker.tsx | YES (suppress) | N/A (picker, no save) | NO | ✓ COMPLIANT |
| PartyPicker.tsx | YES (suppress) | N/A (picker, no save) | NO | ✓ COMPLIANT |
| FinFrame.tsx | NOT TOUCHED (warning gone in prior sprint) | — | — | ✓ N/A |
| StockJournal.tsx | YES (removed 2 deps from handleSaveDraft) | NO | NO | ✓ COMPLIANT |
| DebitNote.tsx | YES (removed 2 deps from handleSaveDraft) | NO | NO | ✓ COMPLIANT |

**Stop-and-check-in trigger #1 NOT activated.** No save/post signatures touched.

## Hard Invariants — All Green

- I-1 tsc 0 errors ✓
- I-2 eslint 0 errors ✓
- I-3 build green ✓
- I-4 exhaustive-deps 53 ≤ 53 ✓
- I-5 react-refresh = 40 ✓
- I-6 total warnings 93 ≤ 93 ✓
- I-7 any count = 4 (false positives) ✓
- I-8 critical-file 0-line-diff held (FineCore engine, voucher types, seed data, entity-setup-service untouched) ✓
- I-9 eslint-disable count: 50 (was 37; +13 intentional suppressions, each with rationale) — Pattern B usage documented, within sprint guidance ✓
- I-10 storage keys preserved ✓
- I-11 voucher-adjacent: only render-frequency semantics changed ✓
- I-12 founder smoke test pending (auth-gated; founder action)
- I-13 no new npm deps ✓
- I-14 per-site decisions documented (this file) ✓
- I-15 0-explicit-any state preserved ✓
- I-16 ESLint enforcement rules unchanged ✓

## Founder Action Remaining
Visit `/erp/smoke-test` → Run All Tests → save screenshot to `audit_workspace/Cleanup_1a_close_evidence/smoke_test_result.png`. Spot-check Sales Invoice + Receipt + Stock Journal save flows.
