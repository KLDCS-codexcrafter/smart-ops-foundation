# UPRA-2 Phase B · ProductionOrderRegister V2 with Workflow Extraction · Close Summary

## Single named commit
- Phase B: <hash> · "UPRA-2 Phase B · production-order V2 + workflow-shell extraction (ProductionOrderActionsDialog) · Close action byte-identical parity attested"

## Diff scope (5 files)

### REPLACED in-place (1)
- src/pages/erp/production/reports/ProductionOrderRegister.tsx (183 → ~150 LOC · UniversalRegisterGrid<ProductionOrder> consumer · export name PRESERVED · sidebar route 0-diff · ProductionPage import 0-diff)

### NEW (3)
- src/pages/erp/production/reports/actions/ProductionOrderActionsDialog.tsx (~100 LOC · Close workflow shell · byte-identical engine call)
- src/pages/erp/production/reports/detail/ProductionOrderDetailPanel.tsx (~125 LOC · display-only · closure card when status='closed')
- src/pages/erp/production/reports/print/ProductionOrderPrint.tsx (~80 LOC · A4 portrait shop-floor PO doc)

### MODIFIED wiring
- (none · in-place V2 preserves all sidebar/page/route wiring)

## Q-LOCK adherence
- PB-Q1=(A) ✓ Print component included (matches Phase A precedent)
- PB-Q2 ✓ NEW DetailPanel built (no existing panel)
- PB-Q3=(A) ✓ Close ONLY in ActionsDialog · navigate-to-QC stays inline as row button
- PB-Q4=(B) ✓ Closure card displays variance_snapshot data (closed_at · closed_by_name · closure_remarks · closed_cost_snapshot · closed_variance_id) when status='closed'
- PB-Q5=(A) ✓ Tabs migrated to canonical statusOptions (6 ProductionOrderStatus values)

## Byte-identical parity attestation · Close Production Order action
- 5-char min validation: closureRemarks.trim().length < 5 → toast 'Closure remarks required (min 5 chars)' · BYTE-IDENTICAL
- closeProductionOrder engine call args: { po, closureRemarks: trim, closer: { id, name }, thresholdPct: config.varianceThresholdPct ?? 10 } · BYTE-IDENTICAL
- Success toast: `PO ${doc_no} closed` template literal · BYTE-IDENTICAL
- Error path: catch e → toast.error((e as Error).message) · BYTE-IDENTICAL
- Busy state guard: setBusy(true) → setBusy(false) in finally · BYTE-IDENTICAL
- Maker-checker NOT duplicated in UI · engine enforces · BYTE-IDENTICAL semantics
- Variance threshold default ?? 10 · BYTE-IDENTICAL

## navigate-to-QC URL preservation
- `/erp/qualicheck?m=inspection-list&po=${po.id}` · BYTE-IDENTICAL pattern · preserved as inline row action (per Q3)
- e.stopPropagation() added to prevent row-click conflict (cosmetic UX improvement)

## Triple Gate
| Gate | Baseline | After Phase B | Status |
|---|---|---|---|
| TSC (tsconfig.app.json) | 0 | 0 | IDENTICAL |
| Build | clean | clean | IDENTICAL |

## 0-diff confirmations
- All 4 protected zones: 0-diff
- production-engine.ts: 0-diff (closeProductionOrder consume-only)
- production-confirmation-engine.ts: 0-diff
- production-order.ts type interface + STATUS_LABELS + STATUS_COLORS: 0-diff
- UniversalRegisterGrid + UniversalRegisterTypes: 0-diff
- ProductionPage.tsx · production-sidebar-config.ts · ProductionSidebar.types.ts: 0-diff (in-place V2)
- ProductionTraceRegister.tsx: 0-diff
- All UPRA-1 and UPRA-2 Phase A banked files: 0-diff

## STOP-AND-RAISE log
(none · clean)

## HALT for §2.4 audit
Not self-certifying. Awaiting audit before UPRA-3.
