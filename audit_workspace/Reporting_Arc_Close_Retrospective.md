# Reporting Arc — Close Retrospective

**Status:** REPORTING_ARC: COMPLETE
**Closed by:** RPT-12c (T-RPT12c-Migration-Wave2-Arc-Close) · arc-close 3 of 3
**Predecessor HEAD entering:** `c5cee13`

This retrospective documents only what the tree contains as of RPT-12c close.
No claims beyond `src/lib/_institutional/sprint-history.ts`,
`src/lib/report-framework/`, `src/components/operix-core/report-framework/`,
and the `src/pages/erp/**` / `src/__tests__/rpt-*` paths.

---

## Sprints banked in the arc

Source: `src/lib/_institutional/sprint-history.ts` rows tagged `RPT-*`.

| Sprint   | Code                                       | HEAD       | Theme                                       |
| -------- | ------------------------------------------ | ---------- | ------------------------------------------- |
| RPT-1a   | T-RPT1a-Reporting-Foundation               | `862f0c3`  | Framework foundation · ReportChart + signReport |
| RPT-1b…  | (FinCore + receivx + payout seeds)         | banked     | KPI registry seeds + DSC catalog            |
| RPT-2a/b/c | EximX + Comply360 seeds                  | banked     | Trade-doc + compliance KPI seeds            |
| RPT-4    | Role-layer tagging                         | banked     | RoleLayer dimension on KPIs                 |
| RPT-6a/c | OEE thresholds + GateFlow honesty study    | banked     | Threshold seeding · DSC coverage honesty    |
| RPT-7    | WebStoreX honesty study                    | banked     | hub-wide skip (zero DSC sources)            |
| RPT-9a   | User Report Builder                        | `b99cd9a`  | NEW SIBLING report-builder-engine           |
| RPT-9b   | Builder rollout · FinHub (6 cards)         | `7ae3576`  | Mechanical mount                            |
| RPT-9c   | Builder rollout · Ops (11 cards)           | `8d78373`  | Mechanical mount · GateFlow skipped         |
| RPT-9d   | Builder rollout · Sales (5 cards)          | `2b62547`  | Mechanical mount · WebStoreX skipped        |
| RPT-9e   | Builder rollout · Support (6 cards)        | `be771e8`  | Mechanical mount · ≥30 cards carry builder  |
| RPT-10a  | Executive cockpits 1 · DSC repair          | `9b98b3c`  | 4 new DSC sources · PromoterCockpit · CreditXRay · SpendFunnel |
| RPT-10b  | Ops cockpits 2 · audit upgrades            | `415c52a`  | OEEBoard · COQ · EVM · 2 Comply360 upgrades |
| RPT-12a  | BuilderUX close · 6 capabilities           | `22d6860`  | PivotMatrix · CSV · search · intent · narrative · KPI-resolve |
| RPT-12b  | Migration Wave 1 (15 pages)                | `c5cee13`  | Production 9 · Dispatch 4 · SalesX 2        |
| RPT-12c  | Migration Wave 2 + Arc Close (19 pages)    | TBD_AT_BANK | ServiceDesk 7 · ProjX 1 · Distributor 3 · PayOut 2 · Singles 6 |

---

## Surfaces wrapped / migrated

Source: `grep -rl "from 'recharts'" src/pages/erp --include=*.tsx | grep -v __tests__`
at RPT-12c close returns **0 files**.

* RPT-12b migrated **15** ERP report pages off raw recharts.
* RPT-12c migrated the remaining **19** ERP pages.
* Combined ERP migration coverage: **34** report surfaces on the framework.
* Builder-mount cards: ≥**30** (see RPT-9b/9c/9d/9e rows).
* Cockpit pages composing frozen primitives: **5** (PromoterCockpit · CreditXRay · SpendFunnel · OEEBoard · COQ · EVM).

The only `src/pages/**/*` file still importing recharts is
`src/pages/vendor-portal/VendorPerformanceView.tsx`, declared in
`RECHARTS_LEGACY_ALLOWLIST` of `arc-close-sweep.test.ts` with a comment that
it is a non-ERP Phase-1.A stand-alone view scheduled for a vendor-portal arc
follow-up.

---

## KPI registry

Source: `src/lib/report-framework/kpi-registry.ts` `registerKpi` call sites.

* All KPI `dataSource` pointers either resolve via `getSource(...)` or are
  declared as `reg:*` register references — asserted by the
  `arc-close-sweep.test.ts` `getSource` invariant.
* RPT-12c wires the pre-seeded ids documented in the sprint prompt at their
  target pages: `px-cashflow`, `db-scheme-eff`, `db-disputes`, `cu-loyalty`,
  `sd-customer-pnl`, `sd-promise-variance`.

---

## DSC sources

Source: `src/lib/report-framework/data-sources.ts` + `data-source-catalog.ts`.

* RPT-10a added the 4 Fin-hub sources that un-emptied builder previews
  (`receivx.ar`, `payout.payments`, `billpassing.bills`, `eximx.shipments`).
* `dsc-card-id-integrity.test.ts` (extended at RPT-10a) continues to assert
  every mounted-builder card resolves ≥1 source (meta cards `cc`, `ix`
  documented as exceptions).

---

## Cockpits

* PromoterCockpitPage (`/erp/command-center/promoter`) — TV-mode auto-cycling.
* CreditXRayPage (ReceivX).
* SpendFunnelPage (Procure360).
* OEEBoardPage (Production).
* COQPage (QualiCheck).
* EVMPage (ProjX).

All compose the FROZEN primitives — `ReportChart`, `ScorecardTile`,
`signReport`, `defaultChartConfig`, `getKpi`, `resolveRag` — and read real
DSC / engine rows with honest empty-states where source rows lack a leg.

---

## Deferred items (documented at arc-close, not implemented)

1. **Master-Drift detection** — banked as scoped follow-up; no presence in
   `src/lib/report-framework/` today.
2. **LLM narrative / intent providers** — Wave-2 plug-in points exist
   (`narrative.ts` `NarrativeProvider` interface, `intent-match.ts`
   rule-based default); LLM provider implementations not banked.
3. **Mobile-ARC** — unchanged by this arc; no migrations in `src/apps/mobile`
   (no recharts presence there to start with).

---

## Triple-Gate at close

* TSC 0 errors / ESLint 0 warnings (verified pre-close).
* `arc-close-sweep.test.ts` — 4 closing assertions green.
* 19 new per-page migration tests in `src/__tests__/rpt-12c/` green.

REPORTING_ARC: COMPLETE.
