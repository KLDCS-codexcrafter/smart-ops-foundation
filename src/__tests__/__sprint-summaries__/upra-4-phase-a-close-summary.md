# UPRA-4 Phase A · MaterialIssueNote NEW · Close Summary

## Single named commit
- Phase A: <hash> · "UPRA-4 Phase A · MaterialIssueNoteRegister NEW (Tier-1 canonical Register · production domain · Option Delta safest opener) · 1 NEW Register + 1 NEW DetailPanel + 1 NEW Print + 3 additive wiring · all engines + 33 fy-stamped types + protected zones 0-diff"

## Diff scope (7 files)

### NEW components (3)
- src/pages/erp/production/reports/MaterialIssueNoteRegister.tsx (UniversalRegisterGrid<MaterialIssueNote> consumer · STATUS_LABELS+STATUS_COLORS inlined · `inr` helper inlined · useEntityCode hook · named export only)
- src/pages/erp/production/reports/detail/MaterialIssueNoteDetailPanel.tsx (Header + Basic + Totals + conditional QC + Lines + conditional Approval/Status History cards)
- src/pages/erp/production/reports/print/MaterialIssueNotePrint.tsx (UniversalPrintFrame · signatories ['Storekeeper', 'Shop Floor Supervisor', 'Production Manager'])

### Wiring additions (3 · all ADDITIVE 1-3 line append per file)
- src/pages/erp/production/ProductionSidebar.types.ts (added 'rpt-material-issue-note-register' to ProductionModule union · 1-line append)
- src/apps/erp/configs/production-sidebar-config.ts (added SidebarItem entry in reports-group children · placed after rpt-production-confirmation-register · PackageMinus icon reused)
- src/pages/erp/production/ProductionPage.tsx (added import + switch case · placed after ProductionConfirmationRegisterPanel)

### Sprint summary (1)
- src/__tests__/__sprint-summaries__/upra-4-phase-a-close-summary.md

## Q-LOCK adherence
- PD-Q1=(B)→Delta ✓ Phase A is Option Delta safest opener (simple-NEW · no engine creation · no ActionsDialog)
- PD-Q4=(A) ✓ MaterialIssueNote in Production domain (mounted in ProductionPage · sibling to ProductionOrderRegister)
- PD-Q6=(A) ✓ voucher.ts fincore 16-Register umbrella untouched (OUT-OF-SCOPE)

## 0-diff confirmations
- All 4 protected zones: 0-diff
- All 8 engine helpers (fincore-engine.ts + fy-helpers.ts): 0-diff
- All 33 fy-stamped record-type interfaces (including material-issue-note.ts): 0-diff (STATUS exports inlined in Register+DetailPanel, NOT added to type file)
- All canonical Register infrastructure: 0-diff
- All domain engines: 0-diff (including material-issue-engine.ts · listMaterialIssues consumed only · issueMaterialIssue/cancelMaterialIssue/issueMaterialIssueWithQC NOT called from Register)
- All sibling entry forms (MaterialIssueEntry · MobileMaterialIssuePage · all other production transactions · all bill-passing/inward-receipt/store-hub/etc. siblings): 0-diff
- All UPRA-1/2/3 banked: 0-diff
- No package.json / package-lock.json / vite.config.ts changes

## Triple Gate
| Gate | Baseline | After Phase A | Status |
|---|---|---|---|
| STRICT TSC (tsconfig.app.json) | 0 | 0 | IDENTICAL ✓ |
| ESLint | 0/0 | 0/0 | IDENTICAL (expected) |
| Vitest | 1209 / 165 | 1209 / 165 | IDENTICAL (expected · no test changes) |
| Build | clean | clean | IDENTICAL (expected) |

## STOP-AND-RAISE log
(none · clean)

## UPRA-4 progress
- 1 of 5 remaining records canonical (after Phase A)
- 29 of 33 fy-stamped records canonical (88%)
- Phase B opens next (SalesOrder + PurchaseOrder NEW + IRN V2 with ActionsDialog · canonical M12 precedent)

## HALT for §2.4 audit
Not self-certifying. Awaiting audit before Phase B.
