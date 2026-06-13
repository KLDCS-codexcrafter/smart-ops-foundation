# W1C-9 · Entry-Page Polish — Close Summary

**Sprint:** T-W1C9-Entry-Page-Polish
**Predecessor HEAD:** `8caee7d` (W1C-8 · SigmaFlow blueprint)
**Scope:** entry pages only — presentation, ZERO logic/data changes
**Grade:** A (presentation-only · Triple-Gate clean)

## Findings addressed
1. `src/pages/tower/Dashboard.tsx` hardcoded dark-only colors → broke in light mode.
2. `src/pages/Welcome.tsx` Client Blueprints copy still said "Seven scenarios"; roster now has 8 (SigmaFlow added in W1C-8).

## Block 1 — tower/Dashboard.tsx hex → token conversion

| Before (hardcoded chrome) | After (semantic token) | Role |
|---|---|---|
| `bg-[#1E3A5F]` (panel/card surface, 7 sites) | `bg-card` | card surface |
| `border-slate-700` (6 sites) | `border-border` | card border |
| `hover:bg-[#24466d]` | `hover:bg-accent` | action-dock hover |
| `hover:border-cyan-500` | `hover:border-primary` | action-dock hover border |
| `text-white` (5 sites) | `text-foreground` | primary text |
| `text-slate-300` / `text-slate-400` / `text-slate-500` | `text-muted-foreground` | secondary text |
| `text-cyan-400` (links / icon accents) | `text-primary` | brand accent |
| `bg-slate-700` (progress track + pill bg) | `bg-secondary` | inset surface |
| SVG `stroke="#334155"` (gauge ring track) | `stroke="hsl(var(--border))"` | SVG chrome |
| `bg-emerald-900/60` `text-emerald-400` (status pill) | `bg-success/15 text-success` | success tint |
| `bg-amber-900/60` `text-amber-400` | `bg-warning/15 text-warning` | warning tint |
| `text-red-400` / `bg-red-400` | `text-destructive` / `bg-destructive` | destructive tint |
| `text-purple-400` / `bg-purple-400` (User activity) | `text-primary` / `bg-primary` | brand tint |
| `text-amber-400` / `bg-amber-400` (Billing activity) | `text-warning` / `bg-warning` | warning tint |
| `text-emerald-400` / `bg-emerald-400` (System / score) | `text-success` / `bg-success` | success tint |

### Intentionally retained as DATA (not theme chrome)
- `gauges[].color` = `#0EA5E9 / #8B5CF6 / #10B981 / #F59E0B` — drive SVG stroke + numeric `fill` inside `<RadialGauge>`. These are semantic status accents bound to the gauge data, not page chrome. Commented as such.
- The gauge progress stroke comes from the `color` field (data-driven), matching the prompt's instruction to preserve status-accent semantics on a token-driven surrounding card.

### Honest-static disclosure
- `bannerStats`, `services`, `recentActivity` arrays annotated with `// static platform-admin landing data` and an existing `// [JWT]` marker on the activity feed.

**Logic 0-DIFF** — every change is a className/attribute string swap or a comment. No control flow, no data shape, no behavior altered.

## Block 2 — Welcome.tsx copy truth
- `src/pages/Welcome.tsx` line 120: `"Seven design-partner client scenarios — … Sinha Industries ★."` → `"Eight design-partner client scenarios — … Sinha Industries ★ · SigmaFlow Control."`
- Added a sync comment pointing at `src/pages/welcome/scenarios/ClientBlueprintsPage.tsx` (the CLIENT_SCENARIOS roster source of truth — currently 8 entries: abdos, cherise, bcpl, smartpower, amith, shankar-pharma, sinha, sigmaflow).

## Block 3 — Verification

### Test file
- `src/__tests__/w1c-9/tower-theme-tokens.test.ts` — single guard suite:
  - asserts `tower/Dashboard.tsx` has **zero** `bg-[#…]` arbitrary chrome
  - asserts **zero** `border-slate-*`, `text-slate-*`, `text-white` classes
  - asserts canonical token vocabulary present (`bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `hsl(var(--border))`)
  - asserts Welcome copy reflects 8 scenarios + names SigmaFlow Control
  - asserts the actual CLIENT_SCENARIOS roster contains exactly 8 entries

### sprint-history
- Backfilled W1C-8 `headSha` from `TBD_AT_BANK` → `8caee7d`.
- Self-seeded W1C-9 entry (`T-W1C9-Entry-Page-Polish`, predecessor `8caee7d`, grade A).

## Walls held
- `bridge/ConsoleDashboard.tsx`: 0-DIFF (used only as the token-vocabulary reference)
- The 33 ERP card pages: 0-DIFF (entry-page scope only)
- All banked surfaces: 0-DIFF
- ZERO new SIBLINGs

## Files touched
- `src/pages/tower/Dashboard.tsx` — color tokens + honest-static comments
- `src/pages/Welcome.tsx` — single-line copy correction + sync comment
- `src/lib/_institutional/sprint-history.ts` — W1C-8 backfill + W1C-9 self-seed
- `src/__tests__/w1c-9/tower-theme-tokens.test.ts` — new (single test file per rules)
- `audit_workspace/W1C_9_close_evidence/close_summary.md` — this document
