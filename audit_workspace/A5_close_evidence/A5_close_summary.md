# Sprint A.5 · T-A5-ProjX-GapClose · Close Summary

**Predecessor HEAD:** `08e143d5` ("Completed H.1 A.3 remediation" · 101 ⭐)
**Streak target:** 102 ⭐
**Posture:** presentation + 2 engine-function gap-closure · empty `newSiblings` · Tier-L (no Wave-2 deferral) · honest-study canon

---

## §0 · Honest-study canon — what existed vs what A.5 added

| Surface / capability | Status BEFORE A.5 | A.5 action |
|---|---|---|
| `projx-engine.ts · computeProjectPnLStub` | EXISTS (D-216 live preview · never persisted) | **0-DIFF** (kept by-design per founder DP) |
| `projx-engine.ts · computeProjectPnL` (full args) | EXISTS (milestones+time+expense+resources) | **0-DIFF** |
| `projx-engine.ts · recomputeProjectFinancials` | EXISTS | **0-DIFF** |
| `projx-engine.ts · computeBusinessDays / canTransitionStatus / nextProjectCode / computeScheduleRiskIndex / makeInitialStatusEvent / makeStatusEvent` | EXISTS | **0-DIFF** |
| `projx-engine.ts · inferMilestonesFromQuotation` | **STUB** (`: never[] { return []; }`) | **MODIFIED** → real 20/50/30 schedule proposal |
| `projx-engine.ts · computeMilestoneInvoiceAmount` | absent at engine layer (hook-only helper existed in `useProjectMilestones.ts`) | **ADDED** engine-canonical helper |
| `projx-engine.ts · DEFAULT_MILESTONE_SPLIT` | absent | **ADDED** documented editable-defaults constant |
| ProjectPnLReport / ProjectMarginReport / MilestoneRegister / MilestoneStatusReport / CashFlowProjectionReport / ResourceUtilizationReport | EXIST | **0-DIFF** (consumed) |
| `MobileProjectHealthPage.tsx` | EXISTS | **0-DIFF** |
| `demo-projects.ts` | EXISTS | **0-DIFF** |
| `useProjectMilestones.ts` (hook · already auto-derives `invoice_amount` on create/update) | EXISTS | **0-DIFF** (consumed by the new "Generate from Contract" UI) |
| `project-milestone.ts` type | EXISTS | **0-DIFF** (no new field needed) |
| `MilestoneTracker.tsx` "Quick Auto-Generate" button | EXISTED as a toast stub | **WIRED** to `inferMilestonesFromQuotation` → persists via existing hook |
| `ProjectEntry.tsx` convert-from-quotation save path | EXISTED | **+1 toast** offering milestone schedule (proposal · not forced) |

**Proves no-rebuild:** every existing ProjX wall (P&L stub + full + financials, all reports, mobile page, demo data, hook) stayed byte-identical. A.5 touched only the 2 targeted engine functions + 2 presentation surfaces (the spec allowlist).

---

## §1 · The split constant (documented editable defaults)

```
DEFAULT_MILESTONE_SPLIT = [
  { pct: 20, name: 'Advance' },
  { pct: 50, name: 'On Delivery' },
  { pct: 30, name: 'On Completion' },
];  // sums to 100 · PM can edit any milestone row after proposal
```

---

## §2 · Files changed (allowlist conformance)

| File | Change |
|---|---|
| `src/lib/projx-engine.ts` | Modified `inferMilestonesFromQuotation` · added `computeMilestoneInvoiceAmount` + `DEFAULT_MILESTONE_SPLIT` |
| `src/pages/erp/projx/transactions/MilestoneTracker.tsx` | Wired "Generate from Contract" button (presentation only · uses existing `createMilestone` hook) |
| `src/pages/erp/projx/transactions/ProjectEntry.tsx` | +1 toast on quotation-conversion save (proposal · not forced) |
| `src/lib/_institutional/sprint-history.ts` | A.5 row added · A.3 flipped to `08e143d5` |
| `src/test/sprint-a5/a5-block-behavioral.test.ts` | NEW · 25 it() (≥20 floor met) |
| `audit_workspace/A5_close_evidence/A5_close_summary.md` | NEW (this file) |

No other files in `git diff 08e143d5..HEAD --name-only`.

---

## §3 · Acceptance criteria

| AC | Result |
|---|---|
| AC1 Block-0 6/6 · existing surface confirmed | PASS |
| AC2 `inferMilestonesFromQuotation` returns real 20/50/30 (no longer `never[]`) | PASS |
| AC3 `computeMilestoneInvoiceAmount = round2(pct/100 × current_contract_value)` | PASS |
| AC4 Auto-derive in MilestoneTracker; honest on 0-value | PASS |
| AC5 P&L stub + full + financials 0-DIFF | PASS |
| AC6 NO new engine · empty `newSiblings` | PASS |
| AC7 All ProjX reports/pages/mobile/demo 0-DIFF | PASS |
| AC8 ≥20 it() green · existing ProjX tests unchanged | PASS (25 it()) |
| AC9 History + A.3 flip | PASS |
| AC10 Walls zero-diff | PASS |
| AC11 No new deps · Triple Gate 4/4 | PASS (see §4) |

---

## §4 · Triple Gate (post-final-edit · `NODE_OPTIONS="--max-old-space-size=7168"`)

Pastes recorded in chat. TSC=0 · ESLint=0 warnings · Vitest scoped (sprint-a5 + projx + a3 + b6 + p83–p87)=green · `npm run build`=PASS.

---

*A.5 close · ProjX gap-closure · 2 stubs closed · P&L preview preserved by-design · NO new engine · Tier-L · 102 ⭐ target.*
