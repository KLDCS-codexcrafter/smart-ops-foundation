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

## T1 Remediation · 2026-06-09 · test floor lift (18 → 23)

Architect verified all VP-GAPS substance was banked on `8283bb34` (engine
consumes base scores read-only · no ccc · no creds · base types + applications
0-DIFF · retention additive · A.2 SHA flipped · no regression of A.2/A.4R/A.5).
The ONLY remediation required was lifting the vpg test from 18 it() blocks
to ≥20.

### Added 5 meaningful behaviors (no padding)

| # | New it()                                                              | Behavior asserted                                                                 |
|---|------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| 1 | DCN debit-vs-credit distinction                                        | `kind` field preserves DN vs CN · amount stays non-negative integer paise          |
| 2 | document-request full lifecycle                                        | pending → sent → submitted → verified · reminder accrual · actor+ts stamping       |
| 3 | payment-batch status flow                                              | draft → queued → released · underlying requisition store UNTOUCHED (no dupe accto) |
| 4 | risk-alert acknowledge → resolved                                      | open→ack→resolved · actor stamps · status-filter list shrinks/grows correctly      |
| 5 | threshold edit re-evaluates zone                                       | tightening `reliability_min_green` flips a borderline vendor off green             |

Test count: **23** (≥ 20 floor).

### Post-final-edit gate pastes

**tsc (repo-wide)**: exit 0 · no output.

**vitest sprint-vpg**:
```
✓ src/test/sprint-vpg/vpg-block-behavioral.test.ts (23 tests) 19ms
Test Files  1 passed (1)
Tests       23 passed (23)
```

**vitest sprint-vpg + sprint-a2 + sprint-b6 + sprint-p83..p87**:
```
✓ src/test/sprint-p83/p83-block4-meta.test.ts        (11 tests)
✓ src/test/sprint-p83/p83-block5-behavioral.test.ts  (32 tests)
✓ src/test/sprint-p84/p84-block3-behavioral.test.ts  (32 tests)
✓ src/test/sprint-p84/p84-block4-meta.test.ts        (7  tests)
✓ src/test/sprint-p84/p84-t1-escaped-paths.test.ts   (4  tests)
✓ src/test/sprint-p85/p85-block4-behavioral.test.ts  (30 tests)
✓ src/test/sprint-p86/p86-block-behavioral.test.ts   (29 tests)
✓ src/test/sprint-p87/p87-block-behavioral.test.ts   (28 tests)
✓ src/test/sprint-b6/b6-block-behavioral.test.ts     (24 tests)
✓ src/test/sprint-a2/a2-block-behavioral.test.ts     (23 tests)
✓ src/test/sprint-vpg/vpg-block-behavioral.test.ts   (23 tests)
Test Files  11 passed (11)
Tests       243 passed (243)
```

**eslint (repo-wide --max-warnings 0)**: exit 0 · no findings.

**build**: Lovable harness runs the build on every push; the prior VPG bank
commit (`8283bb34`) passed build cleanly. Only the test file changed in this
remediation — no source / config diff that could affect bundling.

### Files touched in T1

- edited `src/test/sprint-vpg/vpg-block-behavioral.test.ts` (+5 it blocks)
- edited `audit_workspace/VPG_close_evidence/VPG_close_summary.md` (this section)

No engine, type, panel, sidebar, retention, or institutional register file
was touched. VP-GAPS substance remains exactly as banked on `8283bb34`.
