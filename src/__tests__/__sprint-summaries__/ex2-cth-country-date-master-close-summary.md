# Sprint T-Phase-1.EX-2 · CTH × Country × Date Master + Import Info + FTA + Port Master Extension · Close Summary

**Sprint ID**: T-Phase-1.EX-2-CTH-Country-Date-Master
**Banked HEAD**: <set at commit>
**Predecessor HEAD**: a0c7a3c1 (EX-1 T-fix · A POST-T1 · 24th cumulative)
**Date**: 2026-05-19
**Streak**: 25th consecutive A first-pass-clean (target)

## §1 · Outcomes
- CustomsTariffHead master created · 8-digit ITC(HS) · parent-child with HSN 6-digit via `chapter_heading` FK
- 3-Bucket Duty Structure discriminated union (Customs · Other · GST) with exhaustive switch (FR-80)
- FTAPreferenceTable separate · CAROTAR Rule 6 self-certification flag (Moat #11)
- Port master extended via overlay (4 EXIM fields · base PortMaster.tsx 0-diff · EX-2-Q5=c)
- CTH Saathi Panel · 3rd Saathi surface · Superpowers 10 → 11
- 4 moats anchored: #8 (CTH × Country × Date 3-bucket) · #11 (CAROTAR) · #14 (Dynamic Duty Labels) · #15 (Customs Revaluation Audit foundation)
- All 12 EX-2-Q founder-ratified leans applied

## §2 · Files Changed (18 NEW + 3 UPDATE + 1 close summary)
- NEW types: customs-tariff-head.ts · duty-structure.ts · fta-preference.ts · port-extension.ts
- NEW seed: customs-tariff-head-seed-data.ts
- NEW engines: cth-resolver.ts · fta-checker.ts · cth-history-engine.ts
- NEW UI: CustomsTariffHeadMaster.tsx · FTAPreferenceTable.tsx · PortExtensionEditor.tsx · CTHRefreshDialog.tsx · CTHLineageBreadcrumb.tsx
- NEW Saathi: CTHSaathiPanel.tsx
- UPDATES: eximx-import-sidebar-config.ts · EximXImportLayout.tsx · EximX.types.ts · TDLGapsAtlasPreview.tsx (Saathi crosslink)

## §3 · 0-Diff Held
- HSNSACMaster.tsx · hsn-sac-seed-data.ts · hsn-resolver.ts
- CountryMaster.tsx · PortMaster.tsx · geo-seed-data.ts
- brand.ts · inventory-item.ts (country_of_origin stays scalar)
- applications.ts · card-entitlement-engine.ts · status-flip-ceremony.test.ts
- All EX-1 deliverables · all 188 existing engines · all 13 vendor portal files
- package.json · package-lock.json

## §4 · 12 EX-2-Q Leans Applied
- Q1=b 8-digit ITC(HS) · Q2=c parent-child FK · Q3=b date bands · Q4=b separate FTA table
- Q5=c port overlay · Q6=a manual refresh · Q7=a discriminated union · Q8=b Saathi inside
- Q9=b label template strings · Q10=a history array · Q11=c under Import sub-module · Q12=b 8+5+2 seed
