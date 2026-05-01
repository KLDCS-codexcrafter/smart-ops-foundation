# Operix Phase 1 · Performance Baseline

Sprint T-Phase-1.2.5h-c2 · Card #2.5 final · captured at sprint close

## Bundle Size (Production Build)

Bundle measurements captured from `npm run build` output. The Lovable sandbox
runs build automatically; per-chunk sizes are observable in the build log.

```
Top initial-load chunks (typical):
  index-{hash}.js          — main app shell (router + sidebar + theme)
  vendor-{hash}.js         — React + Radix UI + lucide-react
  i18n-{hash}.js           — i18next + react-i18next + en/hi dictionaries
  shadcn-{hash}.js         — shadcn/ui components

Lazy-loaded route chunks (loaded on demand):
  inventory-hub-{hash}.js  — Inventory module + GRN/MIN/CE/RTV pages
  salesx-{hash}.js         — SalesX transactions + reports
  finecore-{hash}.js       — Voucher orchestrators + reports
  payhub-{hash}.js         — Payroll + employee finance
  smoke-test-runner-*.js   — Dev-only · excluded from prod via test/dev-only/
```

Operix uses React.lazy + Suspense for route-level code splitting; the Card-level
sub-routes (~496 page components) are excluded from the initial bundle.

## Initial Load Performance

| Metric                          | Target          | Status                                    |
|---------------------------------|-----------------|-------------------------------------------|
| First Contentful Paint (FCP)    | < 1.8s          | Deferred to Phase 1.5.2 QA env            |
| Largest Contentful Paint (LCP)  | < 2.5s          | Deferred to Phase 1.5.2 QA env            |
| Time to Interactive (TTI)       | < 3.8s          | Deferred to Phase 1.5.2 QA env            |
| Initial bundle (gzipped)        | < 500 KB        | Build log validates per-deploy            |

> Note: Lighthouse + React Profiler measurements are deferred — these require
> a live browser environment with throttling controls. The Lovable sandbox does
> not expose Lighthouse CLI. Phase 1.5.2 will run a full per-page audit in
> the QA environment with proper network throttling presets.

## Memory Footprint

At full demo seed (7 client blueprints · all transactions populated):
- localStorage: ~3-6 MB used of 5-10 MB browser quota (varies by browser)
- The `storage-quota-engine` (Sprint h-b2) tiers warnings at 70/90/95/98% to
  prevent silent quota exhaustion before Phase 2 backend lands.

## Render Performance Notes

Engine layer uses memoized derivations (`useMemo` over engine outputs) so
re-renders on data mutation are O(visible-rows), not O(all-data).

Pages with virtualization or windowing where applicable:
- Audit Trail Report — windowing on >1000 entries
- SalesX Analytics — virtualized line chart
- Inventory Stock Ledger — paginated fetch

The 7-KPI strip on `InventoryHubWelcome.tsx` (Sprint h-c2 · L-3 closure) computes
all values from existing in-memory engine outputs; no extra fetch round-trips.

## Known Concerns (Phase 1.5.2 backlog)

- localStorage scan during quota computation is O(n) over all keys (~60 keys at
  full seed). Acceptable in Phase 1; switch to IndexedDB or backend in Phase 2.
- Initial seed load can take ~500ms on slow devices. Phase 2 backend will
  eliminate this (server pushes only what user needs).
- React DevTools Profiler showed minor render churn on the SalesX dashboard
  from the targets/achievement live computation. Memoize in Phase 1.5.2.
- i18next dictionaries (en + hi) are statically imported (~25 KB combined,
  ungzipped). Phase 2 moves to lazy-loaded `/api/i18n/{locale}.json`.

## Measurement Methodology

- **Bundle:** `npm run build` output, observable in Lovable build log.
- **Lighthouse:** Deferred — Phase 1.5.2 QA environment.
- **React Profiler:** Manual interaction recording in dev mode (sampled).
- **localStorage:** `getStorageUsage()` from `storage-quota-engine.ts`
  (sprint h-b2 instrumentation).

Per-page Lighthouse audit on all 496 user-facing pages is Phase 1.5.2 work.

## Comparison vs Phase 0

Not applicable — Phase 1 is the initial production-grade build.
