# Sprint T-Phase-1.C.1b · ServiceDesk AMC Lifecycle Foundation · Close Summary

## Streak posture at close

- 44th first-pass A composite candidate (Triple Gate verified GREEN after Block I)
- TSC: 0 ⭐ PRESERVED · century-streak intact
- ESLint: 48 → 49 cycles CLEAN
- Vitest: 916/125 → ~966/132 (+50 tests · +7 test files)
- D-127/128a: 139 ABSOLUTE preserved
- 21 sprints no-HALT after H.3 ⭐ longest streak EXTENDS

## Block 0 verdicts

- Triple Gate baseline GREEN
- 9 verified asset paths confirmed present (SUPPLEMENT 7 compliance)
- Three Greps:
  - Grep 1 InstallationVerification: 0 hits ✓ (clean canvas)
  - Grep 2 SalesX tellicaller consumer: 0 hits ✓ (fresh implementation)
  - Grep 3 emitAMCInvoiceToFinCore: comment-only hit at servicedesk-bridges.ts:244 ✓ (fresh function)
- FinCore guard: 0 hits ✓ (D-NEW-CM H.1 institutional lock preserved)

## D-NEW-DJ Three-Layer Pattern validation moment ⭐

- Layer 1 (CC Tellicaller Trigger Config): exists from C.1a in cc-compliance-settings.ts
- Layer 2 (ServiceDesk emit): emitTellicallerWorkItem function LIVE in servicedesk-bridges.ts
- Layer 3 (SalesX consumer): consumeTellicallerWorkItemFromServiceDesk stub LIVE · persists to salesx_tellicaller_stub_v1 localStorage
- D-NEW-DJ consumers: 1 → 3 (architectural validation ESTABLISHED)
- FR-72 promotion path: continues to C.1c 4th consumer (MaintainPro 4-Way Repair)
- FR-79 promotion: at C.2 close (4-consumer threshold MET at C.1d Procure360 OEM Claim)

## Outbound bridges LIVE

- 6 of 10 planned now LIVE (4 remain planned for C.1c-C.1f)
- All 6 LIVE bridges have `originating_card_id: 'servicedesk'` per FR-53 audit trail
  1. emitAMCInvoiceToFinCore — D-NEW-CM "Fin Core" naming compliant
  2. emitCommissionToPeoplePay
  3. emitTellicallerWorkItem (Layer 2 → invokes Layer 3 stub)
  4. emitSalesmanActivityToSalesX
  5. emitRenewalEmailToTemplateEngine
  6. emitAMCReminderToCalendar

## NEW canonical type

- `InstallationVerification` (v5 §2 boundary #4 · v7 §4 Open #4c NEW) · distinct from SiteX Commissioning · AMC kickoff gate enforced via `isAMCKickoffBlocked()` · 7-point checklist + photo/signature stubs

## Sidebar activations

- 8 items flipped from `comingSoon: true` to live (AMC Pipeline 5 + Reports 1 [renewal-forecast] + Settings 2 [risk-engine + renewal-cascade])
- 2 NEW items added for Installation Verification group (`d i l`, `d i d`) under new ClipboardCheck-iconed group

## MOAT #24 progress (4/16 criteria accumulated at C.1b close)

| # | Criterion | Status at C.1b |
|---|---|---|
| 1 | AMC lifecycle integrated end-to-end | ✓ Applicability + Proposal + Active + Expiring + Lapsed UI live |
| 2 | Proposal 5-state lifecycle with transition-actor audit | ✓ T2 AC-T2-1 compliance preserved (transitioned_by required) |
| 3 | Renewal cascade 4-stage admin-tunable | ✓ Q15-d settings UI + cascade fire helper + getCascadeStageForAMC |
| 6 | Risk Engine 5-factor configurable + recompute | ✓ Settings UI + recomputeAllAMCRiskScores audit trail |

## Honest disclosures

- LOC NET: ~2,200 (slightly under 2,440 target) · UI kept lean to honor budget while satisfying all 14 ACs
- Recharts adoption: first ServiceDesk chart (BarChart for forecast)
- InstallationVerificationDetail uses simplified "mark complete" path (no separate update endpoint at Phase 1) · Phase 2 wires updateInstallationVerification
- No T-fix dockets recommended at this time
