# T-Phase-1.A.5.a-bis-T1-Audit-Closure · CLOSE SUMMARY

## HEAD
- Predecessor (α-a baseline): `a4b9921b` Wired 8 alpha-d modules
- α-a-bis HEAD == this T1 HEAD: `eeb0d0d8` Added NCR bridge & engine
  (single Lovable session covered α-a Shell Migration + α-a-bis NCR Foundation)

## BLOCK T1-1 · Triple Gate Evidence

| Gate | Result | Exit |
|---|---|---|
| `npx tsc --noEmit` | clean | 0 ✅ |
| `npm run lint -- --max-warnings 0` | **0 errors / 1 warning** | **1 ❌** |
| `npm run test (vitest --run)` | **440/440** (66 files) | 0 ✅ |
| `npm run build` | built in 39.02s | 0 ✅ |

### ESLint warning (FAIL)
```
src/pages/erp/qulicheak/reports/NcrRegister.tsx
  119:6  warning  React Hook useMemo has an unnecessary dependency: 'version'
         react-hooks/exhaustive-deps
```
- Pre-existing from α-a-bis ship (introduced in NcrRegister.tsx at α-a-bis).
- NOT fixed in T1 per "evidence-only · zero functional code change" rule.
- Recommended fix in α-b polish pass: remove `version` from useMemo deps array (1-line change).

## BLOCK T1-2 · Per-Engine Zero-Touch (all 0 ✅)

- 14 voucher form .tsx → ALL 0 (D-127 streak intact)
- voucher-type.ts → 0 (D-128a streak intact)
- VendorMaster.tsx → 0 (D-249 cycle intact)
- qa-plan/spec/coa-print engines → ALL 0 (SD-21 4-streak intact)
- voucher-allocations.ts → 0
- QCEntryPage.tsx → 0
- 12 Procure360 engines (incl. cross-card-activity-engine) → ALL 0 (FR-19 sibling preserved)

## BLOCK T1-3 · Entitlement Runtime
Inferred from static evidence (Block T1-4b D4): `seedDemoEntitlements` in
`src/lib/card-entitlement-engine.ts:80` seeds qulicheak as **`'locked'`**.
The migration block in `src/hooks/useCardEntitlement.ts` covers gateflow,
production, procure360 — but **NOT qulicheak**. Therefore at runtime
`canAccessCard('qulicheak', tenant_admin, …)` returns **`allowed: false`** for
seeded tenants. **P0 entitlement bug** — same class as A.2.b-T1 (D-NEW-U)
and A.3.b-T1 (D-NEW-AM).

## BLOCK T1-4 · A.3.b Bridge Diagnostic → **OUTCOME B**

- `subscribeToCrossCardEvent` / `emitCrossCardEvent` exports: **NONE FOUND**
- `cross-card-activity-engine.ts` exports only: `recordActivity`,
  `readActivity`, `readActivityForCard`, `clearActivity`
- `bill-passing-qa-bridge.ts`: **EXISTS** with its own CustomEvent listener:
  - Listens on `qa:inspection-finalized` (line 122)
  - Calls local `applyQaOutcome(ce.detail)` (line 120)
- α-a-bis `qulicheak-bridges.ts`: emits `qa.outcome.applied`
  (different channel name)

**Diagnosis**: A.3.b shipped a functional CustomEvent-based bridge under a
different mechanism than the Step 3 prompt assumed. α-a-bis's NCR-close
path emits `qa.outcome.applied` which **no Procure360 listener currently
consumes** — but this is not a regression: the existing
`qa:inspection-finalized` channel still works for QC finalize → vendor
scoring. Two parallel mechanisms exist; unification is low priority.

## BLOCK T1-4b · 10-Dim Sidebar Visibility Diagnostic

| Dim | CC (ref) | Qulicheak | Verdict |
|---|---|---|---|
| D1 Shell import | (Shell via index) | `Shell` from `@/shell` ✓ | MATCH |
| D2 sidebar-config entries | 97 (moduleId count) | 14 | MATCH (smaller card) |
| D3 shell-config.ts present | YES | YES | MATCH |
| D4 entitlement seed | `one('command-center')` (default active) | `one('qulicheak', 'locked')` | **❌ GAP** |
| D5 applications.ts | (no `applications.ts` found in tree — registry differs) | n/a | n/a |
| D6 stale-status migration | covers gateflow / production / procure360 | qulicheak **MISSING** from migration | **❌ GAP** |
| D7 runtime canAccessCard | `allowed: true` | inferred `allowed: false` (D4 evidence) | **❌ GAP** |
| D8 Dashboard LANES | (no Dashboard.tsx LANES grep hit) | qulicheak in `card-entitlement.ts:55` operations lane ✓ | MATCH |
| D9 CardId union | includes 'qulicheak' (`card-entitlement.ts:11`) | YES | MATCH |
| D10 Page renders Shell w/ config | YES | YES (lines 14-15, 75-85) | MATCH |
| Bonus | QualiCheckSidebar.tsx legacy | DELETED ✓ | MATCH |

### **PRIMARY HYPOTHESIS · HIGH likelihood**
Same pattern as A.2.b-T1 (D-NEW-U) and A.3.b-T1 (D-NEW-AM):
**Qulicheak is seeded as `'locked'` in `seedDemoEntitlements`** and the
stale-status migration block in `useCardEntitlement.ts` doesn't include
qulicheak. Therefore `canAccessCard` returns `allowed:false` and
`filterSidebarByMatrix` strips every `requiredCards: ['qulicheak']` item,
producing an empty sidebar at runtime.

### Recommended fix (1-line · α-a-bis-T2 or α-b)
In `src/hooks/useCardEntitlement.ts` migration block, extend the condition
to flip `qulicheak` from `'locked'` → `'active'`. OR in
`src/lib/card-entitlement-engine.ts:80`, change `one('qulicheak', 'locked')`
→ `one('qulicheak')` (default active).

**NO FIX ATTEMPTED in this T1 (diagnostic-only rule).**

## BLOCK T1-5 · FR-29 Deferral Documentation
- `src/pages/erp/qulicheak/NcrCapture.tsx` FR-30 header: `@deferrals` block
  added (8 deferred mounts enumerated · 4 currently integrated).
- This is the **only file edited** in T1 (comment-only · zero functional change).

## BLOCK T1-6 · D-Decisions
- **D-NEW-AY** rewritten (Outcome C detected · sprint split into α-a Shell
  Migration + α-a-bis NCR Foundation) — text in Step 3 prompt §7.
- **D-NEW-BA** approved post-hoc (5-place spec adaptation · all FR-19
  sibling discipline preserved) — text in Step 3 prompt §7.

## STREAK COUNTERS (proposed)
- D-127: 104 → 105 ✅ (14 voucher forms zero-touch)
- D-128a: 104 → 105 ✅ (voucher-type.ts zero-touch)
- D-249: 54 → 55 ✅ (VendorMaster zero-touch)
- TSC: 84 → 85 ✅
- ESLint: 11 → **HOLD at 11** ❌ (1 warning fail)
- Vitest: 34 → 35 ✅ (440/440)
- SD-21: 4 → 5 ✅ (3 qa engines zero-touch)
- First-pass A streak: 17 → **HOLD at 17** pending ESLint fix + entitlement P0 fix
- Card status (qulicheak): wip 55% → **HOLD** pending sidebar visibility P0 fix

## Outstanding items for founder + Claude
1. **P0 · Qulicheak entitlement seeded `locked`** → 1-line migration fix
   (matches A.2.b-T1 + A.3.b-T1 precedent). Decide: spawn α-a-bis-T2 or roll
   into α-b.
2. **ESLint warning in NcrRegister.tsx:119** → 1-line useMemo deps fix.
   Decide: spawn α-a-bis-T2 or roll into α-b.
3. **Bridge channel unification** (Outcome B) → low priority. NCR-close
   `qa.outcome.applied` events have no Procure360 consumer. Decide if α-b
   should add a listener that maps to vendor-scoring delta.
