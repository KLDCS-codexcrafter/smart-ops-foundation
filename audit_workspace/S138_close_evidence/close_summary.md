# Sprint 138 · T-TaskFlow-A641.2 · Pillar A.6.4 · TaskFlow Arc · Governance Slice

**Status:** CLOSED (Pass 2 complete · TBD_AT_BANK headSha)
**Pre-flight HEAD:** `0742e96b` "Fixed R1 sprint s137.13"
**Sibling delta:** +1 (`taskflow-governance-engine`) · register now reflects S138 entry
**Audit-type registration:** REUSES `taskflow_event` (no new audit type)

---

## Block 0 · Surface confirmation
- `approval-workflow-engine.ts`: confirmed API `submit / approve / reject` with `<T extends ApprovalRecord>`
  generic shape, `ApprovalActor`, `ApprovalContext`. Adapter via `StepMirror` interface — engine 0-DIFF.
- Comply360 read surfaces confirmed:
  - `comply360-statutory-memory.loadObligations()` → `{ id, label, ... }[]`
  - `comply360-internal-audit-engine.listAuditUniverse()` → `{ id, area_name, ... }[]`
- TaskFlow ratified types (12 statuses, 4 priorities, full supporting interfaces) present from S137.R1.
  No divergence detected; proceeded.

## Block 1 · Institutional backfill
- `sprint-history.ts`: S137 backfilled to `0742e96b`; S138 entry added (`TBD_AT_BANK`, `provenance: CONFIRMED`).
- Phase 8 label cleanup completed in S137.R1; carried forward unchanged.

## Block 2 · `taskflow-governance-engine` (NEW SIBLING #+1)
File: `src/lib/taskflow-governance-engine.ts`
- (a) **Approvals adapter (TF-3):** `listApprovalChains / upsertApprovalChain / deleteApprovalChain
  / getDefaultChain / submitTaskForApproval / approveTaskStep / rejectTaskStep / getTaskApprovalState`.
  Mirrors generic 6-state engine onto TaskFlow 4-state ApprovalStatus.
- (b) **SLA + escalation (TF-21):** `listSLARules / upsertSLARule / deleteSLARule / getSLAStatus /
  evaluateSLA / listEscalations / resolveEscalation`. Specificity:
  `Category+Priority > Category > Priority > global`.
- (c) **I'm-Blocked artifact (TF-33):** `raiseBlocked / resolveBlocked / getOpenBlocked /
  getBlockedHistory / getTimeBlockedHours`. Reason mandatory; one of user/dependency mandatory;
  opt-in `moveToOnHold`.
- (d) **Comply360 bridge (TF-11):** `listComplianceSources / buildTaskDraftFromSource` —
  READ-ONLY over `loadObligations` + `listAuditUniverse`. Auto-categorisation
  (obligation→compliance, observation→internal_audit) + `comply360:{type}:{id}` tag.
- (e) **Rich reminders (TF-13):** `listReminders / upsertReminder / deleteReminder /
  getDueReminders / snoozeReminder / markTriggered`.

## Block 3 · TaskRoom activation
- **Discussion tab** wired live to `taskflow-engine.addComment + listComments`.
- **Approvals tab** wired live to governance engine (chain picker → submit → step approve/reject).
- **I'm Blocked dialog** added to TaskRoom header; raises `BlockedRecord` with optional `on_hold`
  promotion. Reason mandatory.

## Block 4 · Governance pages (6 new First-Class Standalone Pages)
- `ApprovalChainsPage` · chain CRUD + step editor (employee picker · FR-44).
- `SLAManagementPage` · rule CRUD + specificity preview.
- `EscalationsPage` · list + "Evaluate SLA now" + resolve.
- `BlockedListPage` · open blockers list + resolve.
- `RemindersPage` · list + snooze + trigger + delete.
- `ComplianceSourcesPage` · READ-ONLY Comply360 source list + one-click task creation.
- All wired through `TaskFlowPage` self-owned Shell (DP-D3-1). Sidebar items added with `k *`
  keyboard namespace (FR-74).
- Hash-sync routing added (`#sla-rules`, `#approval-chains`, …) for deep-link navigation.

## Block 5 · Tests
File: `src/test/sprint-138/taskflow-governance.test.ts` — **12 tests, 12 passing**
- Approval chains: 2-step happy path · reject mid-chain · reject reason mandatory · submit illegal pre-`in_review`.
- SLA: breach → escalation cascade · specificity (category+priority overrides category).
- I'm-Blocked: reason/blocker validation, raise+resolve cycle, opt-in `on_hold` transition.
- Comply360 bridge: source list shape; `buildTaskDraftFromSource` category mapping for both source types.
- Reminders: snooze pushes date + resets triggered; non-positive hours throws.
- Institutional: `listTasks` shape stable.

Sprint suite roll-up: **S136 (30) + S137 (47) + S138 (12) = 89/89 PASS**.

## Block 6 · Triple Gate (7GB heap, repo-wide)
| Gate | Result |
|------|--------|
| `tsc --noEmit` | 0 errors |
| `eslint . --max-warnings 0` | 0 errors / 0 warnings |
| `vitest run` (S136-138) | 89/89 pass |
| Pre-existing baseline (20 fail / 5730 pass / 3 skip) | Untouched — out of scope |

## §H frozen surface · ZERO diff (audited)
- `src/lib/approval-workflow-engine.ts` — UNTOUCHED (REUSE via adapter only)
- `src/components/compliance/ComplianceModule.tsx` — UNTOUCHED
- `src/lib/push-notification-bridge.ts` — UNTOUCHED
- `src/lib/comply360-statutory-memory.ts` — UNTOUCHED (read-only consume)
- `src/lib/comply360-internal-audit-engine.ts` — UNTOUCHED (read-only consume)
- `audit_workspace/Z*/` — NO churn (per hard rule 5)

## Scope wall (held)
- ❌ Notification rail (B.4 future)
- ❌ Push notification delivery
- ❌ Background SLA scheduler (computed-on-load only; [JWT] P2BB)
- ❌ ML / autorouting / smart approver routing
- ❌ Mobile-specific surfaces (Sarathi pattern future)
- ❌ S139 entry in registers (correctly absent)

## Files
**Created:**
- `src/lib/taskflow-governance-engine.ts`
- `src/pages/erp/taskflow/SLAManagementPage.tsx`
- `src/pages/erp/taskflow/EscalationsPage.tsx`
- `src/pages/erp/taskflow/ApprovalChainsPage.tsx`
- `src/pages/erp/taskflow/BlockedListPage.tsx`
- `src/pages/erp/taskflow/RemindersPage.tsx`
- `src/pages/erp/taskflow/ComplianceSourcesPage.tsx`
- `src/test/sprint-138/taskflow-governance.test.ts`
- `audit_workspace/S138_close_evidence/close_summary.md`

**Modified:**
- `src/pages/erp/taskflow/TaskFlowPage.tsx` (router + hash sync)
- `src/pages/erp/taskflow/TaskFlowSidebar.types.ts`
- `src/apps/erp/configs/taskflow-sidebar-config.ts`
- `src/pages/erp/taskflow/TaskRoomPage.tsx` (Discussion + Approvals + Blocked)
- `src/lib/_institutional/sprint-history.ts` (S137 backfill + S138 entry)
- `src/lib/_institutional/sibling-register.ts` (+1 taskflow-governance-engine)
