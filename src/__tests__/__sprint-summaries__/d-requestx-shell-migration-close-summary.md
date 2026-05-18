# Sprint D · RequestX Shell Migration · Close Summary

**Sprint ID**: T-Phase-1.D-RequestX-Shell-Migration
**Predecessor HEAD**: 4cb731a (TXUI-2 banked · 11-streak preserved · FR-81 promoted)
**Date**: May 18, 2026

## §1 · Sprint Outcome

- 5th FR-81 canonical-pattern adoption application
- 6th Shell migration in canonical sibling family (after Procure360 · StoreHub · SupplyX · StoreHub T1 · MaintainPro)
- RequestX brought to canonical baseline · last active business card unmigrated from deprecated ERPHeader + hand-rolled sidebar

## §2 · Files Changed

| File | Action |
|---|---|
| `src/apps/erp/configs/requestx-sidebar-config.ts` | NEW |
| `src/apps/erp/configs/requestx-shell-config.ts` | NEW |
| `src/pages/erp/requestx/RequestXPage.tsx` | REPLACED |
| `src/pages/erp/requestx/RequestXSidebar.tsx` | DEPRECATED (JSDoc only · code 0-diff) |
| `src/pages/erp/requestx/RequestXSidebar.groups.ts` | DEPRECATED (JSDoc only · code 0-diff) |
| `src/__tests__/__sprint-summaries__/d-requestx-shell-migration-close-summary.md` | NEW |

## §3 · D-Q Resolution

- D-Q1=A single sprint
- D-Q2=A `r *` keyboard prefix
- D-Q3=A `'rose'` accent (Step 2 pre-flight adjusted from `'orange'` per ThemeAccent union validation)
- D-Q4=A Transactions group default-open preserved
- D-Q5=A all 17 items declare `requiredCards: ['requestx']`
- D-Q6=A hash routing enabled
- D-Q7=A hand-rolled files deprecated with JSDoc
- D-Q8=A Sprint A Vendor Portal opens next

## §4 · Carry-Forward Invariants Verified

- All 17 RequestX panels · 0-diff
- `RequestXModule` type union · 0-diff verbatim (D-NEW-CC)
- All 3 RequestX reading hooks · 0-diff
- All localStorage keys · 0-diff
- NO new `logAudit()` calls
- NO test file changes
- NO package.json changes

## §5 · Triple Gate Target

- STRICT TSC: 0 errors
- ESLint: 0/0
- Vitest: IDENTICAL count
- Build: clean

## §6 · Forward State

Next sprint: Sprint A · Vendor Portal Card Promotion (D-282 reversal · founder-locked sequence).
