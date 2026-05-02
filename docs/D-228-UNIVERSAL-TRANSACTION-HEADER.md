# D-228 · Universal Transaction Header (UTH) Standard

**Sprint:** T-Phase-1.2.6d-hdr · **Status:** Locked
**Companion to:** D-226 Universal Transaction Standard

## Mandate

Every transaction record (voucher, memo, GRN, milestone, time entry, etc.) MUST
carry consistent header metadata for audit, compliance, and traceability.

## The 6 UTH Fields (all optional for backward compat)

| Field | Type | Source of Truth | Compliance Anchor |
|---|---|---|---|
| `created_by?` | string | auth-helpers.getCurrentUser().id | MCA Sec 128 + Rule 3(1) |
| `updated_by?` | string | auth-helpers.getCurrentUser().id | CGST Rule 56(8) |
| `posted_at?` | ISO date-time | approval-workflow-engine on submit/approve | Period-close discipline |
| `cancelled_at?` | ISO date-time | approval-workflow-engine on reject/cancel | Audit trail |
| `cancel_reason?` | string (10+ chars when cancelling) | User-entered, mandatory on cancel (Q6-a) | Audit discipline |
| `narration?` | string | User-entered (form input · Q3-a UPGRADED) | Tally-Prime baseline |
| `reference_no?` | string | User-entered (external doc · vendor inv, customer PO) | CGST 36(4) ITC matching |

## OOB Schema Hooks (Q5-all bundled)

| Field | Type | Purpose |
|---|---|---|
| `voucher_hash?` | string (FNV-1a Phase 1) | OOB-12 · auto-stamped on posted_at · tamper detection |
| `currency_code?` | ISO-4217 string | OOB-14 · default 'INR' · multi-currency hook |
| `exchange_rate?` | number | OOB-14 · default 1 · multi-currency hook |

## Backward Compatibility (Q4-a)

- ALL fields strictly optional · existing seed records load fine
- New writes populate via `uth-stamper.ts` helpers
- No data migration required · no destructive change

## Compliance Mapping

- MCA Companies Act 2013 Sec 128 — `created_by` + `entity_id` satisfy "by whom"
- CGST Rule 36(4) — `reference_no` with hard-block duplicate detection (Q7-b) closes ITC double-claim risk
- CGST Rule 56(8) — `updated_by` + audit-trail-engine combo satisfy "modification register"
- 8-year retention — UTH metadata persists with the transaction record

## Scope (15 transaction types)

GRN, MIN (MaterialIssueNote), ConsumptionEntry, CycleCountEntry, RTV, Quotation,
SupplyRequestMemo, InvoiceMemo, SecondarySales, SampleOutwardMemo, DemoOutwardMemo,
DeliveryMemo, Project, ProjectMilestone, TimeEntry.

`Voucher` and `VoucherType` already carry these fields and are NOT touched (D-128 lock).

## Q1=(a) Reference No Strategy

`reference_no` is a SINGLE optional generic field. Existing typed refs
(`vendor_invoice_no`, `po_no`, `enquiry_no`, etc.) stay where they are.
`reference_no` captures long-tail external references not modeled by typed fields.

## Q7=(b) Duplicate Reference Detection

- For purchase-side (GRN, RTV): hard-block when `(vendor_id, reference_no, FY)` already exists.
- For sales-side (Quotation, InvoiceMemo): hard-block when `(customer_id, reference_no, FY)` exists.
- Override path: user provides a 10+ char override reason · save proceeds with
  `[Override: <reason>]` prefix in narration.

## Going Forward

- Card #2.7 sprints leverage UTH for richer features (voucher_class, RCM, etc.)
- 1.2.6e-audit verifies UTH coverage on all 15 types
