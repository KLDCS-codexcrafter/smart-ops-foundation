# D-226 · Universal Transaction Standard (UTS)

Sprint T-Phase-1.2.6a · Card #2.6 sub-sprint 1 of 5 · Foundation lock

## Decision

Every operational transaction record in Operix conforms to the **8-dimension
Universal Transaction Standard**, regardless of which card owns the source
panel. FineCore vouchers are the gold reference; non-voucher records (GRN,
MIN, RTV, Quotation, SRM, IM, SOM, DOM, DM, SecondarySales, Project, Milestone,
TimeEntry, CycleCount, ConsumptionEntry) MUST present the same eight
dimensions when surfaced in registers, prints, exports, and audit views.

## The 8 Dimensions

1. **Doc number** — FY-scoped, monotonic, generated via `generateDocNo(prefix, entityCode)`.
2. **Voucher / primary date** — the operational date of the record.
3. **Effective date** — accounting date when posting effect lands; falls back to primary date when null. Optional field; pattern `record.effective_date ?? record.primary_date`.
4. **Status** — finite state machine with audit hooks at every transition.
5. **Reference linkage** — every record cites its source (PO, SO, GRN, etc.).
6. **Decimal-safe money math** — ₹ values via `@/lib/decimal-helpers`; never `Math.round`.
7. **Audit trail** — every CRUD + state transition logs to `audit-trail-engine`.
8. **Print + Export parity** — letterhead block, signatory rows, T&Cs in print; Excel/PDF/Word/CSV via `universal-export-engine`.

## Hybrid Treatment Table (ProjX Special Case)

| Record | Treatment | Rationale |
|--------|-----------|-----------|
| Project | **Master** | Long-lived; status-tracked; no posting effect. |
| ProjectMilestone | **Master** | Child of Project; calendar artifact. |
| TimeEntry | **Voucher** | Posting effect on payroll/billing; full UTS. |

## Sibling-Abstraction Rationale

`src/components/finecore/registers/RegisterGrid.tsx` is voucher-typed and
backs 13 production register pages. Generalising it in place is a high-risk
refactor with zero upside for FineCore. Instead we ship a sibling
`UniversalRegisterGrid<T>` at `src/components/registers/` with identical UX
contracts. FineCore stays untouched; non-voucher cards adopt the sibling.

This preserves D-127's zero-touch invariant transitively (voucher form pages
remain unaltered) and isolates UTS evolution from FineCore release cadence.

## Forward-Looking Hook · D-227

The audit framework that verifies every register/print/export against UTS
lands in **D-227** (Sprint T-Phase-1.2.6e). Until then, conformance is
enforced via this document, the `universal-export-engine` contract, and code
review.

## Status

- 1.2.6a · **closed** — abstractions + schema fields landed.
- 1.2.6b · pending — Inventory retrofits.
- 1.2.6c · pending — SalesX retrofits.
- 1.2.6d · pending — ProjX + Dispatch retrofits.
- 1.2.6e · pending — D-227 audit framework + governance.
