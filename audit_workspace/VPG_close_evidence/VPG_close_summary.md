# Sprint VP-GAPS · Close Summary

**Sprint:** `T-VPG-VendorPortal-Gaps` · Wave-1 tail · 7 vendor data-model gaps (ccc-reference-aligned)
**Predecessor HEAD:** `4e5e13e6` · A.2 banked · Pillar-A closed · 104 ⭐
**Streak target:** 105 ⭐
**LOC:** ~1,050 (7 new types + 1 engine + 6 admin panels + tests + history/sibling)
**Bank date:** 2026-06-09

---

## §A · The 7 Gaps · Delivery Table

| # | Gap | New Type | ccc-shape-aligned | Consumes-existing | Persistence (Wave-1) |
|---|---|---|---|---|---|
| 1 | `vendor_zones` | `src/types/vendor-zone.ts` (`VendorZone`) | ✓ `zone_code · zone_name · region · parent_zone_id?` | — (master) | `erp_vendor_zones_<entity>` |
| 2 | `vendor_risk_alerts` | `src/types/vendor-risk-alert.ts` (`VendorRiskAlert`) | ✓ `severity · rule_id · status: open\|acknowledged\|resolved` | reliability/financial/compliance scores (read-only via engine) | `erp_vendor_risk_alerts_<entity>` |
| 3 | `vendor_risk_thresholds` | `src/types/vendor-risk-threshold.ts` (`VendorRiskThreshold`) | ✓ `metric · operator · value · severity · active` | — (CC-editable rules) | `erp_vendor_risk_thresholds_<entity>` |
| 4 | `vendor_compliance_checklists` | `src/types/vendor-compliance-checklist.ts` (`VendorComplianceChecklist`) | ✓ `items[].label · required · status · doc_ref` | **`VendorComplianceRecord` 0-DIFF** (verification_status mirrored) | `erp_vendor_compliance_checklists_<entity>` |
| 5 | `vendor_debit_credit_notes` (DCN) | `src/types/vendor-dcn.ts` (`VendorDebitCreditNote` + `VendorDcnLine`) | ✓ `type · dcn_no · fiscal_year_id · lines[] · amount · status` | — (intent registry only · accounting via existing voucher path) | `erp_vendor_dcn_<entity>` |
| 6 | `vendor_document_requests` | `src/types/vendor-document-request.ts` (`VendorDocumentRequest`) | ✓ `doc_type · requested_at · due_date · status: requested\|submitted\|verified\|overdue` | references `VendorComplianceRecord.compliance_type` | `erp_vendor_document_requests_<entity>` |
| 7 | `vendor_payment_batches` | `src/types/vendor-payment-batch.ts` (`VendorPaymentBatch`) | ✓ `batch_no · fiscal_year_id · requisition_ids[] · total_amount · status` | **`PaymentRequisition` 0-DIFF** via `listRequisitions` (NO duplicate accounting) | `erp_vendor_payment_batches_<entity>` |

> FY-stamped gaps (#5 DCN, #7 payment-batches) carry P8.6 retention floor `retention_policy=companies_act_8yr` at birth.

---

## §B · New SIBLING (sole engine credit)

**`src/lib/vendor-risk-compliance-engine.ts`** — 22 exports
- **Zones**: `listVendorZones · createVendorZone · updateVendorZone`
- **Threshold rules (CC-editable)**: `listRiskThresholds · upsertRiskThreshold · deleteRiskThreshold · listThresholdAuditLog` (internal audit log · does NOT touch `types/audit-trail.ts` wall)
- **Risk-alert evaluation**: `evaluateRiskThresholds · listRiskAlerts · updateRiskAlertStatus`
  - Consumes `loadVendorScores` (reliability) + `vendorFinancialHealthKey` (financial-health) + `vendorComplianceRecordKey` (verified coverage %)
  - **Honest no-alert** when source scores absent · NEVER fabricates · NEVER recomputes base scores
  - Dedupes per open rule × vendor
- **Compliance checklist**: `buildComplianceChecklist · listComplianceChecklists`
- **DCN**: `createDcn · listDcn · updateDcnStatus`
- **Document requests**: `createDocumentRequest · listDocumentRequests · updateDocumentRequestStatus · flagOverdueDocumentRequests`
- **Payment batches**: `createPaymentBatch · listPaymentBatches · updatePaymentBatchStatus` (GROUPS payment-requisition IDs · NO duplicate accounting)

---

## §C · Admin surfaces (panels-pattern · `applications.ts` 0-DIFF)

Mounted via existing `vendor-portal/panels/*` + `vendor-portal-sidebar-config.ts` + `VendorPortalPage.tsx` switch (same shape as `VendorScoringPanel`):
1. `VendorZonesPanel.tsx` (`vendor-zones` · `v z`)
2. `VendorRiskMonitorPanel.tsx` (`vendor-risk-monitor` · `v r`) — alerts list + threshold rules editor + Evaluate-now action
3. `VendorComplianceChecklistsPanel.tsx` (`vendor-compliance-checklists` · `v c`)
4. `VendorDcnPanel.tsx` (`vendor-dcn` · `v d`)
5. `VendorDocumentRequestsPanel.tsx` (`vendor-document-requests` · `v q`) — including Sweep-overdue
6. `VendorPaymentBatchesPanel.tsx` (`vendor-payment-batches` · `v y`)

---

## §D · Walls held (0-DIFF · verified)

- `src/types/vendor-reliability-score.ts` — 0-DIFF
- `src/types/vendor-compliance-record.ts` — 0-DIFF
- `src/types/vendor-financial-health.ts` — 0-DIFF
- `src/lib/payment-requisition-engine.ts` — 0-DIFF (consumed via `listRequisitions`)
- `src/lib/audit-trail-engine.ts` + `src/types/audit-trail.ts` — 0-DIFF (threshold audit uses internal append-only log)
- `applications.ts`, entitlements, hash-chain — 0-DIFF
- `record-retention-policy-engine.ts` — additive only (`vendor-dcn` + `vendor-payment-batch` → `companies_act_8yr`)
- ccc never imported (grep `craft.company.canvas` in engine = 0)

---

## §E · Quad-Gate evidence (post-final-edit, under `NODE_OPTIONS="--max-old-space-size=7168"`)

```
$ npx tsc --noEmit
# exit 0 · 0 errors

$ npx eslint . --max-warnings 0
# exit 0 · 0 warnings

$ npx vitest run src/test/sprint-vpg src/test/sprint-a2 src/test/sprint-b6 \
       src/test/sprint-p83 src/test/sprint-p84 src/test/sprint-p85 \
       src/test/sprint-p86 src/test/sprint-p87
Test Files  11 passed (11)
     Tests  248 passed (248)
  (sprint-vpg = 28 it() · all green)

$ npm run build
✓ built in 56.21s
```

---

## §F · Institutional updates

- `src/lib/_institutional/sprint-history.ts` — A.2 row headSha flipped `TBD_AT_BANK → 4e5e13e6` (CONFIRMED) · VP-GAPS row appended (predecessor `4e5e13e6` · newSiblings `['vendor-risk-compliance-engine']`).
- `src/lib/_institutional/sibling-register.ts` — `vendor-risk-compliance-engine` registered (22 exports · 5 moats).

---

*VP-GAPS close · Wave-1 tail · 7 vendor data-model gaps closed · ccc-reference-aligned (Wave-2 migration-ready) · base scores CONSUMED 0-DIFF · payment-requisition CONSUMED 0-DIFF · honest no-alert canon · 104 → 105 ⭐.*
