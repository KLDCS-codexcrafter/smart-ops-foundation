# RPT-9a · CLOSE SUMMARY — USER REPORT BUILDER (ENGINE + LOCKS + UI + REFERENCE MOUNT)

**Sprint:** RPT-9a · T-RPT9a-User-Report-Builder · Reporting Arc Phase D **MOAT sprint 1**
**Predecessor HEAD:** `862f0c3` ("Completed RPT-8b Phase C close")
**New HEAD:** `TBD_AT_BANK` (set at commit)
**Grade target:** A · 121 → 122 ⭐

---

## 1 · Engine API (Block 1)

`src/lib/report-framework/report-builder-engine.ts` — pure, React-free, ZERO localStorage writes.

```ts
export interface QuerySpec {
  filters?: { field: string; op: 'eq'|'neq'|'contains'|'gt'|'lt'; value: unknown }[];
  groupBy: string[];
  measures: { field: string; agg: 'sum'|'count'|'avg'|'min'|'max'; alias?: string }[];
  sort?: { field: string; dir: 'asc'|'desc' };
  limit?: number;
}

export function runQuery(sourceId, spec, entityCode):
  { rows: Record<string, unknown>[]; integrityHash: string };

export function allowedSourcesFor(layer: RoleLayer, entitledCards: string[]): DataSource[];

export class ReportBuilderQueryError extends Error {
  readonly kind: 'unknown-source' | 'unknown-field' | 'wrong-kind' | 'no-measures';
}
```

`src/lib/report-framework/report-definitions.ts` — the sole writer in `core/`.

```ts
export const REPORT_DEFINITIONS_KEY = 'operix.report-builder.definitions.v1';

export function allowedSaveScopesFor(role: UserRole, layer: RoleLayer): ReportScope[];
export function saveDefinition(input: SaveDefinitionInput): ReportDefinition;
export function listDefinitions(cardId, layer, userId): ReportDefinition[];
export function deleteDefinition(id, layer, userId): boolean;
```

---

## 2 · Lock-by-lock evidence (all 4)

### Lock 1 · Cross-card lock (engine)
`allowedSourcesFor(layer, entitledCards)` filters `listSources()`:
- `xc` / `cross-card` / `xc.*` sources → gated to layer `management`.
- All other sources → require `src.card ∈ entitledCards`.

Tests:
- `operator is denied cross-card / xc sources` ✅
- `manager is also denied cross-card sources` ✅
- `management is allowed cross-card / xc sources` ✅
- `operator with no entitled cards sees nothing` ✅

### Lock 2 · Entitlement lock (UI)
`ReportBuilder` resolves `entitledCardIds` from `useCardEntitlement()` and, when `cardId` prop is set, short-circuits to a not-entitled card (`data-testid="rb-not-entitled"`).

Tests:
- `shows not-entitled state when cardId is not in allowedCards` ✅
- `does NOT show not-entitled when cardId is entitled` ✅

### Lock 3 · Role→scope lock (definitions + UI)
`allowedSaveScopesFor` enforces ceilings:
- `operator` → `['private']`
- `manager` → `['private','team']`
- `management` → `['private','team','card']`
- `tenant_admin / super_admin` → adds `'curated'`

Save dialog scope `<Select>` is fed only by `allowedSaveScopesFor(role, layer)`; server-side, `saveDefinition` throws `ReportDefinitionScopeError` on violation.

Tests:
- `operator cannot save scope=team` ✅
- `manager cannot save scope=card` ✅
- `management cannot save scope=curated (unless admin)` ✅
- `tenant_admin can save scope=curated` ✅
- `deleteDefinition · non-owner manager cannot delete` ✅
- `deleteDefinition · management can delete any item` ✅

### Lock 4 · Integrity lock
Every `runQuery` result returns `integrityHash` from `signReport(rows)` (FNV-1a 64-bit · same family as voucher hash). UI surfaces a `ShieldCheck` badge with the first 12 chars (`data-testid="rb-integrity-badge"`).

Tests:
- `integrity hash is present and deterministic` ✅

### Lock 5 (bonus) · Sole-writer lock (read-only-lock test)
`read-only-lock.test.ts` was extended:
- `WRITE_EXEMPT = Set(['report-definitions.ts'])` skips the setItem check on that one file.
- A new test grep-asserts every `localStorage.setItem(...)` call in `report-definitions.ts` uses the `REPORT_DEFINITIONS_KEY` identifier.

Tests:
- `no core file writes via localStorage.setItem (except report-definitions.ts)` ✅
- `report-definitions.ts writes ONLY the namespaced key` ✅
- `single-key storage discipline · writes ONLY the namespaced REPORT_DEFINITIONS_KEY` ✅

---

## 3 · Reference mounts (Block 4)

### 3.1 · FinCore (embedded mode)
- `src/components/fincore/DraftTray.tsx` — `'fc-rpt-report-builder'` appended to `FinCoreModule` union.
- `src/pages/erp/fincore/FinCoreSidebar.tsx`:
  - `LIVE_MODULES` ← added `'fc-rpt-report-builder'`
  - `REPORT_ITEMS` ← `{ id: 'fc-rpt-report-builder', label: 'Report Builder', icon: Sparkles }`
  - `rpt` scope-array ← added `'fc-rpt-report-builder'` (so the Reports group auto-opens)
- `src/pages/erp/fincore/FinCorePage.tsx`:
  - import `ReportBuilder`
  - `breadcrumbLabels['fc-rpt-report-builder'] = 'Report Builder'`
  - switch case → `<ReportBuilder cardId="fincore" />`

Route: ERP → FinCore → Reports → **Report Builder**.

### 3.2 · InsightX (centralized mode)
- `src/apps/erp/configs/insightx-sidebar-config.ts` ← added `ix-report-builder` entry (icon Wrench, kbd `i b`). The 8 existing InsightX items kept 0-DIFF.
- `src/pages/erp/insightx/InsightXSidebar.types.ts` ← union grew `| 'ix-report-builder'`.
- `src/pages/erp/insightx/InsightXPage.tsx` ← `KNOWN_MODULES` + `switch` additive case → `<ReportBuilder />`.

Route: ERP → InsightX → **Report Builder**.

---

## 4 · Institutional updates (Block 5)

- `src/lib/_institutional/sprint-history.ts`
  - RPT-8b row flipped: `headSha: '862f0c3'`, `provenance: 'CONFIRMED'`.
  - New RPT-9a row appended: `headSha: 'TBD_AT_BANK'`, `predecessorSha: '862f0c3'`, `newSiblings: ['report-builder-engine']`, `provenance: 'PENDING_BACKFILL'`.

- `src/lib/_institutional/sibling-register.ts`
  - New entry `id: 'report-builder-engine'` appended (CONFIRMED, with 5 moatsRealized).

- `src/lib/report-framework/index.ts` — re-exports `report-builder-engine` + `report-definitions`.
- `src/components/operix-core/report-framework/index.ts` — exports `{ ReportBuilder, ReportBuilderProps }`.

---

## 5 · Test files (one per module/component · 49 assertions across 3 files)

| Module / Component | Test file | Assertions |
| --- | --- | --- |
| `report-builder-engine.ts` | `src/lib/report-framework/__tests__/report-builder-engine.test.ts` | 18 tests |
| `report-definitions.ts` | `src/lib/report-framework/__tests__/report-definitions.test.ts` | 18 tests |
| `ReportBuilder.tsx` | `src/components/operix-core/report-framework/__tests__/ReportBuilder.test.tsx` | 7 tests |
| `read-only-lock.test.ts` (extended) | `src/lib/report-framework/__tests__/read-only-lock.test.ts` | 6 tests (was 5) |

Total new + extended: **49 tests · 230 tests pass across the full report-framework + institutional suite.**

---

## 6 · Triple Gate (pasted)

```
$ npx tsc -p tsconfig.app.json --noEmit
(no output · 0 errors)

$ npx eslint --max-warnings 0 \
    src/lib/report-framework/report-builder-engine.ts \
    src/lib/report-framework/report-definitions.ts \
    src/components/operix-core/report-framework/ReportBuilder.tsx \
    src/lib/report-framework/__tests__/report-builder-engine.test.ts \
    src/lib/report-framework/__tests__/report-definitions.test.ts \
    src/components/operix-core/report-framework/__tests__/ReportBuilder.test.tsx
(no output · 0 errors · 0 warnings)

$ npx vitest run src/lib/report-framework/__tests__/ src/lib/_institutional/__tests__/
 Test Files  37 passed (37)
      Tests  230 passed (230)
   Duration  3.66s
```

---

## 7 · TOUCH discipline (all 0-DIFF except the listed files)

**Edited (additive only):**
- `src/lib/report-framework/index.ts` (2 re-export lines)
- `src/components/operix-core/report-framework/index.ts` (1 re-export line)
- `src/lib/report-framework/__tests__/read-only-lock.test.ts` (sole-writer exemption + new test)
- `src/components/fincore/DraftTray.tsx` (union enum +1)
- `src/pages/erp/fincore/FinCoreSidebar.tsx` (LIVE_MODULES +1 · REPORT_ITEMS +1 · rpt scope-array +1)
- `src/pages/erp/fincore/FinCorePage.tsx` (import + breadcrumbLabels +1 · switch case +1)
- `src/apps/erp/configs/insightx-sidebar-config.ts` (sidebar entry +1)
- `src/pages/erp/insightx/InsightXSidebar.types.ts` (union +1)
- `src/pages/erp/insightx/InsightXPage.tsx` (import + KNOWN_MODULES +1 · switch case +1)
- `src/lib/_institutional/sprint-history.ts` (RPT-8b flip + RPT-9a row)
- `src/lib/_institutional/sibling-register.ts` (new sibling entry)

**0-DIFF held:**
- `insightx-aggregator-engine.ts` ✅
- 8 InsightX features (overview · cockpit · viewer · lens-explorer · drill-to-root · operix-score · insights-inbox · predictive) ✅
- `register-saved-views-storage.ts` ✅
- `data-source-catalog.ts` · `role-layer.ts` · `daybook-*.ts` · `chart-config.ts` · `integrity-sign.ts` ✅
- All banked report/dashboard pages ✅
- `src/test/setup.ts` ✅

---

## 8 · No-synthetic data discipline

`ReportBuilder` reads via `getSource(id).read(entityCode)` — i.e. straight through the DSC registered sources. When `read()` returns 0 rows the UI shows `data-testid="rb-empty"` (`No rows for the current spec.`); when no measure is yet picked it shows `data-testid="rb-no-measures"` (`Pick at least one measure to preview.`). Zero fabricated rows anywhere in this sprint.

---

**Status:** RPT-9a complete. Engine + 4 governance locks shipped, ONE component covers both embedded and centralized mounts. RPT-9b–9e will roll the same component out to the remaining cards.
