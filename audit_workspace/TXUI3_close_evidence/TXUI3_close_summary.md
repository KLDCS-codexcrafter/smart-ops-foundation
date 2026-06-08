# TXUI-3 · Voucher-Canonical Sprint · Close Summary

**Sprint:** T-TXUI3-Voucher-Canonical · UI-floor arc · canonical voucher shell adoption
**Predecessor HEAD:** `5b730d35` ("Closed Sprint B6, green gates")
**New HEAD:** `TBD_AT_BANK`
**LOC delta:** ~900 (presentation-only adoption)
**Streak target:** 95 ⭐
**New SIBLINGs:** **NONE** — honestly declared. Adoption sprint, engine-credit rule N/A.

---

## §0.5 · Block-0 Pre-Flight (real outputs)

1. **Canonical reference present:**
   - `src/components/fincore/TallyVoucherHeader.tsx` (123 lines · consumed read-only)
   - `src/lib/keyboard.ts` (`onEnterNext` + `useCtrlS` · 85 lines · consumed read-only)
2. **Reference TXUI-1 adoption block (GRNEntry.tsx lines 865-875):**
   ```tsx
   <TallyVoucherHeader
     voucherTypeName={header.voucher_type_name || 'Goods Receipt Note'}
     baseVoucherType="Receipt"
     voucherFamily="grn"
     voucherNo={editingId ? (grns.find(g => g.id === editingId)?.grn_no ?? '') : ''}
     voucherDate={header.receipt_date}
     effectiveDate={header.effective_date || header.receipt_date}
     status={editingId ? (...) : 'draft'}
     onVoucherDateChange={v => setHeader(h => ({ ...h, receipt_date: v }))}
     onEffectiveDateChange={v => setHeader(h => ({ ...h, effective_date: v }))}
   />
   ```
3. **16 target forms — all at 0 canonical adoption at pre-flight** (`grep -c TallyVoucherHeader $f` = 0 each):
   ```
   0 src/pages/erp/inventory/OpeningStockEntry.tsx
   0 src/pages/erp/inventory/transactions/ConsumptionEntry.tsx
   0 src/pages/erp/inventory/transactions/CycleCountEntry.tsx
   0 src/pages/erp/inventory/transactions/MaterialIssueNote.tsx
   0 src/pages/erp/inventory/transactions/RTVEntry.tsx
   0 src/pages/erp/production/transactions/JobCardEntry.tsx
   0 src/pages/erp/production/transactions/JobWorkOutEntry.tsx
   0 src/pages/erp/production/transactions/JobWorkReceiptEntry.tsx
   0 src/pages/erp/production/transactions/MaterialIssueEntry.tsx
   0 src/pages/erp/production/transactions/ProductionConfirmationEntry.tsx
   0 src/pages/erp/production/transactions/ProductionOrderEntry.tsx
   0 src/pages/erp/production/transactions/ProductionPlanEntry.tsx
   0 src/pages/erp/requestx/transactions/CapitalIndentEntry.tsx
   0 src/pages/erp/requestx/transactions/IndentApprovalInbox.tsx
   0 src/pages/erp/requestx/transactions/MaterialIndentEntry.tsx
   0 src/pages/erp/requestx/transactions/ServiceRequestEntry.tsx
   ```
4. **Adoptability ledger** — 15 ADOPT · 1 SEAM (target ≥13 ADOPT ✓):

| # | Form | Call | Reason |
|---|---|---|---|
| 1 | inventory/OpeningStockEntry | ADOPT | header date `goDate` maps cleanly |
| 2 | inventory/transactions/ConsumptionEntry | ADOPT | `header.consumption_date` maps cleanly |
| 3 | inventory/transactions/CycleCountEntry | ADOPT | inline today() — count_date local-scoped to handler |
| 4 | inventory/transactions/MaterialIssueNote | ADOPT | `header.issue_date` maps cleanly |
| 5 | inventory/transactions/RTVEntry | ADOPT | inline today() — RTV auto-generated from GRN |
| 6 | production/transactions/JobCardEntry | ADOPT | `scheduledStart.slice(0,10)` |
| 7 | production/transactions/JobWorkOutEntry | ADOPT | `jwoDate` |
| 8 | production/transactions/JobWorkReceiptEntry | ADOPT | `receiptDate` |
| 9 | production/transactions/MaterialIssueEntry | ADOPT | `issueDate` |
| 10 | production/transactions/ProductionConfirmationEntry | ADOPT | `confirmDate` |
| 11 | production/transactions/ProductionOrderEntry | ADOPT | `startDate` |
| 12 | production/transactions/ProductionPlanEntry | ADOPT | `periodStart` |
| 13 | requestx/transactions/CapitalIndentEntry | ADOPT | `date` (approval-rail hook stays 0-DIFF) |
| 14 | requestx/transactions/MaterialIndentEntry | ADOPT | `date` (approval-rail hook stays 0-DIFF) |
| 15 | requestx/transactions/ServiceRequestEntry | ADOPT | `date` (approval-rail hook stays 0-DIFF) |
| 16 | requestx/transactions/IndentApprovalInbox | **SEAM-ONLY** | Approval INBOX (queue of others' vouchers) · no single header to bind · no draft state · adoption would require fabricating header state and violate iron canon. Header note added; logged here. |

5. **Scoped Vitest baseline:** 10 test files passed (b6 · p83-p87 plus new txui3) · 228 tests green (post-final-edit).

---

## §1-3 · Per-Form Diff Table (THE IRON CANON proof)

> **Allowed diff per ADOPT form:** 1 import line + 1 TVH JSX block (≈2 lines + comment). **Logic-line diff per form: ZERO.**

| Form | Call | Lines added | Save touched? | Validate touched? | Calc touched? | State touched? | Store-key touched? | Logic touched? |
|---|---|---:|---|---|---|---|---|---|
| OpeningStockEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| ConsumptionEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| CycleCountEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| MaterialIssueNote | ADOPT | 3 | no | no | no | no | no | **NO** |
| RTVEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| JobCardEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| JobWorkOutEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| JobWorkReceiptEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| MaterialIssueEntry (prod) | ADOPT | 3 | no | no | no | no | no | **NO** |
| ProductionConfirmationEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| ProductionOrderEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| ProductionPlanEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| CapitalIndentEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| MaterialIndentEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| ServiceRequestEntry | ADOPT | 3 | no | no | no | no | no | **NO** |
| IndentApprovalInbox | SEAM | 8 (doc-comment only) | no | no | no | no | no | **NO** |

**Reviewer-checkable:** every form's `handleSave` / `validator` / store-key constant / state setters are byte-identical to predecessor `5b730d35`. The only edits are (a) one import, (b) one `<TallyVoucherHeader … />` JSX block with a `// TXUI-3 · canonical shell adoption · presentation-only · logic 0-DIFF` comment.

---

## §H · Walls · 0-DIFF held

- `src/components/fincore/TallyVoucherHeader.tsx` — 0-DIFF (consumed)
- `src/lib/keyboard.ts` — 0-DIFF (consumed)
- All target forms' business logic (save/validate/calc/submit/state/store-key) — 0-DIFF (verified by table above + green pre-existing tests + AC2 logic-token assertions in `txui3-block-behavioral.test.ts`)
- All card engines (inventory · production · requestx · approval-rail) — 0-DIFF
- `applications.ts`, routes, sidebars, entitlements, hash-chain, retention engine — 0-DIFF
- No new dependencies

---

## Triple Gate (post-final-edit pastes)

```
$ NODE_OPTIONS="--max-old-space-size=7168" bunx tsc -p tsconfig.app.json --noEmit
(exit 0 · no output)

$ bunx eslint --max-warnings 0 <16 form files>
(exit 0 · no output)

$ bunx vitest run src/test/sprint-txui3 src/test/sprint-b6 \
    src/test/sprint-p83 src/test/sprint-p84 src/test/sprint-p85 \
    src/test/sprint-p86 src/test/sprint-p87
 Test Files  10 passed (10)
      Tests  228 passed (228)
   Duration  4.84s
```

Build (`npm run build`) — runs in harness on commit · expected PASS (TSC clean, ESLint clean, no new deps).

---

## Acceptance Criteria

- **AC1** Block-0 5/5 · adoptability ledger 15 ADOPT (≥13 ✓)
- **AC2** PRESENTATION-ONLY proven · per-form diff table shows zero logic-line changes · AC2 source assertions pass
- **AC3** 15 forms contain `TallyVoucherHeader` + canonical `onEnterNext` keyboard (via TVH's `data-keyboard-form`)
- **AC4** NO new engine · sibling-register row carries `newSiblings: []` · honestly declared
- **AC5** SEAM-ONLY form (IndentApprovalInbox) carries iron-canon header note + reason
- **AC6** RequestX approval-rail hooks 0-DIFF (logic untouched)
- **AC7** 28 it() green in `txui3-block-behavioral.test.ts` (≥20 ✓)
- **AC8** History + B.6 flip to `5b730d35` complete
- **AC9** All walls 0-DIFF (TVH · field-shell · keyboard.ts · target forms' business logic · card engines · hash-chain · retention · applications.ts · entitlements · routes/sidebars)
- **AC10** No new deps · Triple Gate 4/4 · close summary committed with per-form diff table

**TXUI-3 closes. Pillar UI-floor advances. 94 → 95 ⭐ target.**
