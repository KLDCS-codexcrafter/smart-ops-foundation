# RPT-4 · Role-Layer Auto-Derivation + Role Dashboard · CLOSE SUMMARY

**Phase B Sprint 3 (last structural piece) · Reporting Arc**

## Pre-flight
- HEAD: `097ff18` ✅ (predecessor verified before start)
- `src/lib/report-framework/data-source-catalog.ts` ✅ present (RPT-3b spine)
- `src/lib/report-framework/rag.ts` ✅ present (RPT-2a-i primitive)
- `UserRole` + `ROLE_DEFAULT_CARDS` present in `src/types/card-entitlement.ts` ✅
- TSC 0 · ESLint 0/0 (pre-build)

## Derivation API (Block 1 — React-free core)
**`src/lib/report-framework/role-layer.ts`** (NEW · 1 sibling)
- `RoleLayer = 'operator' | 'manager' | 'management'`
- `layerCeilingFor(role)`: view_only→operator · functional roles→manager · tenant_admin/super_admin→management
- `clampLayer(requested, ceiling)` (pure)
- `deriveRoleDashboard(role, layer, entitledCards) → { layer, sections[] }`
  - cards = `ROLE_DEFAULT_CARDS[role] ∩ entitledCards`
  - per-KPI inclusion when `kpi.layers` contains effective (clamped) layer
  - KPI-id prefixes: `fc → fincore`, `ex → eximx`, `cmp → comply360`, `rx → receivx`, `po → payout`, `bp → bill-passing`, `ar → receivx`, `ap → payout`
  - `xc-*` cross-card section ONLY at management layer, leading "Org Overview" section
- `KpiDefinition.layers?: RoleLayer[]` (optional, default = all 3 — no API break)
- `setKpiLayers(id, layers)` helper for heuristic tagging

**Layer-tag counts (post heuristic):**
- Tier 3 management-only: cash / margin / composition / reconciliation / realisation / FEMA / hedge / AEO / eBRC / CSR / etc.
- Tier 2 manager + management: aging / trend / efficiency / coverage / pct / compliance / score / RMS / EWS
- Tier 1 all 3 (default fallback): status / count / mix
- xc-*: all 6 seeded explicitly as `['management']`

## 6 cross-card Management KPIs (Block 1)
1. `xc-cash-position` (line · `reg:fc-ledger`)
2. `xc-ar-aging` (stacked-column · `reg:fc-outstanding-aging` · thresholds lower-good 1M/5M)
3. `xc-ap-aging` (stacked-column · `reg:fc-outstanding-aging` · thresholds lower-good 1M/5M)
4. `xc-compliance-pct` (gauge · `comply360.aggregate.compliance-pct` · thresholds higher-good 90/75)
5. `xc-stock-value` (column · `reg:fc-ledger`)
6. `xc-realisation-pct` (combo · `reg:ex-tt-payments` · thresholds higher-good 90/75)

## Block 2 — Generic surface (ONE component · ONE mount)
- `src/components/operix-core/report-framework/RoleDashboard.tsx` (NEW)
  - Consumes `useCardEntitlement()` for `profile.role` + `allowedCards`
  - Hooks at TOP level (`useState`/`useMemo` outside any callback)
  - Layer switcher chips: operator / manager / management — disabled above `layerCeilingFor(role)`
  - Renders `ScorecardTile` grid per section, empty-state friendly, NO recharts import
- Mount route: `/erp/command-center/my-dashboard` (additive `<Route>` in `App.tsx` · lazy import)
- Sidebar entry: "My Dashboard" added to `command-center-sidebar-config.ts` (additive)

## Block 3 — Institutional + tests + commit
- `sibling-register.ts`: appended `role-layer-derivation-engine` (NEW SIBLING · QL-6 auto-derivation)
- `sprint-history.ts`:
  - RPT-3b row `headSha` BACKFILLED `TBD_AT_BANK → 097ff18` · provenance → CONFIRMED
  - RPT-4 row SEEDED (`predecessorSha: '097ff18'`, `headSha: 'TBD_AT_BANK'`)
- `report-framework/index.ts` barrel: re-exports role-layer module
- `operix-core/report-framework/index.ts` barrel: exports `RoleDashboard`

## Tests (§N ≥ 20)
- `src/lib/report-framework/__tests__/role-layer.test.ts` (19 cases):
  - layerCeilingFor: all 8 UserRoles
  - clampLayer: below/equal/above
  - deriveRoleDashboard: finance/operator · finance/management (clamped) · tenant_admin/management (xc leads) · sales/manager (no xc) · view_only clamped to operator · entitlement intersection empty
  - KPI layer-tag integrity: every KPI has non-empty subset of valid layers · 6 xc-* are management-only · `toBeGreaterThanOrEqual(6)` xc-* count
- `src/components/operix-core/report-framework/__tests__/RoleDashboard.test.tsx` (2 cases):
  - Heading via `getByRole` · 3 layer chips present
  - Sections OR empty state via `queryAllByText` / `toBeGreaterThanOrEqual`
- `read-only-lock.test.ts`: still passes — role-layer.ts is React-free, write-free

## Triple Gate
- TSC `--noEmit` (tsconfig.app.json): **0 errors** ✅
- ESLint (touched files, `--max-warnings 0`, incl. rules-of-hooks): **0 problems** ✅
- Vitest (3 RPT-4 files, 26 tests): **26 passed / 0 failed** ✅

## Walls held (0-DIFF)
- `card-entitlement.ts` ✅ (consumes UserRole + ROLE_DEFAULT_CARDS, no edits)
- `useCardEntitlement.ts` ✅
- All banked report/dashboard pages ✅
- Chart / period / integrity / DSC / aggregator framework files ✅
- `src/test/setup.ts` ✅
- All hubs ✅

**HEAD (new):** TBD_AT_BANK · backfilled at next sprint Block 3.
