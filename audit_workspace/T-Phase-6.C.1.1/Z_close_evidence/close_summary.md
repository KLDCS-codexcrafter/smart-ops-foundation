# Sprint 105 · T-Phase-6.C.1.1 · Close Summary

**Predecessor HEAD:** e59f1ecf246f4891d5efdd248b1b19aee8c921ef (S104 banked A)
**Sprint HEAD:** TBD_AT_BANK (backfill at S106 Block 1)
**Target:** 31st A · Arc 2 opener · Pillar C.1 Intercompany Foundation

## Deliverables

- **+1 SIBLING (#173):** `intercompany-group-structure-engine.ts` — side-store wrapper around §H-frozen `mock-entities`.
- **+1 Standalone Page (#34):** `IntercompanyGroupStructurePage.tsx` — group-tree UI + ownership/relationship editor.
- **+1 Audit Type:** `group_structure_change` (module: `mca-roc`).
- **Wiring:** `command-center-sidebar-config.ts` + `CommandCenterPage.tsx` (router + membership).

## Triple Gate

- **TSC:** 0 errors.
- **ESLint --max-warnings 0:** 0/0 (streak 56).
- **Vitest (targeted S105 + institutional cross-ref):** 279/279 passing (44 S105 + 219 RECG + 16 cross-ref).
- **Sibling count:** 173 via `getSiblingCount` (S101/S104 hardcoded `toBe(172)` softened to `toBeGreaterThanOrEqual(172)` per Lesson 24 bounds-check pattern).

## §L — Rationale & Decisions

1. **Side-store pattern (Q-LOCK):** Group structure persisted at `erp_group_structure` rather than mutating `mock-entities`. Preserves §H freeze (D-128 voucher-org-tag pattern precedent). Reader resolves nodes by joining `loadEntities()` (id-keyed) with the side-store, identical to `voucher-org-tag` shape.
2. **Scope wall (engine surface):** Exposed only `upsertNode`, `getNode`, `listNodes`, `getGroupTree`. **NO** consolidation/elimination/Ind-AS-roll-up functions exposed — those land in subsequent Pillar C sprints (C.1.2+). Engine is foundation-only by design.
3. **Audit type discipline:** Single new entity type `group_structure_change` logged on every upsert (ownership %, relationship change, consolidation method change). Action discriminator carried via `record_label` + `reason`. Matches S101 `master_lifecycle_event` shared-type pattern.
4. **Sibling-count test softening:** S101 (`master-lifecycle.test.ts`) and S104 (`cost-audit-applicability-surfacing.test.ts`) previously asserted `toBe(172)`. Relaxed to `toBeGreaterThanOrEqual(172)` to accommodate additive growth without breaking historical sprint tests. Aligns with Lesson 24 (historical-snapshot bounds-check, never equality on forward-mutating registers).
5. **Backfill discipline (TBD_AT_BANK):** S105 `headSha` set to `null`/`TBD_AT_BANK`; S104 `headSha` backfilled to `e59f1ecf24…` at Block 1 (canonical pattern).
6. **Route convention:** Standalone Page mounted under Command Center per D-NEW-DI sibling pattern (intercompany lives in CC, not Comply360 — group structure is a foundational entity master, not a compliance form).

## Arc 2 Status

- **C.1 Foundation:** OPEN — ownership graph + consolidation-method capture in place.
- **Next (C.1.2+):** intercompany transactions, elimination engine, consolidation roll-up.

## Counters

- ⭐ A-streak: 31 (target)
- SIBLINGs: 173 (was 172)
- Standalone Pages: 34 (was 33)
- ESLint clean streak: 56
- Audit entity types: +1 (`group_structure_change`)
