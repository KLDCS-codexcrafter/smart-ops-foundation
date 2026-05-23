# FR-CANDIDATE-93 · ls-helper Engine-Side Doctrine

**Status:** CANDIDATE · promoted at next FR Ceremony OR institutional acceptance
**Origin:** HK-6 audit verdict §18 + HK-6.T1 Q-LOCK-T1-2(i) ratified
**Date:** May 23, 2026

## Doctrine statement

When a UI component (panel · register · transaction page) uses an **inline `ls<T>()` helper function** to read/write a single storage key with FR-26 entity-scoping via `*_${entityCode}` key naming, that pattern is **architecturally engine-side compliant** and does NOT violate FR-19 SIBLING discipline.

## Empirical justification (verified at HK-6 audit)

1. **Pattern matches established engines** · `audit-engine.ts` · `engineeringx-bom-engine.ts` · `fincore-engine.ts` all contain inline `ls<T>()` helpers serving the same purpose.
2. **FR-26 entity-scoping preserved** · all 73 dispatch localStorage calls use entity-scoped key functions (`vouchersKey(entityCode)` · `packingMaterialsKey(entityCode)` · `podRegisterKey(entityCode)` etc).
3. **22-sprint review pattern has not flagged this** · institutional knowledge has implicitly accepted the pattern.
4. **Zero functional improvement from hard migration** · refactor to PUBLIC API wrappers adds layers without changing behaviour · introduces regression risk.

## Canonical pattern definition

```typescript
function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; }
  catch { return []; }
}

const items = ls<PackingMaterial>(packingMaterialsKey(entityCode));
```

## When this doctrine does NOT apply

- localStorage call WITHOUT entity-scoping (FR-26 violation · must fix).
- Direct `localStorage.getItem('hardcoded_key')` (no key function indirection).
- Cross-card domain writes (must go through PUBLIC API of source-card engine).

## Status of 73 HK-6 dispatch localStorage calls

All 73 calls in `src/pages/erp/dispatch/` verified compliant with this doctrine:
- 21 of 26 files use the canonical `ls<T>()` pattern.
- All 73 calls use entity-scoped key functions.
- Marked PATTERN-COMPLIANT · no migration required.

## Implication for future sprints

- New dispatch panels MAY use the inline `ls<T>()` pattern if FR-26 entity-scoping preserved.
- New cross-card domain writes MUST go through engine PUBLIC API (no change).
- Existing 22-sprint precedent codified · no retroactive refactor of compliant code.
