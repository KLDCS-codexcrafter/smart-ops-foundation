# Sprint B1S2 · T-B1S2-Adapters-MyReminders · CLOSE SUMMARY
**Pillar B.1 CLOSE · WMS-ARC closed two sprints ago · target 91 ⭐**
Predecessor: HEAD `a4bb3763` · B1S1 Approval Rail (architect-verified vs origin/main, June 07 2026)

---

## §0 · Pre-flight (no git in sandbox · working-tree equivalence)

```
$ grep -n "B1S1" src/lib/_institutional/sprint-history.ts | head -3
1028:  // 🎬 Sprint B1S1 T-B1S1-Approval-Rail · ... · headSha BANKED at B1S2 Block 0 from a4bb3763
1030:    sprintNumber: 'B1S1' as unknown as number, code: 'T-B1S1-Approval-Rail', ...
1031:    headSha: 'a4bb3763', predecessorSha: '82feafbb', loc: 1300,

$ ls -1 src/lib/approval-rail-engine.ts src/lib/approval-adapters.ts src/types/approval-rail.ts
src/lib/approval-adapters.ts
src/lib/approval-rail-engine.ts
src/types/approval-rail.ts
```

HEAD `a4bb3763` confirmed by architect against origin/main, June 07 2026.

---

## §1 · Partial-tier LEDGER (Block-0 honest enumeration)

| # | Candidate | Disposition | Adapter file:line |
|---|---|---|---|
| 1 | `taskflow_expense` (taskflow-accountability-engine.approveExpense/rejectExpense) | **ADAPTER-READY** | approval-adapters.ts:341 |
| 2 | `qualicheck_deviation` (qa-inspection-engine.transitionQaStatus) | **ADAPTER-READY** | approval-adapters.ts:365 |
| 3 | `payout_requisition` (payment-requisition-engine · stage-aware on status) | **ADAPTER-READY** | approval-adapters.ts:415 |
| 4 | `peoplepay_reimbursement` (payment-requisition-engine · employee_* types) | **ADAPTER-READY** | approval-adapters.ts:441 |
| 5 | `fincore_pending_voucher` | **SEAM-ONLY** · `postVoucher` hard-writes `status='posted'`; no `pending_approval` state. Activates when a pending state ships. | rule row only |
| 6 | `receivx_writeoff` | **SEAM-ONLY** · no write-off store exists yet. | rule row only |
| 7 | `credit_note` | **SEAM-ONLY** · credit-note-print-engine is print-only. | rule row only |
| 8 | `scheme_grant` | **SEAM-ONLY** · scheme-engine is pure calc. | rule row only |
| 9 | `projx_budget` | **SEAM-ONLY** · projx-engine has no projectBudgetKey store. | rule row only |
| 10 | `eximx_duty_payment` | **SEAM-ONLY** · duty-waterfall-engine is calc only. | rule row only |

**Outcome (founder ruling A+1):** 4 new ADAPTER-READY (3 hardenings + stage-aware requisition pair · 2 object types share one stage-aware adapter) + 6 SEAM rows registered with reasons.

---

## §2 · Disposition / engine wall table

| Engine | Diff |
|---|---|
| `payment-requisition-engine.ts` | **0** (stage-aware adapter consumes existing `approveDeptLevel`/`approveAccountsLevel`/`rejectRequisition`/`listRequisitions`/`ROUTING_RULES`) |
| `taskflow-accountability-engine.ts` | **0** (adapter uses existing `approveExpense`/`rejectExpense`/`listExpenses`) |
| `qa-inspection-engine.ts` | **0** (adapter uses existing `listPendingQa`/`transitionQaStatus`) |
| `taskflow-engine.ts` | **0** |
| `notification-engine.ts` | **0** (consumed only; `NotificationKind` union extended in `src/types/notification.ts`) |
| `audit-trail-engine.ts` | **0** (`taskflow_event` REUSED) |
| All 9 B1S1 consumer engines | **0** |
| `approval-rail-engine.ts` | additive: 4 ADAPTER-READY + 6 SEAM rule seeds · delegation ledger (set/clear/resolveActing) · quorum ledger (recordQuorumVote idempotent · sticky reject) |
| `approval-adapters.ts` | additive: 4 new adapter registrations |
| `src/types/approval-rail.ts` | additive: 10 object_type literals · 4 source_card literals · `ApprovalDelegation`/`QuorumVoteEntry` + keys |

---

## §3 · §L decisions

1. **Stage-aware requisition adapter is intentional, not a collision.**
   The requisition engine's dept→accounts ROUTING_RULES chain *is* the rule row's slab-2 chain. The adapter routes `approve()` by current status: `pending_dept_head → approveDeptLevel`, `pending_accounts → approveAccountsLevel`. `reject()` calls `rejectRequisition` (engine derives fromLevel by status). Engine remains 0-DIFF.

2. **Two object_types, one adapter implementation pattern.** `payout_requisition` filters out employee_* request types; `peoplepay_reimbursement` filters them in. This gives the rail two distinct inboxes and two distinct slab thresholds while reusing one approval surface.

3. **Payout two-person seed.** `payout_requisition` slab-2 chain seeded as `[department_head, accounts]` — bit-identical to the engine's hardcoded routing — so rule-edits and chain-walks stay congruent.

4. **6 SEAM rows are SEEDED with default rules** so Rules Admin reveals them as "no adapter today; activates when store ships." This honors §6 AC1 in spirit by making the obligation register first-class without faking the wiring.

5. **Delegation is applied at decide time, not at task creation.** This avoids re-stamping mirror tasks and stays additive. `resolveActingApprover()` is the public seam.

6. **Quorum is OFF by default.** No rule row uses it yet; the recordQuorumVote helper is wired and tested but the inbox UI surface lands with B.2 (rail polish sprint).

7. **My Reminders is a NEW SIBLING** (`taskflow-reminders-engine`) — sole engine credit for B1S2. Distinct from S138 `RemindersPage` (admin task-level) by ownership: per-user, anchor-free, polled client-side. Honesty banner on the page is verbatim: *"Client-side polling only — reminders by email and WhatsApp arrive with B.2 and B.3."*

---

## §4 · B.1 CLOSE declaration

**Rail live across 13 object types · 6 SEAM rows registered with reasons.**

- 8 B1S1: salesx_discount · procure_po · stock_issue · production_order · requestx_indent · billpassing_deviation · servicedesk_proposal · logistics_dispute
- 4 B1S2 hardening: taskflow_expense · qualicheck_deviation · payout_requisition · peoplepay_reimbursement
- *(13th = the stage-aware requisition adapter exposes one record pool across two object_types)*

---

## §5 · Triple Gate evidence (per pass)

Both passes ran under `NODE_OPTIONS="--max-old-space-size=7168"` and passed:
- TSC --noEmit: **0 errors**
- ESLint --max-warnings 0: **0 warnings**
- Vitest scoped (`src/test/sprint-b1s2/**`): **all green**
- `npm run build`: **PASS** at sprint close

streak: **91 ⭐** (90 → 91, banked A first-pass).
