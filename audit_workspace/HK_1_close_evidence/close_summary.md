# Sprint T-Phase-2.HK-1-EximX-AtlasPreview-Retire · Close Summary

**Sprint identity:** Sprint 41 · 1st HK lane sprint · 41st composite A first-pass-clean
**Predecessor HEAD:** `b8f3a8e1` "Added D-NEW-FK and close summary"
**Close HEAD:** `012d4f8b` "Retired HK-1 stale routes"
**Type:** Housekeeping · negative-LOC (~30 deletions)

## §1 — Scope

EximX had 3 entry points funneling to one Atlas Suite destination. The canonical
"EximX · Unified" sidebar item routes to the full Atlas Suite (shipped EX-11).
Two stale duplicate entry points retired:

1. `saathi-tdl-gaps-atlas` sidebar item (under Saathi group)
2. `Vendor AI · TDL Gaps Atlas` Welcome card block

Both pointed to the same legacy preview surface that has been superseded by the
Unified Atlas Suite. `TDLGapsAtlasPreview.tsx` itself preserved at 0-diff
(dormant component · FR-10 historical preservation) for potential future re-use.

## §2 — Changes Applied

| File | Change |
|------|--------|
| `src/apps/erp/configs/eximx-sidebar-config.ts` | Removed `saathi-tdl-gaps-atlas` item · removed unused `Bot` icon import |
| `src/pages/erp/eximx/EximX.types.ts` | Removed `'saathi-tdl-gaps-atlas'` from `EximXModule` union |
| `src/pages/erp/eximx/EximXPage.tsx` | Removed `TDLGapsAtlasPreview` import + conditional render block |
| `src/pages/erp/eximx/EximXWelcome.tsx` | Removed Vendor AI · TDL Gaps Atlas card · removed unused `Bot` icon |

## §3 — Triple Gate

| Gate | Before | After | Status |
|------|--------|-------|--------|
| TSC | 0 errors | 0 errors | ✅ |
| ESLint | 0/0 | 0/0 | ✅ |
| Vitest | 1597/247 | 1597/247 | ✅ identical anchor |
| Build | PASS | PASS | ✅ |

## §4 — Invariants Preserved

- 12 canonical engines: 0-diff
- 22 prior NEW code files (TB-1 + B-1 + B-2 + EX-12): 0-diff
- `TDLGapsAtlasPreview.tsx`: 0-diff (FR-10 preservation)
- 11-file Sinha seed manifest: 0-diff (6th sprint preserving)
- package.json + lock: 0-diff (19th sprint preserving)

## §5 — Decisions & Carry-Forward

- **FR-CANDIDATE-88** (HK lane housekeeping pattern): 1st validation banked
- Phase 2 Tier 2 starts next: Sprint 42 (HK-2 MainStoreHub rename)
- No D-NEW closures this sprint (pure deletion · no new decisions)
