# Sprint T-Phase-1.A-c.2 · Vendor RFQ + Bid + PO Flows · Close Summary

**Sprint ID**: T-Phase-1.A-c.2-VendorPortal-RFQ-Bid-PO-Flows
**Predecessor HEAD**: a58bfa86 (Sprint A-c.1 · 17th A streak)
**Date**: 2026-05-18
**Streak target**: 18th consecutive A first-pass-clean
**Mode**: VENDOR-SIDE PROCURE WORKFLOWS · 3 new pages · CONSUME ONLY engines

## §1 · Sprint Outcome
- ✅ VendorEnquiryResponse NEW · modern RFQ list + drill-down · 4 filter tabs · Saathi badge
- ✅ VendorBidSubmission NEW · authenticated in-portal quote submission · same `submitQuotation` engine as RFQPublicForm
- ✅ VendorPOView NEW · vendor read-only PO view · vendor_id scope filter · status tracking
- ✅ App.tsx · 3 new lazy imports + 4 new routes
- ✅ VendorPortalLayout · 2 `comingSoon: 'A-c.2'` flags removed · NEW `/enquiries` entry · Inbox renamed to legacy

## §2 · Files Changed (6 total)
1. `src/pages/vendor-portal/VendorEnquiryResponse.tsx` (NEW)
2. `src/pages/vendor-portal/VendorBidSubmission.tsx` (NEW)
3. `src/pages/vendor-portal/VendorPOView.tsx` (NEW)
4. `src/App.tsx` (UPDATE · 3 lazy imports + 4 routes)
5. `src/pages/vendor-portal/VendorPortalLayout.tsx` (UPDATE · NAV)
6. `src/__tests__/__sprint-summaries__/a-c-2-vendor-portal-rfq-bid-po-flows-close-summary.md` (NEW)

## §3 · D-Decisions
| ID | Description |
|---|---|
| D-NEW-EA | Authenticated in-portal bid submission parallel to public token landing (RFQPublicForm stays · VendorBidSubmission added · both call same `submitQuotation` engine) |
| D-NEW-EB | Vendor-side PO read view scope pattern · client-side `vendor_id` filter on engine output |

## §4 · Mid-Flight Schema Corrections (D-NEW-DX 3rd Validation)
Per D-NEW-DX Empirical Schema Verification · pre-code grep against actual engine signatures caught 6 mismatches in Step 2 prompt. All 6 fixes applied before any code was written:

| # | Issue | Fix |
|---|---|---|
| F1 | `markFirstQuoteSubmitted` called with 3 args | Engine is 2-arg `(vendorId, entityCode)` · dropped 3rd arg |
| F2a | `SubmitQuotationInput.lines` missing required fields | Added `delivery_days: 7`, `remarks: ''`, `is_supplied: true` defaults |
| F2b | `SubmitQuotationInput.lines` had non-existent fields | Removed `item_name`, `uom`, `qty_required`, `amount` |
| F3 | `submitted_by` required field omitted | Added `submitted_by: session.party_name` |
| F4 | `source: 'portal'` invalid enum | Changed to `source: 'portal_submission'` |
| F5a | PO line `key={line.po_line_no}` references non-existent field | Use `key={line.id}` |
| F5b | PO line `line.qty_ordered` references non-existent field | Use `line.qty` |
| Bonus | Enquiry line `qty_required` is actually `required_qty` | Corrected source-field reference in pre-fill + render |
| Extra | `submitQuotation` has no `notes` field | Dropped from call · vendor notes now flow to `recordVendorActivity` notes param |

D-NEW-DX is now formally institutional muscle memory · validated across A-b.2 (e.kind) → A-c.1 (auth-engine API) → A-c.2 (6+1 schema mismatches). Recommend promotion to FR-83 at next FR ceremony: "Pre-Code Engine Signature Verification · mandatory for Step 2 prompts that consume existing engines".

## §5 · Triple Gate
- STRICT TSC `tsc --noEmit -p tsconfig.app.json` → 0 errors
- ESLint → 0 errors / 0 warnings
- Vitest → 1211 passed / 165 files / 0 failed (IDENTICAL)
- Build → clean

## §6 · 0-Diff Compliance
- All consumed engines (vendor-quotation-engine, po-management-engine, vendor-onboarding-engine, vendor-portal-auth-engine, vendor-portal-scope) 0-diff per Rule #4 CONSUME ONLY.
- `RFQPublicForm.tsx` 0-diff (public token-landing stays).
- `VendorInbox.tsx` 0-diff (legacy chrome retained · renamed in NAV only).
- All A.1+A.2+A-b.1+A-b.2+A-c.1 work 0-diff.

## §7 · Forward
- Next: Sprint A-c.3 · VendorKYCManagement + VendorInvoiceUpload + VendorMessages + VendorPerformanceView (~1200 LOC · 19th A · A-c arc closure)
- After: Sprint A-d · Branding + i18n + Proxy cleanup
- Then: Sprint B · Procurement Flow UI Integration
