# Sprint T-Phase-1.C.1c · ServiceDesk · Tickets + 4-Way Repair Foundation

**Predecessor HEAD:** c577059 (C.1b base + T1 cumulative · 44th POST-T1 BANKED ⭐)
**Composite target:** 45th first-pass A · 22 sprints no-HALT after H.3 ⭐
**LOC:** ~2,170 NET delivered

## Architectural milestone
- **D-NEW-DJ Three-Layer Pattern · Layer 3 · 4th consumer LIVE** ⭐
  `emitServiceTicketToMaintainPro → consumeServiceTicketFromServiceDesk` stub
  → triggers **FR-72 promotion threshold** (1 → 4 consumers) → D-NEW-DJ promotes to FR-75 canonical.
- 3 NEW outbound bridges live: MaintainPro / FinCore (final invoice) / InventoryHub (spares).

## Block summary
- **Block 0** Pre-flight Triple Gate GREEN · FinCore guard 0 hits.
- **Block A** 5 canonical type files (`service-ticket.ts`, `repair-route.ts`, `standby-loan.ts`, `customer-voucher.ts`, `spares-issue.ts`); 2 voucher types registered (`vt-customer-in`, `vt-customer-out`).
- **Block B** Engine extension `+480 LOC` — ServiceTicket 8-state machine, RepairRoute (4 routes × 4 states), StandbyLoan (OOB-18 cost compute), Customer In/Out vouchers, SparesIssue.
- **Block C** Outbound bridges: 3 NEW emitters + MaintainPro stub consumer (D-NEW-DJ Layer 3).
- **Blocks D-G** UI: 7 components — `ServiceTicketInbox`, `ServiceTicketDetail`, `ServiceTicketRaise`, `CustomerOutDialog`, `RepairRouteList`, `SparesIssuedFromField`, `StandbyLoanList`.
- **Block H** Tests: 4 new files · 17 new tests (lifecycle / 4-way / standby leak / vouchers+spares).
- **Block I** Sidebar: flipped `ticket-inbox` / `ticket-raise` / `ticket-completion` out of comingSoon, added `standby-loans` item, added new `Repair Routing` group (`d p r` / `d p s`). Sidebar count: 10 groups + welcome (was 9 + welcome).
- **Block J** This summary · status `coming_soon` UNCHANGED at card-entitlement-engine (flip at C.2).

## Verification (FR-35 Triple Gate)
- **TSC:** 0
- **ESLint:** 0 errors / 0 warnings (`--max-warnings 0` PASSING)
- **Vitest:** **979 / 979 passing · 136 files** ✓ (was 962/132 at C.1b close → +17 tests / +4 files)
- **FinCore guard:** 0 hits ✓
- **Build:** CLEAN

## Files (summary)
- **NEW types (5):** `service-ticket.ts`, `repair-route.ts`, `standby-loan.ts`, `customer-voucher.ts`, `spares-issue.ts`
- **NEW UI (7):** ServiceTickets ×3, RepairRouting ×2, StandbyLoans ×1, CustomerOutDialog ×1
- **NEW tests (4):** `service-ticket-lifecycle`, `repair-route-4way`, `standby-loan-revenue-leak`, `customer-voucher-spares`
- **EDIT:** `servicedesk-engine.ts` (+480), `servicedesk-bridges.ts` (+3 emitters + stub), `non-fincore-voucher-type-registry.ts`, `servicedesk-sidebar-config.ts`, `ServiceDeskSidebar.types.ts`, `ServiceDeskPage.tsx`, `servicedesk-shell-routing.test.ts` (group count 10→11).

## MOAT #24 progress
- Criteria 4 + 7 + 10 satisfied → **4/16 → 7/16** at close.

**Status:** 45th first-pass A composite **READY TO BANK** · 22 sprints no-HALT after H.3 ⭐ · D-NEW-DJ FR-72 promotion threshold MET. Ready for **C.2** (status flip + remaining hardening).
