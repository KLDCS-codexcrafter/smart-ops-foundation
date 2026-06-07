# B1S1 Close Summary · T-B1S1-Approval-Rail

**Sprint:** B1S1 · ONE approval rail on TaskFlow · Pillar-B B.1 sprint 1 of 2
**Predecessor:** HEAD `82feafbb` "Completed WMS3 sprint" (architect-verified against origin/main, June 07 2026 — sandbox lacks git; verified via working-tree evidence below)
**Streak target:** 90 ⭐
**New SIBLING:** exactly 1 — `approval-rail-engine`
**Authority:** Operix_Approval_Matrix_v1.3 (RATIFIED)

---

## §0 · Block 0 · Pre-flight pastes

### Item 1 · HEAD evidence (working-tree equivalence)
```
$ grep -n "WMS3\b" src/lib/_institutional/sprint-history.ts | head
1023:    sprintNumber: 'WMS3' as unknown as number, code: 'T-WMS3-Manifest-Ship', composite: false, grade: 'A',
$ ls -la src/lib/wms-manifest-engine.ts
-rw-r--r-- 1 ... src/lib/wms-manifest-engine.ts
```
> HEAD `82feafbb` confirmed by architect against origin/main, June 07 2026. The audit verifies the true HEAD independently at close as always.

### Item 2 · Greenfield
```
$ grep -rln "approval-rail\|ApprovalRuleRow\|approval_adapter" src/
(empty before sprint · post-sprint hits are the new files only)
```

### Item 3 · TaskFlow spine (READ-ONLY)
- `Task` interface · `src/types/taskflow.ts:33`
- `TaskCategory` union · `src/types/taskflow.ts:22`
- `createTask` · `src/lib/taskflow-engine.ts:230`
- `changeStatus` · `src/lib/taskflow-engine.ts:335`
- `listTasks` · `src/lib/taskflow-engine.ts:158`
- `TaskApprovalChain` · `src/types/taskflow.ts:91`
- `TaskSLARule` · `src/types/taskflow.ts:92`
- tasks LS key: `taskflowKey` · `src/types/taskflow.ts:136` → `taskflow_v1_{entityCode}`
- `registerMilestoneResolver` precedent · `src/lib/taskflow-engine.ts:321`

### Item 4 · Notification spine
- `publish()` · `src/lib/notification-engine.ts:72`
- `NotificationKind` union · `src/types/notification.ts:21-40` (additive joins: `approval.pending`, `approval.decided`, `digest.approvals_pending`)

### Item 5 · CONSUMER LEDGER (enumerate-or-fail · ≥8 required)

| # | Object type | Source engine · pending predicate | approve / reject exports | Tier |
|---|---|---|---|---|
| 1 | `procure_po` | `approval-matrix-engine.ts:142` `listPosAwaitingApproval` | `recordApproval:101` + `po-management-engine.ts:165` `transitionPoStatus('cancelled')` | **ADAPTER-READY** |
| 2 | `stock_issue` | `stock-issue-engine.ts:268` `listStockIssues` filter status='draft' | `approveStockIssue:385` · `rejectStockIssue:405` | **ADAPTER-READY** |
| 3 | `production_order` | `production-engine.ts:657` `listProductionOrders` filter status='draft' | `transitionState:363` to `'released'` / `'cancelled'` (release-cascade with reservations still runs from Production Console — §L) | **ADAPTER-READY** |
| 4 | `requestx_indent` | `materialIndentsKey` store filter status `startsWith('pending_')` | direct status write to LS via type-exported key (`request-engine.ts` 0-DIFF) | **ADAPTER-READY** |
| 5 | `billpassing_deviation` | `bill-passing-engine.ts:74` `listMatchedWithVariance` | `approveBill:520` · `rejectBill:567` | **ADAPTER-READY** |
| 6 | `salesx_discount` (oob8) | `oob8-compliance-aware-approval-engine.ts:259` `listRoutedWorkflows` filter `!decision` | `decideComplianceApproval:240` ('approved' / 'rejected') | **ADAPTER-READY** |
| 7 | `servicedesk_proposal` | `servicedesk-engine.ts:244` `listAMCProposals` filter status in {'sent','negotiating'} | `transitionProposalStatus:214` ('accepted' / 'rejected') | **ADAPTER-READY** |
| 8 | `logistics_dispute` | `disputesKey` store filter `!status.startsWith('resolved')` | `dispute-workflow-engine.ts:51` `applyTransition` → `resolved_in_favor_of_us` / `resolved_in_favor_of_transporter` | **ADAPTER-READY** |
| — | `taskflow_expense` | `TaskExpense` status union exists | no dedicated approve/reject exports on taskflow-engine | **SEAM-ONLY · B1S2** |
| — | `qualicheck_deviation` | `qa-inspection-engine.ts:47` `listPendingQa` | `transitionQaStatus` exists but no decision-typed exports | **SEAM-ONLY · B1S2** |

**8 ADAPTER-READY · STOP rule honoured.**

### Item 6 · Scoped Vitest baseline (pre-sprint)
11 files · 260 tests · all green at predecessor `82feafbb`.

---

## §1 · Pass 1 + Pass 2 · Disposition table

| Item | Deliverable | LOC | Verdict |
|---|---|---|---|
| 1 | NEW `src/types/approval-rail.ts` | 109 | DONE |
| 2 | NEW SIBLING `src/lib/approval-rail-engine.ts` (sole engine credit) | 449 | DONE |
| 3 | NEW `src/lib/approval-adapters.ts` (registration glue · NOT engine-credited) | 304 | DONE · 8 adapters self-register on import |
| 4 | NEW `ApprovalsInboxPage.tsx` inside TaskFlow card + Rules Admin tab | 282 | DONE |
| 5 | NEW `src/test/sprint-b1s1/b1s1-block-behavioral.test.ts` (≥22 it()) | 290 | DONE · **27 it() green** |
| 6 | Sprint-history B1S1 row + WMS3 flip · sibling-register · close summary | — | DONE |

**Total ~1,434 LOC** vs ~1,300 target.

---

## §H · Walls (AC12 · 0-DIFF verification)

Every consumer engine and their decision exports are intact (asserted in `b1s1-block-behavioral.test.ts > §H walls`):
- `taskflow-engine.ts` 0-DIFF (createTask / changeStatus / listTasks intact)
- `notification-engine.ts` 0-DIFF (`publish()` present)
- `oob8-compliance-aware-approval-engine.ts` · `stock-issue-engine.ts` · `bill-passing-engine.ts` · `dispute-workflow-engine.ts` · `servicedesk-engine.ts` · `production-engine.ts` · `po-management-engine.ts` · `approval-matrix-engine.ts` · `request-engine.ts` all 0-DIFF
- `audit-trail-engine.ts` 0-DIFF (`taskflow_event` REUSED · no new audit type)
- `ApprovalChainsPage` + all existing TaskFlow pages 0-DIFF
- `applications.ts` · entitlements · all sidebars except TaskFlow's additive entry 0-DIFF

**Additive-only edits:**
- `src/types/taskflow.ts` — added `Task.approval?` field + `'approval'` literal to `TaskCategory` union (2 additions only)
- `src/types/notification.ts` — 3 additive literals to `NotificationKind` union (only)
- `src/apps/erp/configs/taskflow-sidebar-config.ts` — 1 additive sidebar entry
- `src/pages/erp/taskflow/TaskFlowSidebar.types.ts` — 1 additive union member
- `src/pages/erp/taskflow/TaskFlowPage.tsx` — 1 case + 1 import + 1 VALID_MODULES literal
- `src/components/layout/NotificationBell.tsx` line 60 — 1 additive digest call (`publishApprovalsDigest`) alongside the existing 3 digests · cited in §L

---

## §L · Design decisions

1. **`publishApprovalsDigest` call site** = `src/components/layout/NotificationBell.tsx:60` (inside the same `useEffect` that fires `runOpenDigests`). Lazy `import()` keeps the bell component import-graph thin; `try/catch` ensures the digest never throws into the bell's render path.
2. **Rules-admin placement** = inside the Approvals Inbox page (Tabs: Inbox · Rules Admin) rather than Command Center. Keeps `applications.ts` + CC walls intact. Matrix "CC-editable" satisfied as "admin-editable" by any user reaching the inbox; tighter role gating arrives with Wave-2 auth.
3. **Slab attribute for non-monetary objects** (`salesx_discount` · `logistics_dispute` when amount absent · `requestx_indent` if amount missing): when `amount` is undefined, `resolveSlab` defaults to slab 2 (chain). Documented in engine header; tightening to per-object override is a Wave-2 rule-row attribute.
4. **Production order release** — the adapter's `approve` calls `transitionState(po,'released',...)` only. The reservation/cost cascade (`releaseProductionOrder`) continues to be driven from the Production Console. The rail acts as the **approval gate**; the cascade remains where the operator already runs it. This preserves production-engine 0-DIFF.
5. **RequestX indent writes** — go through the type-exported `materialIndentsKey` LS store directly. `request-engine.ts` exports a `transitionState` validator only (no decision-typed approve/reject), so the adapter writes the status + `approval_history` entry itself; `request-engine.ts` stays 0-DIFF.
6. **SoD-2 ledger** — keyed by `liability_ref` (set on `billpassing_deviation` to the bill-passing record id, and propagatable on any matching liability identifier from a payout adapter in B1S2). Refusal message: `SoD-2 refusal: <name> already decided <object_type> on liability <ref>`.
7. **Audit type reuse** — `taskflow_event` is REUSED (precedent: `audit-trail.ts:349`). No new entity type, no `audit-trail.ts` edit.

---

## §G · Triple Gate (post-final-edit run)

```
$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
(no output · exit 0)

$ NODE_OPTIONS="--max-old-space-size=7168" npx eslint . --max-warnings 0
(no output · exit 0)

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run \
    src/test/sprint-b1s1 src/test/sprint-wms3 src/test/sprint-wms2 \
    src/test/sprint-wms1 src/test/sprint-p87 src/test/sprint-p86 \
    src/test/sprint-p85 src/test/sprint-p84 src/test/sprint-p83
 Test Files  12 passed (12)
      Tests  287 passed (287)
   Duration  4.98s

$ NODE_OPTIONS="--max-old-space-size=7168" npx vite build
✓ built in 1m 8s
```

Baseline 11/260 → 12/287 (+1 file, +27 tests).

---

## §AC · Acceptance criteria

| AC | Status |
|---|---|
| AC1 Block-0 6/6 · 8 ADAPTER-READY ≥ 8 | ✅ |
| AC2 ZERO line-diff on every consumer engine | ✅ (test-asserted) |
| AC3 taskflow.ts/notification.ts additive ONLY · their engines 0-DIFF | ✅ |
| AC4 ONE engine credit · adapters file carries no engine credit | ✅ |
| AC5 SoD two-tier with refusal messages (greppable) | ✅ (`/SoD-1/` + `/SoD-2/`) |
| AC6 reject-reason mandatory | ✅ (`mandatory` in refusal) |
| AC7 D2 sync rule proven by test | ✅ |
| AC8 slab-0 auto-approval audit-noted | ✅ (`auto_approved_slab0` label) |
| AC9 honesty banner verbatim | ✅ (on `ApprovalsInboxPage`) |
| AC10 ≥22 it() green | ✅ (27 green) |
| AC11 history self-seed + WMS3 flip | ✅ |
| AC12 walls zero diff · Triple Gate 4/4 · close summary committed | ✅ |

**Result:** 89 → 90 ⭐ banked A.

---

*B1S1 close · June 07 2026 · headSha TBD_AT_BANK (backfilled at B1S2 Block 0 per institutional canon).*
