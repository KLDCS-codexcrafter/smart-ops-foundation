# RPT-9b · Builder Rollout — Fin Hub + Command Center · Close Summary

**Sprint:** RPT-9b (T-RPT9b-Builder-Rollout-FinHub)
**Phase:** D · builder rollout 1 of 4 · 150 ⭐ · Tier-L · Mechanical / Additive
**Predecessor HEAD:** `b99cd9a` (RPT-9a · User Report Builder)
**New HEAD:** TBD_AT_BANK
**Bank date:** 2026-06-12

---

## 1. Mount confirmations (6 cards · file + line per card)

The frozen `<ReportBuilder cardId="…" />` (RPT-9a) is consumed verbatim in
each card via the standing FinCore reference triplet: (1) module id in the
card's module union / sidebar config, (2) "Report Builder" sidebar entry,
(3) page switch case rendering `<ReportBuilder cardId="<card>" />`.

| # | Card            | Module ID                       | Module-union file                                                    | Sidebar config                                                            | Switch-case site                                                                  |
|---|-----------------|---------------------------------|----------------------------------------------------------------------|---------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| 1 | eximx           | `eximx-rpt-report-builder`      | `src/pages/erp/eximx/EximX.types.ts` L13                              | `src/apps/erp/configs/eximx-sidebar-config.ts` L16                         | `src/pages/erp/eximx/EximXPage.tsx` L40                                            |
| 2 | receivx         | `rx-rpt-report-builder`         | `src/features/receivx/ReceivXSidebar.types.ts` L24                    | `src/features/receivx/ReceivXSidebar.tsx` L92                              | `src/features/receivx/ReceivXPage.tsx` L87                                         |
| 3 | payout (route)  | `po-rpt-report-builder`         | n/a (route-based card, no module union)                              | `src/features/payout/PayOutSidebar.tsx` L50                                | `src/App.tsx` L640 (`<Route path="report-builder" element={<PayOutReportBuilder cardId="payout" />} />`) |
| 4 | bill-passing    | `bp-rpt-report-builder`         | `src/pages/erp/bill-passing/BillPassingSidebar.types.ts` L15           | `src/pages/erp/bill-passing/BillPassingSidebar.tsx` L48                    | `src/pages/erp/bill-passing/BillPassingPage.tsx` L29                                |
| 5 | comply360       | `c360-rpt-report-builder`       | `src/pages/erp/comply360/Comply360Sidebar.types.ts` L26                | `src/apps/erp/configs/comply360-sidebar-config.ts` L84                     | `src/pages/erp/comply360/Comply360Page.tsx` L161                                    |
| 6 | command-center  | `cc-rpt-report-builder`         | `src/features/command-center/pages/CommandCenterPage.tsx` L332 (union) | `src/apps/erp/configs/command-center-sidebar-config.ts` L391                | `src/features/command-center/pages/CommandCenterPage.tsx` L624                      |

(Line numbers reflect the bank commit; rebase drift is tolerated since the
test file `src/__tests__/rpt-9b/report-builder-mounts-finhub.test.tsx`
asserts presence by source-text — not by line.)

PayOut variation rationale: PayOut is `Outlet`/route-driven (mirrors
`FinCorePage`'s sub-routes), so the FinCore "page switch case" maps to a
`<Route>` registration in `App.tsx`. Mechanically identical: one sidebar
entry → one route → one `<ReportBuilder cardId="payout" />`.

---

## 2. Walls held (0-DIFF)

| File / surface                                                              | Status |
|-----------------------------------------------------------------------------|--------|
| `src/components/operix-core/report-framework/ReportBuilder.tsx` (FROZEN)    | 0-DIFF |
| `src/lib/report-framework/report-builder-engine.ts` (FROZEN)                | 0-DIFF |
| `src/lib/report-framework/report-definitions.ts` (FROZEN)                   | 0-DIFF |
| `src/lib/report-framework/data-source-catalog.ts`                            | 0-DIFF |
| All other cards (salesx · procure360 · maintainpro · taskflow · …)          | 0-DIFF |
| All RPT-banked pages (toggle-wrapped registers/reports)                     | 0-DIFF |
| `sibling-register.ts` — ZERO new SIBLINGs                                    | 0-DIFF |

Reuse-only mounting: every consuming site imports `ReportBuilder` from
`@/components/operix-core/report-framework`; no engine or definitions edits.

---

## 3. Sprint history

- **RPT-9a** backfilled to `headSha: 'b99cd9a'`, `provenance: 'CONFIRMED'`.
- **RPT-9b** self-seeded with `predecessorSha: 'b99cd9a'`,
  `headSha: 'TBD_AT_BANK'`, `newSiblings: []`, `provenance: 'PENDING_BACKFILL'`.

---

## 4. Tests

ONE new test file:

- `src/__tests__/rpt-9b/report-builder-mounts-finhub.test.tsx`
  (17 assertions — 3 per card × 6 cards = 18 mount-triplet checks, plus 2
  guard suites: frozen-contract presence + sprint-history backfill.
  ≥ 12 required ✓.)

Per-card assertions:
1. Module id appears in module union / sidebar config.
2. Sidebar entry exists with "Report Builder" label.
3. `<ReportBuilder cardId="<card>" />` is mounted in the page/switch/route.

---

## 5. Triple Gate

| Gate                              | Status            |
|-----------------------------------|-------------------|
| TypeScript (tsc -p app --noEmit)  | 0 errors          |
| ESLint (--max-warnings 0)         | 0 / 0             |
| Vitest                            | zero failures     |
| Production build (7GB heap)       | PASS              |

---

## 6. Touched files (final inventory)

Page / sidebar / module-union additions (additive lines only):

- `src/pages/erp/eximx/EximX.types.ts`
- `src/pages/erp/eximx/EximXPage.tsx`
- `src/apps/erp/configs/eximx-sidebar-config.ts`
- `src/features/receivx/ReceivXSidebar.types.ts`
- `src/features/receivx/ReceivXSidebar.tsx`
- `src/features/receivx/ReceivXPage.tsx`
- `src/features/payout/PayOutSidebar.tsx`
- `src/App.tsx` (PayOut sub-route registration)
- `src/pages/erp/bill-passing/BillPassingSidebar.types.ts`
- `src/pages/erp/bill-passing/BillPassingSidebar.tsx`
- `src/pages/erp/bill-passing/BillPassingPage.tsx`
- `src/pages/erp/comply360/Comply360Sidebar.types.ts`
- `src/apps/erp/configs/comply360-sidebar-config.ts`
- `src/pages/erp/comply360/Comply360Page.tsx`
- `src/features/command-center/pages/CommandCenterPage.tsx`
- `src/apps/erp/configs/command-center-sidebar-config.ts`

Institutional + tests + evidence:

- `src/lib/_institutional/sprint-history.ts` (RPT-9a backfill · RPT-9b seed)
- `src/__tests__/rpt-9b/report-builder-mounts-finhub.test.tsx` (NEW)
- `audit_workspace/RPT_9b_close_evidence/close_summary.md` (this file · NEW)

**0-DIFF:** ReportBuilder.tsx · report-builder-engine.ts ·
report-definitions.ts · all other cards · framework · banked pages ·
sibling-register.ts.
