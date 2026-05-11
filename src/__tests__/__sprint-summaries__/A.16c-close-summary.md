# Sprint T-Phase-1.A.16c · MaintainPro Foundation (Reports + Mobile Landing + Hygiene) · CLOSE SUMMARY

Predecessor: 26dc7337 (A.16b.T1 close · 40th composite POST-T1)
Composite target: 41st first-pass A
**FR count: 73 → 74 (FR-74 Keyboard Namespace per Card promoted from D-NEW-CC)**

## Deliverables (11 blocks)

- **Block A** · MaintainProReportShell shared component (D-NEW-DC POSSIBLE 26th canonical · ~65 LOC)
- **Block B** · 5 TDL-inherited reports preserving FR-42 institutional gold (MaintenanceEntryDayBook · CalibrationStatusReport · FireSafetyExpiryReport · EquipmentHistory · SparesIssueDayBook)
- **Block C** · 5 operational reports (MTBFMTTRReport · PMComplianceReport · OpenWOStatusReport · AMCOutToVendorStatus · EnergyESGDashboard OOB-M12)
- **Block D** · 4 SLA reports deferred from A.16b (OpenTicketsLive · SLAPerformanceReport 28-cell heatmap · AgingTicketsReport · TopReportersByDepartment)
- **Block E** · ProductionCapacityLiveDashboard standalone (auto-refresh 30s · Andon · group-by · D-NEW-DD POSSIBLE 27th canonical). A.16b MaintenancePulseWidget on Production Welcome ABSOLUTE preserved.
- **Block F** · Mobile landing (MobileMaintenanceTechnicianPage · 4 capture stubs marked "Available at A.17" · 3 live summary tiles) + OperixGoPage redirect tile + `/operix-go/maintenance-technician` route in App.tsx + MOBILE_PRODUCTS registry NEW (D-NEW-CV 13th consumer · D-NEW-DE POSSIBLE 28th canonical 2 consumers)
- **Block G** · T3 hygiene · FR-30 headers backfilled on 4 A.15b test files (sitex-mobile-captures · sitex-closeout-guards · sitex-imprest-engine · sitex-ra-bill-engine — spec listed 5, only 4 exist as A.15b artifacts · honest disclosure) · Operix_Execution_Discipline_v1.md NEW (Z-evidence trigger lock) · filterSidebarByMatrix wrapped in useMemo in Shell.tsx
- **Block H** · 3 test files (maintainpro-reports + maintainpro-mobile-routing + shell-memoization) using file-inspection pattern matching shell-memoization precedent (no testing-library runtime dependency)
- **Block I** · FR-74 promotion + 3 NEW POSSIBLE D-decisions (D-NEW-DC Report Shell · D-NEW-DD Production Capacity Live Dashboard · D-NEW-DE Mobile Landing Page Pattern role-based)
- **Block J** · MaintainProPage 15 NEW case branches + this close summary + Triple Gate

## FR-74 Promotion (institutional event · Q-LOCK-8)

> **FR-74 · Keyboard Namespace per Card** · `<card-prefix> <module-key>` pattern. Every card on Operix Shell MUST register a 1-letter keyboard namespace prefix and assign `keyboard:` properties on sidebar config items using `<prefix> <module-key>` format. Sidebar config audit at sprint close enforces 100% keyboard coverage on items (groups exempt). Promoted from D-NEW-CC POSSIBLE 5th canonical at A.16c close per FR-72 sibling promotion (7 consumers ≥ 4 threshold).
>
> Existing compliant cards (7): Command Center · Procure360 · InventoryHub · QualiCheck · EngineeringX · SiteX · MaintainPro
> Future cards MUST register namespace at Foundation sprint: ServiceDesk · FrontDesk · etc.

FR count: 73 → 74. Validates FR-72 sibling promotion discipline working as designed.

## D-decision registrations at v30

- **D-NEW-DC POSSIBLE 26th canonical** · Report Shell Component Pattern · 1 consumer (MaintainPro 14 reports) · 4+ implicit future (Procure360 · InventoryHub · ProjX · FineCore) · FR-72 candidate at scale
- **D-NEW-DD POSSIBLE 27th canonical** · Production Capacity Live Dashboard Pattern · 1 consumer · 2+ implicit (SiteX site capacity · ProjX resource availability)
- **D-NEW-DE POSSIBLE 28th canonical** · Mobile Landing Page Pattern role-based · 2 consumers (SiteX site_engineer + MaintainPro maintenance_technician) · 4+ implicit future · FR-72 candidate (only 2 short)

## Honest disclosures

- Reports use engine list functions directly (no Phase 2 backend abstraction at A.16c · `[JWT]` Phase 2 wires real query engine)
- Production Capacity Live Dashboard auto-refresh: setInterval 30s at Phase 1 · `[JWT]` Phase 2 WebSocket streaming
- Export buttons (CSV · PDF · Excel) Phase 1 stubs · `[JWT]` Phase 2 real generation
- Mobile capture tiles disabled with "Available at A.17" markers · captures land at A.17 per OOB-M9 5-step pattern
- T3.1 FR-30 headers: 4 actual A.15b test files backfilled (spec listed 5; 5th does not exist as A.15b artifact)
- T3.2 Z-evidence lock: `Operix_Execution_Discipline_v1.md` NEW · behavioral lock for future Lovable execution
- Block H test files use file-inspection pattern (no JSX render) to avoid testing-library/jest-dom runtime dependency drift; shape and integration verified via source AST grep matching shell-memoization.test.ts established precedent
- MOBILE_PRODUCTS registry is NEW (did not exist pre-A.16c); created additively at `src/config/mobile-products.ts`
- Mobile route uses A.15b precedent (`/operix-go/maintenance-technician` + OperixGoPage tile) instead of literal spec `/mobile/<role>` path (per user clarification)
- Q-LOCK-11 preserved: card-entitlement-engine.ts maintainpro entitlement stays `'locked'` · zero-touch at A.16c · flip at A.17

## Path forward

A.17 MaintainPro Closeout next (42nd composite · MOAT #23 BANKS · status flip + 4 mobile captures OOB-M9 + 8 MOAT criteria finalize · 24/32 ACTIVE cards).

---

## T1 close (A.16c.T1) · 2026-05-11

T1.1 eslint fix: ProductionCapacityLiveDashboard.tsx useMemo warning resolved · tick dep intentional for auto-refresh recomputation · eslint-disable comment added with explanatory inline comment (Q-LOCK-6 ref).

T1.2 test coverage: 6 tests added to maintainpro-reports.test.ts covering AMC scorecard · SLA heatmap · Energy/ESG · Dashboard capacity % · Open Tickets grouping. Reaches 823/118 target.

AC#2 + AC#3 now PASS · 16/16 ACs clean post-T1.

41st composite BANKS POST-T1 · A.16 HALT-AND-SPLIT 3-way ARC COMPLETE.

A.17 MaintainPro Closeout (MOAT #23 BANKS · v31 FULL) path open.

Triple Gate FINAL: TSC 0 · ESLint 0/0 · Vitest 823/118 · Build PASS.
