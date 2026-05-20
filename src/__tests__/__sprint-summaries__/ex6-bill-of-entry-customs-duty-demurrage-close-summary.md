# Sprint EX-6 Close Summary · Bill of Entry + Customs Duty Payment + Demurrage Tracker + Auto-Posted Vouchers

**Sprint**: T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
**Position**: 6th of 12-13 in EximX arc · GL COMMIT POINT for entire Import chain
**Predecessor HEAD**: c2800872 (EX-5 banked)
**Streak target**: 29th consecutive first-pass-clean A

## Moats anchored
- **#2 RMS Declaration · FULL ANCHOR** · workflow with prediction → ICEGATE simulated → actual lane → variance
- **#4 Tiered AEO Lane Mapping · ANCHORED** · per-Entity AEO + per-Port AEO + fast-track + RMS pre-bias
- **#1 Replayable Landed Cost · actual_landed bucket FILLED** · voucher posting wired

## Compliance Gap addressed
- **v7 Gap #9 Project Imports Sec 25** · `is_project_import` + `project_import_notification_ref` fields on BoE

## Files (15 NEW + 3 UPDATE)
**Types (3)**: bill-of-entry.ts · aeo-tier-mapping.ts · auto-posted-voucher.ts
**Seed (1)**: sinha-bill-of-entry-seed-data.ts (3 BoEs · 1 per type · 1 project_import)
**Engines (4)**: bill-of-entry-engine.ts (ICEGATE simulator) · rms-lane-engine.ts · demurrage-engine.ts · aeo-tier-engine.ts
**UI (6)**: BoEList · BoEDetail · BoEDutyPaymentPanel · RMSDeclarationDashboard · AEOTierMaster · BoESaathiPanel (7th Saathi)
**Routes/Close (1)**: BoELineageBreadcrumb · this close summary
**Updates (3)**: eximx-import-sidebar-config (3 flips) · EximXImportLayout (4 wires + BoE pathname helper) · TDLGapsAtlasPreview (BoE crosslink)

## EX-6-Q lock verification (14 of 14)
All Q1-Q14 honored. ICEGATE simulated (Q14=b). Vitest IDENTICAL maintained (Q13=b · 6th application).

## 0-diff zones verified (80+)
po.ts (D-127) · git.ts + git-engine.ts (D-284) · ComplianceSettingsAutomation (Q14=a) · inventory-item.ts (Q15=a from EX-5) · rms-declaration.ts (EX-3 seed) · all EX-5/4/3/2/1 NEW · 5 FinCore voucher engines READ-ONLY · 188+ existing engines · package.json.

## D-NEW-FF preserved
EX-5 D-NEW-FF (per-item valuation override) still deferred to EX-10 · referenced in BoESaathiPanel.
