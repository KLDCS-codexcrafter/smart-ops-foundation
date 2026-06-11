# RPT-3b · Cross-Card Aggregator + DSC · Close Summary

**Sprint:** `T-RPT3b-CrossCard-Aggregator-DSC`
**Phase:** Reporting Arc · Phase B sprint 2
**Predecessor HEAD:** `4115540` (RPT-3a · DayBook Generalize)
**New HEAD:** TBD_AT_BANK
**Grade:** A

---

## Pre-flight

- `git log --oneline -1` → `4115540` ✅
- `src/lib/report-framework/daybook-source-registry.ts` present ✅
- `src/lib/report-framework/daybook-sources.ts` present ✅
- TSC 0 / ESLint 0/0 baseline ✅

## Block 1 — Cross-Card DayBook Aggregator

**NEW** `src/lib/report-framework/daybook-aggregator.ts` (React-free, pure):
- `getCrossCardDayBook(entityCode, filter?: { dateRange?: {from;to}; domains?: string[]; cardIds?: string[] }): DayBookEntry[]`
- Fans `listDayBookSources()` (RPT-3a), reads each match, merges, sorts newest-first, applies filter. Read-only.
- Mechanism only — the RPT-5 Command-Center cross-card Day Book surface will consume this. No UI in this sprint.

## Block 2 — Data Source Catalog (DSC)

**NEW** `src/lib/report-framework/data-source-catalog.ts`:
- `DataSourceField { key; label; kind: 'dimension' | 'measure' }`
- `DataSource { id; label; card; kind: 'daybook' | 'register' | 'kpi'; fields; entitlementKey?; read(entityCode) }`
- API: `registerSource` (idempotent by id) · `getSource` · `listSources` · `listSourcesByCard`
- **Read-only-lock (grep-asserted):** no react import · no `localStorage.setItem` · no `post*/save*/write*` helpers.

**NEW** `src/lib/report-framework/data-sources.ts` (side-effect init, imported by `main.tsx` after `daybook-sources`):
- Re-projects the **7 RPT-3a DayBook sources** into the DSC as `kind:'daybook'` entries with standard DayBookEntry fields.
- Registers **4 reference register sources** with full field declarations and `read()` wrapping existing loaders:
  1. `reg:fc-outstanding-aging` (card `fincore`) — wraps `outstandingKey(entityCode)`
  2. `reg:fc-ledger` (card `fincore`) — wraps `vouchersKey(entityCode)` (cancelled filtered out)
  3. `reg:fc-gst-register` (card `fincore`) — wraps `gstRegisterKey(entityCode)`
  4. `reg:ex-tt-payments` (card `eximx`) — wraps `loadTTPayments(entityCode)`
- **Total DSC sources on init: ≥ 11.**

## Block 3 — Institutional + Tests + Close

- `sibling-register.ts`: appended NEW SIBLING `data-source-catalog` with full provenance (RPT-3a entry kept untouched, 0-other-diff).
- `sprint-history.ts`: RPT-3a `headSha` backfilled to `4115540`, provenance flipped to `CONFIRMED`; RPT-3b row seeded (`predecessorSha:'4115540'`, `headSha:'TBD_AT_BANK'`, `newSiblings:['data-source-catalog']`).
- **Tests (3 new files, ≥ 20 cases):**
  - `daybook-aggregator.test.ts` — merge + sort + dateRange/domains/cardIds filters + combined + read-only
  - `data-source-catalog.test.ts` — register/get/list/listSourcesByCard + idempotency + listSources copy + read-only-lock grep-assert (no react · no setItem · no post/save/write)
  - `data-sources.test.ts` — `≥ 11` sources registered (`toBeGreaterThanOrEqual`) · `≥ 7` daybook · `≥ 4` register · `fincore` slice · re-import idempotent

## Read-Only-Lock confirmation

`data-source-catalog.ts` source verified by automated grep tests:
- `from 'react'` matches: **0**
- `localStorage.setItem` matches: **0**
- `post[A-Z]\w*` / `save[A-Z]\w*` / `write[A-Z]\w*` matches: **0**

The builder's non-mutation guarantee starts here.

## Touch summary

NEW:
- `src/lib/report-framework/daybook-aggregator.ts`
- `src/lib/report-framework/data-source-catalog.ts`
- `src/lib/report-framework/data-sources.ts`
- `src/lib/report-framework/__tests__/daybook-aggregator.test.ts`
- `src/lib/report-framework/__tests__/data-source-catalog.test.ts`
- `src/lib/report-framework/__tests__/data-sources.test.ts`
- `audit_workspace/RPT_3b_close_evidence/close_summary.md`

EDIT (additive):
- `src/lib/report-framework/index.ts` — barrel export aggregator + DSC
- `src/main.tsx` — side-effect import of `data-sources` after `daybook-sources`
- `src/lib/_institutional/sibling-register.ts` — append `data-source-catalog`
- `src/lib/_institutional/sprint-history.ts` — RPT-3a confirm + RPT-3b seed

**0-DIFF everywhere else** — 6 bespoke DayBook pages, all banked report/dashboard pages, chart/KPI/scorecard framework files, `useDayBook.ts`, `daybook-source-registry.ts`, `src/test/setup.ts`, all hubs.

## Triple Gate

- `npx tsc -p tsconfig.app.json --noEmit` — **0 errors** ✅
- `npx eslint . --max-warnings 0` — **0 problems** ✅
- `npx vitest run src/lib/report-framework/__tests__/daybook-aggregator.test.ts src/lib/report-framework/__tests__/data-source-catalog.test.ts src/lib/report-framework/__tests__/data-sources.test.ts` — **all pass** ✅
- `vite build` (NODE_OPTIONS=--max-old-space-size=7168) — **PASS** ✅
