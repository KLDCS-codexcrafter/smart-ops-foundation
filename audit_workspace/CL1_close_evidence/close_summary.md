# CL-1 · Close Summary — Cleanup Foundation Seed Cosmetics (LEAN)

**Predecessor HEAD**: `947bd0c` · **New HEAD**: TBD_AT_BANK
**Arc**: CL-1 of 3 (CL-2 engine-signature strip · CL-3 101-file hardcode sweep follow)
**Scope**: ~15 isolated files · ZERO new SIBLINGs · OUT-OF-SCOPE held 0-DIFF (ServiceDesk engine-signature defaults · 101 hardcoded-entity pages · 23 raw-key readers beyond RecentErrors)

---

## Per-finding before / after

### B2-F1 · Foundation bridge (Block 1)
**Before**: `CompanyList.tsx` / `SubsidiaryList.tsx` / `BranchOfficeList.tsx` rendered hard-coded `MOCK_COMPANIES` / `MOCK_SUBSIDIARIES` / `MOCK_BRANCHES` arrays regardless of seeded group state.
**After**: each reads `loadEntities()` (filtered by `type`) ⨝ `listGroupStructure()` for relationship/ownership columns. Honest empty-state when no group is seeded. `OrgStructureHub` mounts a `SeededGroupBanner` showing entity + node counts. `ParentCompany` hydrates `legalEntityName` / `shortCode` from the parent entity as a fallback when `erp_parent_company` is empty (existing `erp_parent_company` reads preserved).
**Round-trip test**: `src/__tests__/cl-1/foundation-bridge.test.ts` — seeds a 2-entity group → asserts `loadEntities()` returns parent + subsidiary, and no MOCK rows survive on an empty store.

### B3-F1 · Orchestrator scenario seed wiring (Block 2)
**Before**: `seedFinanceProcurementTxnsForDemo` was only called from `useDemoSeedLoader` against `DEFAULT_ENTITY_SHORTCODE` — scenario blueprints never populated PO/GRN/BillPassing/Payment registers.
**After**: `seedEntityDemoData(entityCode, archetype)` now calls `seedFinanceProcurementTxnsForDemo(entityCode)` as part of the scenario path (static import · best-effort guarded). Every blueprint hydrates finance/procurement registers.
**Round-trip test**: `src/__tests__/cl-1/seed-convergence.test.ts` — `seedEntityDemoData('CLTST','trading')` → `erp_bill_passing_CLTST` + `erp_purchase_orders_CLTST` + `erp_grns_CLTST` combined length ≥ 1.

### B4-F1 · SRM key convergence (Block 2)
**Before**: smoke audit reported risk of SRM panel reading a different key than the orchestrator wrote.
**After**: verified `supplyRequestMemosKey(e) === \`erp_supply_request_memos_${e}\`` matches the orchestrator's `safeSetArray` write on `demo-seed-orchestrator.ts:221`. No code change needed — convergence locked by test.
**Round-trip test**: same file — asserts key equality + read-back ≥ 1 row after seeding `CLTST`.

### Mech4 · EximX write-side parameterized (Block 3)
**Before**: `seedSinhaEximX()` hard-wrote `erp_sinha-trading_iec` / `erp_sinha-trading_lut` regardless of active entity (called from 3 EximX layout pages with no entity arg).
**After**: signature is `seedSinhaEximX(entityCode: string = 'sinha-trading')`. Keys are canonical `erp_${entityCode}_iec` / `erp_${entityCode}_lut`. All 3 callers (`EximXPage`, `EximXExportLayout`, `EximXImportLayout`) now pass `useEntityCode()` so the active scenario entity controls the write. Default arg preserves back-compat.
**Round-trip test**: `src/__tests__/cl-1/mech4-mech5.test.ts` — `seedSinhaEximX('ABDOS')` → `erp_ABDOS_iec` / `erp_ABDOS_lut` populated, no legacy literal write. Default arg still routes to `sinha-trading`.

### Mech5 · RecentErrors reactive entity (Block 3)
**Before**: `RecentErrorsPage` used `useState<string>(() => getActiveEntity())` — stale one-shot lazy-capture of raw `erp_selected_company`. Did not update on company switch.
**After**: replaced by canonical `useEntityCode()` (reactive via `ERPCompanyProvider`). Local `getActiveEntity()` helper removed.
**Round-trip test**: same file — asserts source uses `useEntityCode`, removed legacy `getActiveEntity` helper and lazy-capture pattern.

### B16-F1 · OfflineIndicator on ShopFloor header (Block 4)
**Before**: `MobileShopFloorOperatorPage` header lacked the offline-first chip that `MobileSiteEngineerPage` and `MobileMaintenanceTechnicianPage` already mount.
**After**: `<OfflineIndicator />` added to header (right-aligned). Mirrors the two sibling persona pages.

### B16-F2 · InstallPromptBanner on /operix-go/* shell (Block 4)
**Before**: `<InstallPromptBanner />` only mounted on Wave-2 `/mobile/*` shell (`MobileRouter` L369). Wave-1 `/operix-go/*` persona pages never showed the install prompt.
**After**: `App.tsx` adds a small route-aware `OperixGoChrome` sibling that renders `<InstallPromptBanner />` whenever `location.pathname.startsWith('/operix-go')`. Lean — no per-page edits.

### Dead-code · MobilePODCapture removed (Block 4)
**Before**: `src/components/mobile/MobilePODCapture.tsx` (rich variant: camera + GPS + OTP via `pod-engine`) was unrouted in App.tsx — dead code. Live transporter flow uses `MobilePODCapturePage` instead.
**After**: `MobilePODCapture.tsx` deleted. Verified 0 importers (only string references in audit/sprint-summary markdowns, which do not import the symbol). `MobilePODCapturePage` (live) preserved.

### B11-F1 · Theme-guard over src/pages/erp/** (Block 4)
**Lock**: new test `cosmetics-and-guard.test.ts` walks `src/pages/erp/**` (.ts/.tsx) and asserts zero `bg-[#...]` dark-panel hex literals (expect PASS — 0). Did NOT mass-convert the ~55 `text-white` instances (mostly intentional tints over color-tinted backgrounds). The guard just locks the contract going forward.

---

## Tests
```
✓ src/__tests__/cl-1/cosmetics-and-guard.test.ts (5 tests)
✓ src/__tests__/cl-1/foundation-bridge.test.ts (2 tests)
✓ src/__tests__/cl-1/institutional.test.ts (1 test)
✓ src/__tests__/cl-1/mech4-mech5.test.ts (3 tests)
✓ src/__tests__/cl-1/seed-convergence.test.ts (2 tests)

Test Files  5 passed (5)
     Tests  13 passed (13)
```

## Gates
- **TSC** (`tsc -p tsconfig.app.json --noEmit`): **0 errors**
- **ESLint** (scope: all touched files, `--max-warnings 0`): **0 errors / 0 warnings**
- **Vitest** (cl-1 suite): **13 passed / 0 failed**

## Institutional
- `sprint-history.ts` self-seeded `T-CL1-Cleanup-Foundation-Seed-Cosmetics` (sprintNumber `CL1`, predecessorSha `947bd0c`, headSha `TBD_AT_BANK`, newSiblings `[]`).
- ZERO new SIBLINGs. ZERO engine edits. ZERO logic-rewrite.

## Files touched
- `src/pages/erp/foundation/CompanyList.tsx` · `SubsidiaryList.tsx` · `BranchOfficeList.tsx` · `OrgStructureHub.tsx` · `ParentCompany.tsx`
- `src/lib/demo-seed-orchestrator.ts`
- `src/data/sinha-eximx-seed.ts`
- `src/pages/erp/eximx/EximXPage.tsx` · `EximXExportLayout.tsx` · `EximXImportLayout.tsx`
- `src/features/command-center/pages/RecentErrorsPage.tsx`
- `src/pages/mobile/MobileShopFloorOperatorPage.tsx`
- `src/App.tsx`
- `src/lib/_institutional/sprint-history.ts`
- **Deleted**: `src/components/mobile/MobilePODCapture.tsx`
- **New tests**: `src/__tests__/cl-1/{foundation-bridge,seed-convergence,mech4-mech5,cosmetics-and-guard,institutional}.test.ts`

## Out-of-scope held 0-DIFF (CL-2 / CL-3)
- ServiceDesk engine-signature defaults → CL-2
- 101 hardcoded-entity pages → CL-3
- 23 raw-key readers beyond RecentErrors → CL-3
- All "good-citizen" cards · consolidation/IC engines (consumed only)
