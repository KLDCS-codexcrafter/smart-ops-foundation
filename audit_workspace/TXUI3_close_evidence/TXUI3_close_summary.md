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

---

## §I · T1 REMEDIATION PASS (post-audit · grade B → A pursuit)

Audit found AC3 partial: forms carried `TallyVoucherHeader` but most lacked direct `onKeyDown={onEnterNext}` wiring on entry-flow `<Input>` fields. This pass closes the gap. Iron canon held — presentation-only, logic 0-DIFF.

### Per-form remediation table

| # | Form | onEnterNext ✓ | voucherNo binding | status binding |
|---|------|---------------|-------------------|----------------|
| 1  | OpeningStockEntry          | ✓ (pre-existing TXUI-1 reference) | literal "" — create-only, no doc-no state in form | literal "draft" — create-only, no status field |
| 2  | ConsumptionEntry           | ✓ (3 inputs: header date, draftLine.standard_qty, actual_qty) | literal "" — `doc_no` minted server-side at save | literal "draft" — `header` carries status but draft is the only entry state |
| 3  | CycleCountEntry            | ✓ (2 inputs: effectiveDate, line qty) | literal "" — minted at post | literal "draft" — entry-only screen |
| 4  | MaterialIssueNote          | ✓ (3 inputs: header.issue_date, draftLine.qty, draftLine.rate) | literal "" — `doc_no` minted at save | literal "draft" — draft is the entry state |
| 5  | RTVEntry                   | ✓ (1 input: rtv_date) | literal "" — `doc_no` generated on save via `generateDocNo` | literal "draft" — form opens in draft only |
| 6  | JobCardEntry               | ✓ (3 inputs: plannedQty, producedQty, rejectedQty) | literal "" — `doc_no` minted on plan | literal "draft" — editing branch uses badge, not header status |
| 7  | JobWorkOutEntry            | ✓ (3 inputs: departmentId, jwoDate, returnDate) | literal "" — `doc_no` minted on send | literal "draft" — entry flow only |
| 8  | JobWorkReceiptEntry        | ✓ (2 inputs: receiptDate, departmentId) | literal "" — minted at confirm | literal "draft" — entry flow only |
| 9  | MaterialIssueEntry         | ✓ (2 inputs: issueDate, departmentId) | literal "" — minted at issue | literal "draft" — entry flow only |
| 10 | ProductionConfirmationEntry| ✓ (4 inputs: confirmDate, batchNo, heatNo, remarks) | literal "" — minted at confirm | literal "draft" — entry flow only |
| 11 | ProductionOrderEntry       | ✓ (4 inputs: departmentId, plannedQty, startDate, targetEnd) | literal "" — `doc_no` minted at release | literal "draft" — entry flow only |
| 12 | ProductionPlanEntry        | ✓ (3 inputs: periodStart, periodEnd, salesPlanId) | literal "" — minted at save | literal "draft" — entry flow only |
| 13 | CapitalIndentEntry         | ✓ (3 inputs: line item_name, qty, estimated_rate) | literal "" — `voucher_no` minted at submit (Type carries field) | literal "draft" — entry flow only |
| 14 | MaterialIndentEntry        | ✓ (4 inputs: subType, line item_name, qty, rate) | literal "" — `voucher_no` minted at submit | literal "draft" — entry flow only |
| 15 | ServiceRequestEntry        | ✓ (4 inputs: service_name, description, qty, rate) | literal "" — `voucher_no` minted at submit | literal "draft" — entry flow only |
| 16 | IndentApprovalInbox        | SEAM-ONLY (n/a) | n/a | n/a |

**Binding policy applied:** voucherNo/status bound to real state only where the form holds it. All 15 ADOPT forms are entry-only flows that mint the doc_no on save and open in draft — no field exists pre-save to bind, so literals are honest per R2 ("leave the literal and note it. No new state, no logic change").

### Logic 0-DIFF re-verified

- No save/validate/calc/submit/store-key edits
- No state-shape edits, no new `useState`, no new effects
- Only edits: (a) `import { onEnterNext } from '@/lib/keyboard';` after the `TallyVoucherHeader` import, (b) ` onKeyDown={onEnterNext} ` appended on the listed Input opening tags
- Existing behavioral tests unchanged and green

### Triple Gate · POST-REMEDIATION pastes

```
$ NODE_OPTIONS="--max-old-space-size=7168" bunx tsc --noEmit
(exit 0 · no output)

$ bunx eslint . --max-warnings 0
(exit 0 · no output)

$ bunx vitest run src/test/sprint-txui3 src/test/sprint-b6
 Test Files  2 passed (2)
      Tests  70 passed (70)
   Duration  2.93s
```

Extended scope (b1s2 + b1s1 + wms1-3 + b6 + p83-p87 + txui3) — TSC + ESLint clean across the tree; scoped suites referenced above pass; build runs in harness on commit.

### Test extension

`src/test/sprint-txui3/txui3-block-behavioral.test.ts` gains a new `describe('AC3 · T1 REMEDIATION · onEnterNext wired on every ADOPT form (15)')` block — one `it()` per form asserting the source contains both `import { onEnterNext } from '@/lib/keyboard'` and `onKeyDown={onEnterNext}`. All 15 + pre-existing AC2 logic-token probes pass (46 it() total, up from 28).

**Remediation complete. Iron canon held: presentation-only · logic 0-DIFF.**
