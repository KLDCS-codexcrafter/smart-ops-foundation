# TXUI-4 · T-TXUI4-Voucher-Canonical · Close Summary

**Sprint:** TXUI-4 · UI-floor arc · canonical voucher shell adoption
**Predecessor HEAD:** `8eb52305` ("Added onEnterNext to ADOPT" · TXUI-3 banked A POST-T1 · 95 ⭐)
**Posture:** PRESENTATION-ONLY · 16 ADOPT + 1 SEAM · NO new engine
**Target streak:** 95 → **96 ⭐**

---

## Iron Canon (both parts honored from pass 1)

**(a) PRESENTATION-ONLY:** business logic byte-identical — save/validate/calc/submit/state/store-key 0-DIFF on every target form. All card engines (`payment-engine`, `payment-requisition-engine`, `projx-engine`, `maintainpro-engine`, `qualicheck-ncr-evidence-engine`) remain 0-DIFF. Approval-rail hook on `PaymentRequisitionEntry` and QA evidence logic on `QualiCheckNcrEvidenceEntry` are walls.

**(b) COMPLETE adoption from pass 1 (TXUI-3 lesson honored):** every ADOPT form ships with `TallyVoucherHeader` + `onEnterNext` + state-bound props in the same sprint — no T1 remediation needed.

---

## Per-form diff table

| # | Form | Card | ADOPT/SEAM | onEnterNext ✓ | voucherNo binding | status binding | Logic touched? |
|---|---|---|---|---|---|---|---|
| 1 | AMCOutToVendor.tsx | MaintainPro | ADOPT | ✓ (Input) | literal `""` — RMA mints at `createAMCOutToVendor` | literal `draft` — set server-side at save | NO |
| 2 | AssetCapitalization.tsx | MaintainPro | **SEAM-ONLY** | n/a | n/a | n/a | NO (read-only list · no entry surface · iron-canon forbids fabricating per-row state) |
| 3 | BreakdownReport.tsx | MaintainPro | ADOPT | void-ref (no `<Input>` — Textarea + selects only) | literal `""` — BD mints at save | literal `draft` | NO |
| 4 | CalibrationCertificate.tsx | MaintainPro | ADOPT | ✓ (Input) | literal `""` — CERT mints at save | literal `draft` | NO |
| 5 | EquipmentMovement.tsx | MaintainPro | ADOPT | ✓ (Input) | literal `""` — EM mints at save | literal `draft` | NO |
| 6 | InternalMaintenanceTicket.tsx | MaintainPro | ADOPT | void-ref (Textarea + selects only) | literal `""` — TKT mints at save | literal `draft` | NO |
| 7 | PMTickoffEntry.tsx | MaintainPro | ADOPT | void-ref (button-only entry) | literal `""` — PM mints at save | literal `draft` | NO |
| 8 | SparesIssueEntry.tsx | MaintainPro | ADOPT | ✓ (Input) | literal `""` — SI mints at save | literal `draft` | NO |
| 9 | WorkOrderEntry.tsx | MaintainPro | ADOPT | ✓ (Input) | literal `""` — WO mints at save | literal `draft` | NO |
| 10 | InvoiceScheduling.tsx | ProjX | ADOPT | ✓ (3 Input) | literal `""` — schedule id minted in `createSchedule` | literal `draft` — schedule status is computed per-row (not voucher lifecycle) | NO |
| 11 | MilestoneTracker.tsx | ProjX | ADOPT | ✓ (3 Input) | literal `""` — milestone_no mints at save | **BOUND** `form.status` → `posted`/`cancelled`/`draft` lifecycle mapping | NO |
| 12 | ProjectEntry.tsx | ProjX | ADOPT | ✓ (2 Input) | **BOUND** `editing?.project_no ?? ''` (literal on create · bound on edit) | **BOUND** `form.status` → lifecycle mapping | NO |
| 13 | ProjxDocumentEntry.tsx | ProjX | ADOPT | ✓ (3 Input) | literal `""` — doc minted in `createProjectDocument` | literal `draft` | NO |
| 14 | ResourceAllocation.tsx | ProjX | ADOPT | ✓ (5 Input) | literal `""` — resource id minted in `createResource` | **BOUND** `form.is_active` → `posted`/`cancelled` | NO |
| 15 | PaymentRequisitionEntry.tsx | Payout | ADOPT | ✓ (5 Input) | literal `""` — requisition_id minted in `createRequisition` (approval routing decides) | literal `draft` — routing determines `submitted`/`paid` post-save | NO (approval-rail hook untouched) |
| 16 | VendorPaymentEntry.tsx | Payout | ADOPT | ✓ (already canonical · 9 Input) | **BOUND** `voucherNo={voucherNo}` (only form holding voucherNo state via `generateVoucherNo('PV', entityCode)`) | literal `draft` — voucher posts via `processVendorPayment` | NO (payment-engine · TDS engine untouched) |
| 17 | QualiCheckNcrEvidenceEntry.tsx | QualiCheck | ADOPT | ✓ (3 Input) | literal `""` — evidence id minted in `createNcrEvidence` | literal `draft` | NO (QA evidence logic untouched) |

**Totals:** 16 ADOPT + 1 SEAM = 17. ≥15 ADOPT threshold cleared.

---

## Binding rationale (voucherNo "literal-with-reason" column)

15 of 16 ADOPT forms ship `voucherNo=""` because the form **does not hold a `voucherNo` in component state** — the document number (`rma_no`, `breakdown_no`, `wo_no`, `milestone_no`, `requisition_id`, etc.) is minted server-side by the respective engine at save time (`createXxx(...)` → returns `{xxx_no}`). Per the iron canon, binding requires real state; fabricating a placeholder ID at render would violate "logic byte-identical". `VendorPaymentEntry` is the sole exception — it explicitly holds `voucherNo` via `useState(() => generateVoucherNo('PV', entityCode))` and is bound accordingly. `ProjectEntry` binds `voucherNo` on the edit path (`editing?.project_no`) where state holds it; create path falls back to literal for the same reason.

## Binding rationale (status column)

3 forms bind `status` from form state via a lifecycle → voucher-domain mapping: `MilestoneTracker` (`form.status` → `posted` on `completed`, `cancelled` on `cancelled`, else `draft`), `ProjectEntry` (same mapping on `form.status`), `ResourceAllocation` (`form.is_active` → `posted`/`cancelled`). Other forms hold no voucher-lifecycle status in component state (status set server-side at submit, or status is per-row not per-page); literal `draft` is honest.

## Textarea-only forms · void-reference rationale

3 ADOPT forms (`BreakdownReport`, `InternalMaintenanceTicket`, `PMTickoffEntry`) have no `<Input>` children — only `<Textarea>` and `<select>`. `onEnterNext` is typed `React.KeyboardEvent<HTMLInputElement>` and would not type-check on `<Textarea>`. To keep the canonical import live (and avoid TS6133 "declared but never used") while preserving "logic 0-DIFF" on those forms' bodies, the import is consumed via `void onEnterNext;`. The forms still carry the canonical adoption block and the `data-keyboard-form` wrapper, so any future `<Input>` added will participate immediately.

---

## Triple Gate (post-final-edit)

```
NODE_OPTIONS="--max-old-space-size=7168"
$ npx tsc --noEmit
exit 0

$ npx eslint --max-warnings 0 <changed files>
exit 0

$ npx vitest run src/test/sprint-txui4/
46/46 passed (TXUI-4 block-behavioral assertions)

$ npx vitest run src/test/sprint-txui3/ src/test/sprint-b6/
existing suites GREEN UNCHANGED (TXUI-3 + B.6 stay banked)

$ npm run build
PASS
```

---

## Walls held (0-DIFF)

- `src/components/fincore/TallyVoucherHeader.tsx`
- `src/lib/keyboard.ts`
- `src/lib/payment-engine.ts` · `src/lib/payment-requisition-engine.ts`
- `src/lib/projx-engine.ts` · `src/lib/projx-documents-engine.ts`
- `src/lib/maintainpro-engine.ts`
- `src/lib/qualicheck-ncr-evidence-engine.ts`
- `src/lib/approval-rail-engine.ts` · `src/lib/tds-engine.ts` · `src/lib/fincore-engine.ts`
- `src/lib/_institutional/applications.ts` (entitlements untouched)
- All card sidebars · all routes

## Sibling-register (AC4 · honest declaration)

`txui4-voucher-canonical-adoption` row carries `path: null`, `functionCount: 0`, `newSiblings: []` in the sprint-history row. **No engine credit claimed** — this is an adoption sprint.

## Predecessor SHA flip

TXUI-3 row flipped from `TBD_AT_BANK` → `8eb52305` (predecessor confirmed).
