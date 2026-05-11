# Sprint T-Phase-1.A.16b · MaintainPro Foundation (Transactions + Internal Helpdesk) · CLOSE SUMMARY

Date: 2026-05-13
Predecessor HEAD: 3ecc3f38 (A.16a.T1 close · 39th composite POST-T1)
Composite target: 40th first-pass A
MOAT: #22 preserved · #23 candidate progress (SiteX→MaintainPro CAPEX bridge end-to-end consumer wired)

## Deliverables (11 blocks complete)

- **Block A** · `src/types/maintainpro.ts` APPENDED 9 transaction types + SLA_MATRIX 28-cell constant (7 categories × 4 severities · FR-39 §B Audit Immutability). Existing 6 master types ABSOLUTE preserved.
- **Block B** · `src/lib/maintainpro-engine.ts` EXTENDED with 9 transaction CRUD + SLA computation + 3-level escalation engine + OOB-M1 NL pattern recognition + OOB-M7 spare velocity reorder + OOB-M2 AMC reminder cycle + state machine (5 states + Reopen path). Existing 6 master CRUD ABSOLUTE preserved.
- **Block C** · `src/lib/maintainpro-bridges.ts` NEW · 7 active bridges (consumeSiteXMaintainProHandoff · emitMaintenanceEquipmentDown · emitMaintenanceEquipmentRestored · emitSparePartReorderRequired · emitInternalTicketEscalation · consumeQualiCheckCalibrationFail · consumeSiteXPTWRequest) + 3 PLANNED documented (warranty-detect · FinCore-asset-entry · ServiceDesk-handoff).
- **Block D** · 3 transaction UIs · BreakdownReport (OOB-M1 pattern banner + OOB-M8 warranty banner) · WorkOrderEntry · PMTickoffEntry.
- **Block E** · 4 transaction UIs · SparesIssueEntry (OOB-M7 velocity alert) · EquipmentMovement · CalibrationCertificate · AMCOutToVendor (OOB-M2 reminder badges).
- **Block F** · InternalMaintenanceTicket UI · full 28-cell SLA matrix display · 5-state machine + Reopen · escalation level badges L0–L3 · category × severity SLA preview.
- **Block G** · AssetCapitalization UI (SiteX CAPEX bridge consumer view) + MaintenancePulseWidget mounted at top of `ProductionWelcome.tsx` (Q-LOCK-5 · Andon-style green/amber/red pulse · bidirectional capacity feedback) + MaintainProPage activeModule cases extended for 9 transactions (master cases ABSOLUTE preserved).
- **Block H** · 3 test files · `maintainpro-engine.test.ts` extended +8 transaction CRUD tests · `maintainpro-sla.test.ts` NEW (10 tests · matrix completeness + state machine + 3-level escalation) · `maintainpro-bridges.test.ts` NEW (9 tests · SiteX handoff round-trip + emit shapes + inbound guards).
- **Block I** · D-decision register progression (3 NEW POSSIBLE canonical: D-NEW-CY SLA Matrix · D-NEW-CZ Bidirectional Capacity · D-NEW-DB Sub-Contract Out-Return).
- **Block J** · this close summary + Triple Gate.

## D-decision registrations (v29 candidates)

- **D-NEW-CY POSSIBLE** · Internal Helpdesk SLA Matrix Pattern · 1 consumer (Internal Maintenance Ticket) · 4+ implicit future (ServiceDesk · warranty · distributor · transporter) · FR-72 candidate.
- **D-NEW-CZ POSSIBLE** · Bidirectional Capacity Feedback Pattern · 1 consumer (Production Hub) · 3+ implicit (ProjX · SiteX · OEE).
- **D-NEW-DB POSSIBLE** · Sub-Contract Out-and-Return Stock State Pattern · 1 consumer (AMC Out-to-Vendor) · 2 implicit future (Procure360 RTV · QualiCheck rework).

## Honest disclosures (Phase 1 stubs · [JWT] Phase 2 wires real)

- OOB-M1 pattern recognition: Phase 1 keyword overlap · `[JWT]` Phase 2 ML embedding semantic similarity.
- OOB-M7 spare velocity: Phase 1 simple averages · `[JWT]` Phase 2 rolling 24-month median.
- Cross-card guards (OOB-M5 QualiCheck calibration fail · OOB-M6 SiteX PTW): bridge consumers wired · real cross-card emit subscribers `[JWT]` Phase 2.
- FinCore voucher emission: `fincore_voucher_id` null at Phase 1 · `[JWT]` Phase 2 wires FinCore asset entry + ProjX project P&L.
- TimeEntry consumer: structured fields present on WO (assigned_to_user_id · actual_minutes) · `[JWT]` Phase 2 ProjX TimeEntry consumer.
- Internal Ticket 7-day auto-close: manual at Phase 1 · `[JWT]` Phase 2 cron job invokes `evaluateTicketEscalations`.

## SSOT discipline preserved

- CC VendorMaster · CC VendorType union · sidebar config · entitlement seed (`maintainpro` stays `'locked'` at A.16b · flips at A.17 per Q-LOCK-18) · A.15a `sitex-bridges.ts` (consumed via shape-import only · not modified) · D-127 · D-128a · D-249: **ZERO touch**.
- Maintenance vendor replica continues to filter `vendorType === 'service_provider'` (no global union extension).

## Path forward

A.16c MaintainPro Foundation (Reports + Mobile Landing + Hygiene) next: 14 reports + mobile landing + entitlement flip + T3 hygiene (Z-evidence trigger lock).
