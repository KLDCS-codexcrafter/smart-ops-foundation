# RPT-10a · Executive Cockpits + Fin-hub DSC Repair · Close Summary

**Predecessor HEAD:** `be771e8` · **Sprint:** RPT-10a · Phase D cockpits 1 of 2
**Status:** Triple-Gate clean · ZERO new SIBLINGs · ZERO synthetic data

---

## Block 1 · Fin-hub DSC repair (4 new sources)
`src/lib/report-framework/data-sources.ts` — wraps existing storage/engines, no new engines.

| id | card | wraps |
|---|---|---|
| `receivx.ar` | `receivx` | `outstandingKey()` filtered to debtors, age-bucketed |
| `payout.payments` | `payout` | `vendorPaymentBatchKey()` non-cancelled |
| `billpassing.bills` | `bill-passing` | `billPassingKey()` age-bucketed |
| `eximx.shipments` | `eximx` | `loadShippingBills()` with derived `fob_value_inr` / `realised_value_inr` |

**Integrity test extended** (`dsc-card-id-integrity.test.ts`): every mounted-builder card (-rpt-report-builder mount) resolves ≥1 source; meta cards `cc-`/`ix-` legitimately excluded (cross-card composition).

## Block 2 · 🖥 Promoter Cockpit (TV mode)
`src/features/command-center/pages/PromoterCockpitPage.tsx` · route `/erp/command-center/promoter` · CC sidebar entry "Promoter Cockpit".

| Section | Data sources |
|---|---|
| ① Org KPIs | `deriveRoleDashboard('tenant_admin','management', allowedCards)` xc-* tiles |
| ② Cash & AR | `xc-cash-position` (honest empty — no DSC source yet · declared) + `receivx.ar` aging chart |
| ③ Compliance | `comply360.aggregate.compliance-pct` RAG tiles via `resolveRag` |
| ④ Ops pulse | `production.orders` + `dispatch.shipments` status charts |

Auto-cycles 12s, pauses on click/keydown, integrity badge + honest empty-state per section.

**Omit-and-say-so:** `xc-cash-position` has no DSC source yet → empty-state rendered honestly ("xc-cash-position source has no rows yet").

## Block 3 · 💳 Credit X-Ray
`src/pages/erp/receivx/cockpits/CreditXRayPage.tsx` · ReceivX module `rx-credit-xray` · sidebar entry "Credit X-Ray".
Composes `receivx.ar` (always) + `distributor.orders` (cross-card, gated to management via `layerCeilingFor`): aging waterfall, top-10 exposure column, overdue-% RAG tile, drill table via `TableChartToggle`.

## Block 4 · 🔻 Spend Funnel
`src/pages/erp/procure-hub/cockpits/SpendFunnelPage.tsx` · Procure360 module `spend-funnel` · sidebar entry "Spend Funnel".
From `procure.purchase-orders` + `procure.budget-utilization`: funnel stages (indent→PO→GRN→billed) where the data actually carries the status — missing stages **declared via `spend-funnel-missing-declared` test-id, not faked**. Budget-vs-actual combo chart + top-10 vendor concentration column. Top-3 concentration % RAG-eligible.

## Block 5 · KPI seeds + institutional + tests
- **5 KPI seeds (idempotent, seed-only)**: `xc-promoter`, `rx-credit-exposure`, `rx-overdue-pct`, `pr-spend-funnel`, `pr-vendor-concentration`.
- **sprint-history.ts**: RPT-9e backfilled `headSha: 'be771e8'`, RPT-10a self-seeded with `predecessorSha: 'be771e8'`. ZERO new SIBLINGs.

## Tests · 33 assertions
- `src/lib/report-framework/__tests__/dsc-card-id-integrity.test.ts` (extended) — 8 tests
- `src/__tests__/rpt-10a/promoter-cockpit.test.tsx` — 10 tests
- `src/__tests__/rpt-10a/credit-xray.test.tsx` — 7 tests
- `src/__tests__/rpt-10a/spend-funnel.test.tsx` — 8 tests

## Gates
```
TSC:    npx tsc -p tsconfig.app.json --noEmit   → 0 errors
ESLint: npx eslint <touched files> --max-warnings 0 → 0/0
Vitest: 2608 tests passed (pre-existing audit-trail-chain unhandled warning · localStorage in node env · unrelated)
        RPT-10a scope: 33/33 green
```

## 0-DIFF discipline
ReportBuilder · report-builder-engine · report-definitions · all banked pages incl. OEEDashboard + Comply360 audit pages · `src/test/setup.ts` — all 0-DIFF.

## TOUCHED FILES
- `src/lib/report-framework/data-sources.ts` (4 sources appended + 3 imports)
- `src/lib/report-framework/__tests__/dsc-card-id-integrity.test.ts` (extended)
- `src/lib/report-framework/kpi-registry.ts` (5 seeds appended)
- `src/lib/_institutional/sprint-history.ts` (RPT-9e backfill + RPT-10a self-seed)
- `src/features/command-center/pages/PromoterCockpitPage.tsx` (NEW)
- `src/pages/erp/receivx/cockpits/CreditXRayPage.tsx` (NEW)
- `src/pages/erp/procure-hub/cockpits/SpendFunnelPage.tsx` (NEW)
- `src/App.tsx` (+ Promoter route)
- `src/apps/erp/configs/command-center-sidebar-config.ts` (+ Promoter Cockpit entry)
- `src/apps/erp/configs/procure360-sidebar-config.ts` (+ Spend Funnel entry)
- `src/pages/erp/procure-hub/Procure360Page.tsx` (+ import + switch case)
- `src/pages/erp/procure-hub/Procure360Sidebar.types.ts` (+ spend-funnel)
- `src/features/receivx/ReceivXPage.tsx` (+ import + switch case + label)
- `src/features/receivx/ReceivXSidebar.tsx` (+ Credit X-Ray button)
- `src/features/receivx/ReceivXSidebar.types.ts` (+ rx-credit-xray)
- `src/__tests__/rpt-10a/{promoter-cockpit,credit-xray,spend-funnel}.test.tsx` (NEW)
- `audit_workspace/RPT_10a_close_evidence/close_summary.md` (NEW)

**HEAD must be:** `be771e8` (will be re-tagged at bank).
