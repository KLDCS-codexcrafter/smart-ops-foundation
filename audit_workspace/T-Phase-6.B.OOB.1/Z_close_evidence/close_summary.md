# Sprint 113 · T-Phase-6.B.OOB.1 · Arc 4 Opener · Close Summary

## What shipped
- **NEW SIBLING #182** — `oob8-compliance-aware-approval-engine` (~250 LOC). 8 default compliance-context rules. Orchestrates idea-6 (does not reimplement it).
- **Audit type +1** — `oob8_approval_rule_event` under `mca-roc`. ComplianceModule untouched.
- **Standalone Page #40** — `ComplianceApprovalRulesPage` (sidebar `type:'item'` + CC `case` · NOT a sibling).
- **sprint-history** — S112 headSha backfilled to `c8ddef29a3ec1a1d1015e80ff63da517ee76cedc`; S113 appended with `headSha:'TBD_AT_BANK'`; no S114 entry.
- **Guardrail 3** — floored two prior exact `toBe()` count tests (S107 174, S108 176).
- **Test pack** — `src/test/sprint-113/oob8-compliance-approval.test.ts` (≥30 discrete `it()`).

## §L · Design-decision flags

### §L-1 · OOB-8 ↔ idea-6 orchestration boundary (FR-44)
- **Trigger dimensions are complementary, not overlapping.** idea-6 fires on **price variance > 5% vs budget**. OOB-8 fires on **compliance context** — value (₹5L/₹10L), statutory-deadline window, regulated category (NBFC/SEBI/RERA/FEMA), cross-entity, TDS/TCS, related-party, MSME, CAPEX.
- **8 rules** — `high_value_threshold`, `statutory_deadline_adjacent`, `regulated_category`, `cross_entity_transfer`, `tds_tcs_applicable`, `related_party`, `msme_vendor_payment`, `capex_threshold`.
- When a rule fires, OOB-8 calls `idea-6.evaluateInterDeptApproval(...)` to open a workflow and stores the returned `routed_workflow_id`. Decisions resolve via `idea-6.recordInterDeptDecision(workflow_id, decision, reason)`.
- **Zero-touch upstream**: idea-6, approval-matrix-engine, approval-workflow-engine all 0-DIFF.

### §L-2 · OOB-8 → idea-6 boundary adapter
idea-6's evaluate signature is `{from_department, to_department, internal_price, budget_rate, entity_code?}` and its threshold is price-variance > 5%. OOB-8 maps compliance context to this shape **at the OOB-8 boundary**:
- `from_department = 'compliance:' + rule_id`
- `to_department = rule.approver_role`
- `internal_price = amount`
- `budget_rate = max(1, floor(amount * 0.5))` — guarantees variance ≫ 5% so idea-6 opens the workflow
This honours S110/S111 discipline: when idea-6's hook doesn't fit cleanly, adapt at the caller — do not silently edit idea-6.

### §L-3 · HONEST METRICS (DP-A4-8 · FR-91)
"OOB 15/16" (and later "16/16") is a **NARRATIVE** figure for the close ceremony — there is **no machine OOB-1..16 counter** in the codebase, no `OOB_CERTIFIED` register, no `oob_count_register`. The test pack asserts that no such register exists and that the engine source contains no `15/16` or `16/16` literal. This sprint deliberately does NOT add a fake certification register.

### §L-4 · Scope wall
OOB-8 only. **No** OOB-13 workpapers (S114 territory). **No** Pillar-C.3 governance (S115 territory). Test pack asserts neither file/function exists.

### §L-5 · Guardrails honoured
- G1: S113 entry `headSha = 'TBD_AT_BANK'` (never a Pass-A SHA).
- G2: No S114 entry pre-created.
- G3: Prior exact `toBe(174)`/`toBe(176)` count tests floored to `toBeGreaterThanOrEqual(...)`.

## Triple Gate
TSC 0 · ESLint 0/0 · Vitest all-pass · Build PASS — verified after each block.

## Next
S114 Block 1 will backfill S113 `headSha` once banked.
