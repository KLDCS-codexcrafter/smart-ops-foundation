# S141 · T-TaskFlow-A641.5 · Close Summary

**Sprint:** 141  
**Code:** T-TaskFlow-A641.5  
**Pillar:** A.6.4 · TaskFlow Arc · Accountability Payoff  
**Predecessor HEAD:** `ad30edeb`  
**Head SHA:** `TBD_AT_BANK`  
**Bank date:** 2026-06-04  
**Grade target:** A · 64-streak ⭐

---

## Scope delivered

- **Engine** — `src/lib/taskflow-accountability-engine.ts` (713 LOC, 22 functions):
  - TF-18 GST/TDS-aware expenses (`computeExpenseTax` → CGST/SGST split, IGST,
    RCM flag; `createExpense` / `submit` / `approve` / `reject` /
    `markReimbursed` / `getTaskExpenseTotals`).
  - TF-19 evidence (`createEvidence` / `listEvidenceForTask` /
    `getEvidenceCount`; `EVIDENCE_MAX_BYTES = 1_048_576`; guarded geolocation;
    null location tolerated).
  - TF-29d evidence-mandatory close (`upsertClosePolicy`, `evaluateClosePolicy`
    → `"evidence-mandatory: need N, have M"`; `registerClosePolicyResolver`
    wired into `taskflow-engine.changeStatus` mirroring S139 MilestoneResolver).
  - TF-29e accountability metrics (`computeAccountabilityMetrics` →
    `{ people, rollups }` with ageing buckets, rework bounces, reassignments
    away, blocked hours, SLA breaches; injectable `now`).
  - TF-29f symmetric self-trail (`exportMyTrail` bundle).
  - TF-31 daily work diary (`generateWorkDiary` / `generateTeamDiary`).

- **UI surfaces (Block 4):**
  - `TaskRoomPage` Expenses + Evidence tabs ACTIVATED (`ExpensesTab`,
    `EvidenceTab`); Documents-only placeholder remains for S143.
  - New First-Class Standalone Pages under TaskFlow shell:
    - `AccountabilityDashboardPage` — manager rollups + people grid +
      self-scope trail; KPI cards. No leaderboards.
    - `ClosePoliciesPage` — TF-29d per-category policy upsert + list.
    - `WorkDiaryPage` — date picker + per-section breakdown.
  - Sidebar: `accountability` (`k y`), `close-policies` (`k q`),
    `work-diary` (`k z`). `TaskFlowPage.renderModule` extended; type union
    in `TaskFlowSidebar.types.ts` updated.

- **Institutional (Block 6):**
  - `sibling-register.ts` — appended `taskflow-accountability-engine`.
  - `sprint-history.ts` — S140 backfill at `ad30edeb`; S141 registered as
    `TBD_AT_BANK` with `predecessorSha: 'ad30edeb'`.

## Gate sequence (last actions before bank)

| Gate | Result |
|------|--------|
| `tsc --noEmit` (7 GB heap) | **0 errors** |
| `eslint src/ --max-warnings 0` | **0 errors / 0 warnings** |
| `vitest run src/test/sprint-141/` | **39 / 39 green** |
| Scoped regression S137–S141 | **234 / 234 green** (47 + 30 + 74 + 44 + 39 — counts via runner) |
| Z14 idempotency (writer + smoke) | **71 / 71 green** |

## §H 0-DIFF guardrails

- `approval-workflow-engine` — UNTOUCHED.
- `comply360-statutory-memory` / `comply360-internal-audit-engine` /
  `comply360-audit-trail-aggregator-engine` — UNTOUCHED.
- `push-notification-bridge.ts` — UNTOUCHED.
- `ComplianceModule` — UNTOUCHED.
- `compliance-seed-data.ts` — READ-ONLY (FR-44 access via
  `listIndiaGstRates` / `listTdsSections`).
- `taskflow-engine` — beyond the pre-existing `registerClosePolicyResolver`
  hook seam (added in Pass 1), 0-DIFF in Pass 2.

## DESIGN-DECISION-FLAGs

### S141-NoLeaderboards (founder-ratified don't-build canon)
Accountability surfaces manager scope and self scope ONLY. The engine exports
NO `leaderboard`, `getLeaderboard`, `rankUsers`, or `getPublicScoreboard`
symbol; scope-wall test asserts each is `undefined`.

### S141-Sibling-Count-Reconciliation
The Pass-1 checkpoint reported a "factual current count = 163". That number
was **not** the canonical institutional `SIBLINGS` array; it was a stale
count from a `*-engine.ts` file-name scan (`rg -l 'engine\.ts'` style),
which omits non-`-engine`-suffixed siblings and includes nothing about the
register array itself. The discrepancy source: a filesystem heuristic, not
the register.

**Canonical = `SIBLINGS` array in `src/lib/_institutional/sibling-register.ts`.**
That is the array the S138 institutional test asserts against
(`SIBLINGS.length >= 207`).

Reconciled values at close (read live from the module):

| Source | Length |
|--------|--------|
| Canonical `SIBLINGS.length` at close | **210** |
| Pass-1 "163" file-scan count | non-canonical · ignored |
| S138 institutional floor assertion | `>= 207` (unchanged · NOT weakened) |

Action taken: `taskflow-accountability-engine` appended to the canonical
`SIBLINGS` array (210 = 209 prior + 1). No renumbering. No weakening of the
S138 floor. The S141 institutional test additionally asserts
`SIBLINGS.length >= 207` and the presence of the new entry.

## Audit posture

- `taskflow-accountability-engine` emits all audit lines as
  `entityType: 'taskflow_event'` (REUSES the TF-engine audit type — NO new
  audit type, NO aggregator edit, ComplianceModule UNTOUCHED).
- All mutations wrapped in `D-AUDIT-SAFE` try/catch.

## [JWT] markers (P2BB)

- `approveExpense` / `markReimbursed` — FinCore voucher emission + PayOut
  payout integration are server-side concerns deferred to backend bring-up.
- Server-side metric aggregation for `computeAccountabilityMetrics` —
  currently client-recomputed against entity-scoped localStorage.

## Files

**Created (4):**
- `src/lib/taskflow-accountability-engine.ts`
- `src/pages/erp/taskflow/AccountabilityDashboardPage.tsx`
- `src/pages/erp/taskflow/ClosePoliciesPage.tsx`
- `src/pages/erp/taskflow/WorkDiaryPage.tsx`
- `src/test/sprint-141/taskflow-accountability.test.ts`

**Edited (6):**
- `src/types/taskflow.ts` (Pass 1 · types + storage keys)
- `src/lib/taskflow-engine.ts` (Pass 1 · ClosePolicyResolver hook + wiring)
- `src/apps/erp/configs/taskflow-sidebar-config.ts`
- `src/pages/erp/taskflow/TaskFlowSidebar.types.ts`
- `src/pages/erp/taskflow/TaskFlowPage.tsx`
- `src/pages/erp/taskflow/TaskRoomPage.tsx`
- `src/lib/_institutional/sibling-register.ts`
- `src/lib/_institutional/sprint-history.ts`
