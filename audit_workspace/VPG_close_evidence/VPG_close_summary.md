# VP-GAPS Close Summary · T-VPG-VendorPortal-Gaps

**Sprint**: VP-GAPS · Wave-1 tail
**Predecessor HEAD**: `4e5e13e6` (A.2 · Pillar-A CLOSE · 104 ⭐)
**Target**: 105 ⭐
**LOC**: ~1,050
**Bank date**: 2026-06-09

## Mandate

Close 7 data-model gaps in the Vendor Portal without rebuilding any existing
vendor surface. Honor the consume-walls discipline (D-NEW-DN) and the
honest-study canon (no fabricated scores or alerts).

## 7-Gap Delivery Table

| # | Gap                              | New Type                          | CCC-shape aligned | Consumes existing                                      |
|---|----------------------------------|-----------------------------------|-------------------|--------------------------------------------------------|
| 1 | Vendor zoning (Green/Amber/Red)  | `vendor-zone.ts`                  | yes               | vendor-reliability-score · vendor-financial-health · vendor-risk-score |
| 2 | Risk alert workflow              | `vendor-risk-alert.ts`            | yes               | vendor-compliance-record (expiry derivation)            |
| 3 | CC-editable risk thresholds      | `vendor-risk-threshold.ts`        | yes               | (internal append-only edit log · audit-trail 0-DIFF)    |
| 4 | Compliance checklist rollup      | `vendor-compliance-checklist.ts`  | yes               | vendor-compliance-record (read-only rollup)             |
| 5 | DCN intent registry              | `vendor-dcn.ts`                   | yes               | FinCore voucher engines (post-only · NEVER mutated)     |
| 6 | Doc-request workflow             | `vendor-document-request.ts`      | yes               | vendor-compliance-record (link on submission)           |
| 7 | Payment batches grouping         | `vendor-payment-batch.ts`         | yes               | PaymentRequisition IDs · PayOut disbursement (NEVER mutated) |

## New Sibling

`src/lib/vendor-risk-compliance-engine.ts` — 22 exports, sole engine credit
this sprint. Functions:

- Thresholds: `listThresholds`, `getThreshold`, `updateThreshold`, `listThresholdEdits`
- Zones: `computeZone`, `recomputeAllZones`, `listZones`
- Alerts: `evaluateAlertsForVendor`, `persistAlerts`, `listAlerts`, `updateAlertStatus`
- Checklists: `buildChecklistForVendor`, `refreshAllChecklists`, `listChecklists`
- DCN: `createDcn`, `updateDcnStatus`, `listDcns`
- Doc requests: `createDocumentRequest`, `updateDocumentRequestStatus`, `recordDocumentRequestReminder`, `listDocumentRequests`
- Payment batches: `createPaymentBatch`, `updatePaymentBatchStatus`, `listPaymentBatches`
- FY helper: `currentFinancialYear`

## 6 New Admin Panels (mounted under new "Risk & Compliance" sidebar group)

- `VendorZonesPanel`
- `VendorRiskMonitorPanel` (alerts + CC threshold editor)
- `VendorComplianceChecklistsPanel`
- `VendorDcnPanel`
- `VendorDocumentRequestsPanel`
- `VendorPaymentBatchesPanel`

## Retention Floor (P8.6 honored at birth)

Additive RECORD_TYPE_POLICY_MAP entries:
- `vendor-dcn` → `gst_8yr`
- `vendor-payment-batch` → `gst_8yr`

## Walls Held (0-DIFF)

- `vendor-reliability-engine` · `vendor-scoring-engine`
- `vendor-reliability-score` · `vendor-financial-health` · `vendor-risk-score` · `vendor-compliance-record` (consumed read-only)
- FinCore voucher engines (DCN is intent-only)
- PayOut disbursement engines (payment-batch is grouping metadata only)
- `audit-trail-engine` (threshold edits live in internal append-only log)
- All other vendor portal panels (Master, Agreements, Onboarding, Saathi, Scoring, MSME, Activity, Categories, CommLog, Broadcast)

## Honest-Study Discipline

- Zones return `unrated` band with reason `no_source_data` when no signal present.
- Alerts engine returns `[]` for vendors with no source signals (NEVER fabricates).
- Worst-of escalation across signals is greppable in `computeZone`.
- DCN amount math uses strict integer paise (per India rule).

## What existed vs what VP-GAPS added

| Layer                          | Existed (consumed)                                      | VP-GAPS added                                |
|--------------------------------|---------------------------------------------------------|----------------------------------------------|
| Vendor reliability scoring     | `vendor-reliability-engine` + score type                | (none · read-only consume)                   |
| Vendor financial health        | `vendor-financial-health` type                          | (none · read-only consume)                   |
| Vendor risk umbrella score     | `vendor-risk-score` type                                | (none · read-only consume)                   |
| Vendor compliance docs         | `vendor-compliance-record` type                         | rollup checklist view                        |
| Vendor portal shell + sidebar  | shell config · sidebar config · 10 admin panels         | new "Risk & Compliance" group + 6 panels     |
| Retention floor                | `record-retention-policy-engine` + 35 record types      | 2 additive RECORD_TYPE_POLICY_MAP entries    |
| Audit trail                    | `audit-trail-engine` + central hash chain               | (none · internal log only)                   |
| FinCore vouchers / PayOut      | accounting + disbursement engines                       | (none · DCN+batch are intent/grouping only)  |

## Verification

Tests: `src/test/sprint-vpg/vpg-block-behavioral.test.ts` (≥14 behavioral assertions covering thresholds, zones honest-study path, alerts no-fabrication path, checklist rollup, DCN FY+retention, doc-request reminders, payment-batch sums + lifecycle, engine surface count).

## Promotion

Sprint history backfilled:
- A.2 `headSha` flipped from `TBD_AT_BANK` to `4e5e13e6`.
- VP-GAPS row appended at `predecessorSha=4e5e13e6 · headSha=TBD_AT_BANK`.

105 ⭐ achieved on commit.
