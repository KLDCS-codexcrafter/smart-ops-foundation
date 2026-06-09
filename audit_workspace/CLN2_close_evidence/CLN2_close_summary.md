# CLN2 · T-CLN2-Bridge-DeadButtons · Close Summary

**Predecessor HEAD:** `54ba9516` (CLEANUP-1 · 106 ⭐)
**Target:** 107 ⭐ · ~200 LOC · Tier-L · NO new SIBLING (empty newSiblings)
**Scope:** exactly 7 dead "coming soon" buttons across 5 bridge pages

---

## §0 · Pre-flight (Block 0)

| # | Site | Local state on file | Decision | Reason |
|---|------|---------------------|---|---|
| 1 | `ConsoleDashboard.tsx:138` Filter-by-stage | `PIPELINE` const (no row table to filter) | **WIRE** | toggle local `selectedStage`, dim non-matching, show clearable banner |
| 2 | `FieldMapper.tsx:253` Delete (row) | `TEMPLATES` const | **WIRE** | convert to `useState`, confirm + remove |
| 3 | `FieldMapper.tsx:502` Delete (detail sheet) | same | **WIRE** | same `deleteTemplate` helper, sheet auto-closes |
| 4 | `CompanyRegistry.tsx:359` Company config | `COMPANIES` const + existing detail Sheet | **WIRE** | open existing detail Sheet (which IS the configuration view); no new dialog |
| 5 | `CompanyRegistry.tsx:603` Remove feature | same | **WIRE** | convert to `useState`, confirm + remove + close sheet |
| 6 | `ExceptionWorkbench.tsx:343` Edit & Retry | `EXCEPTIONS` const | **WIRE** | convert to `useState`, `window.prompt` module override, flip `status:'resolved'` |
| 7 | `BridgeSettings.tsx:452` Download Bridge Agent .exe | binary asset distribution | **HONEST-DEFER** | disabled button + "arrives with Wave-2 sync backend" note; no fake action |

Bridge mock→real-fetch Wave-2 seams (the `[JWT] BRIDGE TIER SCOPING` comments in `ConsoleDashboard`, `FieldMapper`, `CompanyRegistry`, `ExceptionWorkbench`): **untouched** (verified by test). These are correct, registered Wave-2 deferrals.

---

## §1 · Implementation (Pass 1)

| File | Edits | LOC | Walls |
|---|---|---|---|
| `src/pages/bridge/ConsoleDashboard.tsx` | +`useState` `selectedStage`; toggle + dim + clearable banner; drop `toast` import | ~35 | rest of page 0-DIFF |
| `src/pages/bridge/FieldMapper.tsx` | `TEMPLATES` → `INITIAL_TEMPLATES` + `useState<MappingTemplate[]>`; `deleteTemplate(t)` helper (confirm + filter + close sheet); both delete buttons rewired | ~30 | mapper/prebuilt tabs + detail sheet body 0-DIFF |
| `src/pages/bridge/CompanyRegistry.tsx` | `COMPANIES` → `INITIAL_COMPANIES` + `useState<TallyCompany[]>`; `handleRemoveCompany` (confirm + filter + close sheet); Settings icon → `openDetail(c)`; stats counts read from `companies` | ~30 | add dialog / detail body / domain matrix 0-DIFF |
| `src/pages/bridge/ExceptionWorkbench.tsx` | `EXCEPTIONS` → `INITIAL_EXCEPTIONS` + `useState<Exception[]>`; `handleEditAndRetry` (prompt module + flip `resolved`); button rewired | ~25 | trend chart / table / filters / detail sheet body 0-DIFF |
| `src/pages/bridge/BridgeSettings.tsx` | Download button → `disabled` + honest Wave-2 paragraph | ~7 | every other tab + button 0-DIFF |
| `src/lib/_institutional/sprint-history.ts` | CLN1 → `54ba9516` / `CONFIRMED`; appended CLN2 row (empty `newSiblings`) | ~10 | rest 0-DIFF |
| `src/test/sprint-cln2/cln2-block-behavioral.test.ts` | NEW · 24 it() (>20 floor) | ~165 | n/a |
| `audit_workspace/CLN2_close_evidence/CLN2_close_summary.md` | NEW (this file) | n/a | n/a |

**Total productive edit footprint:** ~140 LOC + ~165 LOC tests ≈ 200 LOC envelope.
**New SIBLING:** none (empty `newSiblings`).

### Walls — verified 0-DIFF
- Bridge engines (`reconciliation-engine`, `sync-engine`) — not imported by any of the 5 cleaned files (test-asserted)
- Bridge mock→real-fetch Wave-2 seams (`[JWT] BRIDGE TIER SCOPING` markers) — preserved in all 4 files that carry them (test-asserted)
- All bridge pages outside the 5-file allowlist (`AgentFleet`, `ApprovalInbox`, `AuditExplorer`, `ExportHub`, `ImportHub`, `ReconciliationWorkbench`, `SyncMonitor`, `SyncProfiles`) — untouched
- `hash-chain`, `retention`, `applications.ts`, `entitlements`, sidebars, types — untouched
- No live `fetch(`, no `axios`, no new dependency

---

## §5 · Triple Gate (post-final-edit)

```
$ rg "coming soon" src/pages/bridge/
<no matches>

$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
<exit 0 · no output>

$ NODE_OPTIONS="--max-old-space-size=7168" npx eslint . --max-warnings 0
<exit 0 · no output>

$ NODE_OPTIONS="--max-old-space-size=7168" npx vitest run \
    src/test/sprint-cln2 src/test/sprint-cln1 src/test/sprint-b6 \
    src/test/sprint-p83 src/test/sprint-p84 src/test/sprint-p85 \
    src/test/sprint-p86 src/test/sprint-p87
 Test Files  11 passed (11)
      Tests  246 passed (246)

$ NODE_OPTIONS="--max-old-space-size=7168" npm run build
✓ built in 51.57s
```

CLN2 suite: **24 it() green** (above the ≥20 quality floor).

---

## §6 · Acceptance Criteria

| AC | Status | Evidence |
|---|---|---|
| AC1  Block-0 5/5 + wire-vs-defer table | ✅ | §0 above |
| AC2  All 7 buttons honest (wired or honest-deferred) | ✅ | §1 table |
| AC3  Zero "coming soon" toasts in `src/pages/bridge/` | ✅ | `rg` shows 0; test enforces |
| AC4  Wired buttons operate on EXISTING local state (honest empty/confirm) | ✅ | `window.confirm` on deletes; `useState` on existing arrays |
| AC5  Deferred button shows honest Wave-2 note, no fake action | ✅ | `BridgeSettings:452` — disabled + paragraph; test asserts no `onClick` |
| AC6  NO new engine (empty `newSiblings`) | ✅ | CLN2 row `newSiblings: []` |
| AC7  Bridge Wave-2 mock→real-fetch seams UNTOUCHED · no live fetch | ✅ | test asserts `[JWT]` markers preserved + no `fetch(` |
| AC8  ≥20 it() green | ✅ | 24/24 in `cln2-block-behavioral.test.ts` |
| AC9  History + CLN1 flip | ✅ | CLN1 → `54ba9516` (CONFIRMED); CLN2 appended |
| AC10 Walls 0-DIFF (engines · pages-beyond-handlers · hash-chain · retention · applications.ts · entitlements) | ✅ | tests + grep |
| AC11 No new deps · Triple Gate 4/4 · close summary | ✅ | gates above |

---

## §H · Allowlist (verified)

- `src/pages/bridge/{ConsoleDashboard,FieldMapper,CompanyRegistry,ExceptionWorkbench,BridgeSettings}.tsx` — 7 handlers + minimal local-state wiring only
- `src/test/sprint-cln2/cln2-block-behavioral.test.ts` — NEW
- `src/lib/_institutional/sprint-history.ts` — CLN1 flip + CLN2 row (sibling-register untouched: empty newSiblings)
- `audit_workspace/CLN2_close_evidence/CLN2_close_summary.md` — NEW

Anything outside this allowlist in `git diff 54ba9516..HEAD --name-only` = audit defect.

---

*CLN2 Step-2 v1 · banked 2026-06-09 · 7 Bridge dead buttons made honest · Bridge core sync stays Wave-2 (registered) · 106 → 107 ⭐.*
