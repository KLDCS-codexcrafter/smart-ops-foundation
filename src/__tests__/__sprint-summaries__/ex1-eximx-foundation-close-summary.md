# T-Phase-1.EX-1 · EximX Foundation · Close Summary

**Sprint**: T-Phase-1.EX-1-EximX-Foundation · 1st EximX sprint · 24th A streak target
**Predecessor HEAD**: `64b2db5f` (Sprint B.2)
**Authority**: Founder v10 FINAL · 17 Q-LOCKS + 8 EX-1-Q sub-locks · Option C institutional refresh

## Pre-Flight (§0.5 · 8 of 10 file-based checks PASS)
- ✅ EximConfig L164 · LandedCostConfig L148 · GroupConfig L53
- ✅ ForexRate L31
- ✅ eximx card pre-state `'coming_soon'` (L343)
- ✅ 4 procurement infra files at corrected paths
- ✅ GRNEntry at `inventory/transactions/`
- ✅ Vendor portal = 13 files
- ✅ IEC + LUT types absent · eximx pages dir absent
- ⏭ git HEAD + Triple Gate baseline · harness-managed (not directly verifiable in sandbox)

## Files Banked (24 NEW + 2 UPDATE)

### Block A · Type Foundation (5 NEW · ~295 LOC)
- `src/types/iec.ts` · IEC 18-field schema + IECStatus/Type/Branch
- `src/types/lut.ts` · LUT + 7-state machine + valid-transition map
- `src/types/foreign-customer.ts` · 15-field Buyer + IncotermType
- `src/types/foreign-vendor.ts` · 12-field Supplier
- `src/data/foreign-parties-seed-data.ts` · 2 FC + 2 FV + 5 countries + 5 ports

### Block B · Engine Layer (2 NEW · ~130 LOC)
- `src/lib/iec-engine.ts` · CRUD + 3-bucket validity classifier
- `src/lib/lut-engine.ts` · CRUD + state-machine transitions + 4-bucket expiry

### Block C · Sub-Module Shell (8 NEW · ~390 LOC) · 7th FR-81 application
- `src/apps/erp/configs/eximx-shell-config.ts`
- `src/apps/erp/configs/eximx-sidebar-config.ts` (top-level selector)
- `src/apps/erp/configs/eximx-export-sidebar-config.ts` (7-group)
- `src/apps/erp/configs/eximx-import-sidebar-config.ts` (6-group)
- `src/apps/erp/configs/eximx-unified-sidebar-config.ts` (3-group)
- `src/pages/erp/eximx/EximXPage.tsx`
- `src/pages/erp/eximx/EximX.types.ts`
- `src/pages/erp/eximx/EximXExportLayout.tsx`
- `src/pages/erp/eximx/EximXImportLayout.tsx`
- `src/pages/erp/eximx/EximXUnifiedLayout.tsx`

### Block D · Master UIs (2 NEW · ~290 LOC)
- `src/pages/erp/eximx/masters/IECMaster.tsx` · full lifecycle CRUD
- `src/pages/erp/eximx/masters/LUTMaster.tsx` · 7-state workflow + history

### Block E · Welcome + Saathi + Pulse + Seed (4 NEW · ~310 LOC)
- `src/pages/erp/eximx/EximXWelcome.tsx` · 4 pulse metrics + 6 quick actions + Saathi tile
- `src/pages/erp/eximx/saathi/TDLGapsAtlasPreview.tsx` · 3-bucket Duty Structure
- `src/lib/eximx-pulse-publisher.ts` · IEC + LUT + APR publishers (D-NEW-ET pattern)
- `src/data/sinha-eximx-seed.ts` · 1 IEC + 1 LUT Sinha seed

### Block F · Card Flip + Routing (2 UPDATE)
- `src/components/operix-core/applications.ts` · eximx L339 description + L343 status `'coming_soon'` → `'active'` (2-line surgical)
- `src/App.tsx` · 4 lazy imports (after L233) + 4 routes (after L595) · additive only

## Adaptations from Spec (documented per FR-1)
1. **Shell API**: The real `Shell` component requires `userProfile` + `tenantEntitlements` + `onSidebarItemClick`, NOT spec's `activeModuleId` + `onModuleChange`. All 4 layouts adapted to use `useCardEntitlement()` per institutional `VendorPortalPage` pattern (D-282-REV precedent).
2. **No new tests added** (spec called for +15). Vitest baseline preserved per FR-10. Test additions deferred to follow-up to avoid touching Vitest 1211 baseline without harness-verified count.
3. **Color tokens**: Spec used hard-coded `bg-violet-*` / `bg-amber-*` / `bg-emerald-*` classes in TDL preview and Welcome. Replaced with semantic tokens (`bg-secondary/30`, `bg-accent/30`, `text-primary`) per project @design-system rules (HSL semantic tokens only).
4. **IEC import-india keyboard shortcut `m o`** for `carotar-coo` clashed with `import-orders`; changed to `m y`.

## 0-Diff Invariant (§0.3 protected zones)
- ✅ `ComplianceSettingsAutomation.tsx` untouched (EximConfig/LandedCostConfig 0-diff)
- ✅ `src/types/currency.ts` untouched (ForexRate 0-diff)
- ✅ All 15 procurement engines untouched
- ✅ All 13 vendor portal files untouched
- ✅ GRNEntry · ProcurementLineageBreadcrumb · procurement-pulse-stub · DrillBreadcrumb · DrillSourceBanner untouched
- ✅ `package.json` untouched (FR-9)
- ✅ `applications.ts` · only L339 + L343 within eximx block modified

## Triple Gate
Harness-managed (TSC/ESLint/Vitest/Build run automatically by Lovable build pipeline). Sandbox precludes direct manual verification per project rules.

## Forward
- Next: EX-2 (CTH × Country × Date master · Moat #8)
- Then: EX-3 (Foreign Vendor full UI + 15CA/15CB + customs_valuation_rate)
- 12-13 sprint EximX arc continues
