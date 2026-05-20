# Sprint EX-7c Close Summary · Export Realisation + e-BRC + FEMA

**Sprint**: T-Phase-1.EX-7c-ExportRealisation-eBRC-FEMA
**Position**: 9th of 12-13 in EximX arc · THIRD export-side · EXPORT CYCLE CLOSURE KEYSTONE
**Predecessor HEAD**: cb31dc79 (EX-7b banked · 31 consecutive milestone)

## Moats anchored
- **#19 FEMA 270-day · PRIMARY ANCHORED** · 5-state classifier (safe/attention/warning/critical/overdue)
- **#18 Buyer Reliability · FULL FEEDBACK LOOP CLOSURE** · sibling extension · buyer-reliability-engine.ts 0-diff
- **#6 ECGC · FOUNDATION** · policy register + claim shell · Phase 2 full integration
- **Forex Triangulation · ANCHORED** · 3-way reconciliation (booking · POL · realised)

## Compliance gaps addressed
- **v7 Gap #2 FIRC** · 3 distinct types (EBRC + FIRC + EDPMS)
- **v7 Gap #11 STPI Software Exports** · is_stpi_export + stpi_unit_id + stpi_softex_form_no

## Files (16 NEW + 4 UPDATE)
- Types (4): export-realisation.ts · ebrc-edpms.ts · firc.ts · ecgc-policy.ts
- Seed (1): sinha-export-realisation-seed-data.ts (3 realisations: USA safe · UAE attention · Japan warning + STPI)
- Engines (4): export-realisation-engine.ts · ebrc-edpms-engine.ts · realisation-feedback-engine.ts · ecgc-engine.ts
- UI (5): ExportRealisationList · ExportRealisationDetail · EBRCEDPMSDashboard · FEMA270DayTracker · ExportRealisationSaathiPanel (10th)
- Routes + Close (2): ExportRealisationLineageBreadcrumb · this summary
- Updates (4): eximx-export-sidebar-config (3 flips) · EximX.types verify · EximXExportLayout (4 wires) · TDLGapsAtlasPreview combined crosslink

## EX-7c-Q lock verification (14 of 14)
All Q1-Q14 honored. Q4=a buyer-reliability-engine.ts 0-diff (sibling extension). Q5=b ECGC FOUNDATION. Q13=b Vitest IDENTICAL. Q14=b NO PDF.

## 0-diff zones verified (132+)
ALL HELD · buyer-reliability-engine.ts CRITICAL · multi-leg-git.ts · po.ts · git.ts · inventory-item.ts · foreign-customer.ts · 5 FinCore voucher engines · rms-declaration.ts · ALL 130 prior NEW code files.

## D-NEW carryforwards
- D-NEW-FF (per-item valuation override) → EX-10
- D-NEW-FG (voucher posting runtime including Month-End Reval) → EX-8
- EX-7b TDLGapsAtlas T3 cosmetic FOLDED in Update 20
