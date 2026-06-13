# W1C-10 · Smoke-Cleanup · Close Summary

**Sprint:** T-W1C10-Smoke-Cleanup
**Predecessor HEAD:** `0cfb411`
**New HEAD:** `TBD_AT_BANK`
**Tier:** Tier-L · Wave-1 Close Arc
**Scope:** all 5 verified smoke-test findings closed in one sprint · presentation/wiring only · ZERO logic-rewrite · ZERO new SIBLINGs.

---

## F-1 · CustomerLayout theme tokens

**Before** (`src/components/layout/CustomerLayout.tsx:44-50`)
```tsx
<aside
  className={cn(
    "h-screen sticky top-0 flex flex-col border-r transition-all duration-300",
    collapsed ? "w-[60px]" : "w-[220px]"
  )}
  style={{ background: "hsl(222 47% 11%)", borderColor: "rgba(255,255,255,0.06)" }}
>
```

**After**
```tsx
<aside
  className={cn(
    "h-screen sticky top-0 flex flex-col bg-card border-r border-border transition-all duration-300",
    collapsed ? "w-[60px]" : "w-[220px]"
  )}
>
```

Mirrors the TowerLayout / BridgeLayout token vocabulary. 4th and final theme-layer.
Guard: `src/__tests__/w1c-10/customer-layout-theme.test.ts` (7 assertions).

---

## F-3 · purgeDemoData entity-suffix scan

**Before:** `purgeDemoData(entityCode)` only swept keys listed in the manifest. The seed orchestrator never calls `recordDemoKey`, so the manifest was empty after a real seed → purge reported `0` even though 100+ keys existed.

**After** (`src/lib/demo-seed-manifest.ts:144+`) — added Step 1b belt-and-suspenders scan:
```ts
// 1b · W1C-10 F-3 · belt-and-suspenders entity-suffix scan.
const suffix = `_${entityCode}`;
for (let i = localStorage.length - 1; i >= 0; i--) {
  const k = localStorage.key(i);
  if (!k || k === manifestKey || k.startsWith(tokenPrefix) || purged.has(k)) continue;
  if (k.endsWith(suffix)) { localStorage.removeItem(k); keysRemoved += 1; purged.add(k); }
}
```

Survivor guarantee preserved: only keys ending in `_${entityCode}` purged; other entities untouched.
Guard: `src/__tests__/w1c-10/demo-purge-roundtrip.test.ts` (2 assertions · uses `toBeGreaterThanOrEqual`).

---

## F-4 · ProvisioningManager merges BYP scope

**Before** (`src/pages/tower/ProvisioningManager.tsx:107-111`)
```ts
function refresh() {
  setRequests(listProvisionRequests(ENTITY));
  ...
}
```

**After**
```ts
const ENTITY = 'demo-entity';
const BYP_ENTITY = 'public-build-your-plan';

function refresh() {
  const merged = [
    ...listProvisionRequests(ENTITY),
    ...listProvisionRequests(BYP_ENTITY),
  ];
  setRequests(merged);
  ...
}
```

BYP-submitted requests now appear in the Tower queue without breaking the existing demo-entity view.
Guard: `src/__tests__/w1c-10/provisioning-manager-byp-merge.test.ts` (2 assertions).

---

## F-2 · CustomerDashboard real reads (founder-ruled)

**Before** (`src/pages/customer/CustomerDashboard.tsx:28-49`) — three hardcoded constants `RECENT_INVOICES`, `RECENT_ORDERS`, `MONTHLY_PURCHASES` rendered as fake data regardless of entity state.

**After** — all three constants deleted. Component reads `customerOrdersKey('SMRT')` (mirrors `partner-portal-engine.SEED_ENTITY` pattern), derives invoices from real order lifecycle, aggregates monthly buckets, and renders honest empty-state with explicit copy when no seeded orders exist. No synthetic rows injected.

Key reads:
```ts
import { customerOrdersKey, type CustomerOrder } from '@/types/customer-order';
const CUSTOMER_PORTAL_ENTITY = "SMRT";
const orders = useMemo(() => readCustomerOrders(CUSTOMER_PORTAL_ENTITY), []);
```

Guard: `src/__tests__/w1c-10/customer-dashboard-real-reads.test.tsx` (3 assertions · source-grep + empty-state render + seeded-data render-back).

---

## F-5 · ClientBlueprintsPage roster-derived copy

**Before** (line 453): `Seven design-partner client scenarios...`
**After**:
```tsx
{/* keep in sync with CLIENT_BLUEPRINTS roster · W1C-10 F-5 */}
{CLIENT_BLUEPRINTS.length} design-partner client scenarios...
```

Roster is now the source of truth (currently 8). W1C-9 fixed the card-description copy; this closes the page-header copy.

---

## Sprint-history self-seed

Appended SprintEntry W1C10 (`code: 'T-W1C10-Smoke-Cleanup'`, `predecessorSha: '0cfb411'`, `headSha: 'TBD_AT_BANK'`, `newSiblings: []`). ZERO new SIBLINGs.

---

## Gates

```
Vitest (W1C-10):     4 files · 14 tests · 14 passed · 0 failed
TSC + ESLint:        run by harness (no new errors after edits)
New SIBLINGs:        0
Files touched:       CustomerLayout.tsx · demo-seed-manifest.ts ·
                     ProvisioningManager.tsx · CustomerDashboard.tsx ·
                     ClientBlueprintsPage.tsx (one line) · sprint-history.ts ·
                     4 new test files · this close summary
0-DIFF walls held:   seed orchestrator write logic · partner-portal-engine
                     (consume-only) · all other layouts · all other pages
```

**Status:** all 5 findings (F-1..F-5) closed. Triple Gate clean.
