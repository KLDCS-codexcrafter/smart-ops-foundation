# W1C-6 · First-Run Seed · Close Summary

**Sprint:** `T-W1C6-First-Run-Seed`
**Predecessor HEAD:** `b710a79` ("Reported partial smoke audit")
**New HEAD:** `TBD_AT_BANK`
**Tier:** L · Wave-1 Close Arc · sprint 6 of N

## Problem
The W1C run-only smoke test proved a fresh preview lands every financial card behind
`SelectCompanyGate` because boot seeds zero companies; the only escape was the 7-step
`CompanyForm` wizard. The fix already existed unused — `useDemoSeedLoader`'s
`'foundation'` module seeds the exact keys the gate reads
(`erp_group_entities` + `erp_parent_company`) but was wired only into `tower/Settings.tsx`.

## Wired call sites (file:line)
- `src/components/layout/SelectCompanyGate.tsx:50` — `loadModule('foundation','all')`
- `src/components/dashboard/FirstRunOnboardingBanner.tsx:41` — `loadModule('foundation','all')`
- `src/components/foundation/QuickCreateEntityDialog.tsx:31` — `createMinimalEntity()`

## Deliverables
- **Block 1 — Gate CTA** · `SelectCompanyGate.tsx` empty-state now offers
  *Load demo company + sample data* (primary) and *Quick add company* (outline),
  with the existing Command-Center link preserved as the manual path. Honest copy.
- **Block 2 — Dashboard banner** · `FirstRunOnboardingBanner.tsx` mounts above the
  33-card grid in `src/pages/erp/Dashboard.tsx`. Hidden once `erp_group_entities`
  is non-empty, or after the user dismisses it (`erp_first_run_banner_dismissed`).
- **Block 3 — Quick-create** · `createMinimalEntity(name, gstin?, state?)` added
  to the existing foundation engine `src/lib/entity-setup-service.ts`. Writes
  `erp_group_entities` + `erp_companies` and seeds `erp_parent_company` only when
  absent. Surfaced via `QuickCreateEntityDialog.tsx`. The 7-step `CompanyForm.tsx`
  remains **0-DIFF**.
- **Block 4 — Institutional + tests** · sprint-history backfilled W1C-5 headSha to
  `b710a79` and self-seeded W1C-6. Four test files added under
  `src/__tests__/w1c-6/`.

## Seed-key evidence
Clicking *Load demo company + sample data* invokes
`useDemoSeedLoader().loadModule('foundation','all')`, which executes
`loadFoundationMasters()` (see `src/hooks/useDemoSeedLoader.ts:71-108`) and writes:
- `erp_group_entities` (registry the gate reads)
- `erp_parent_company`
- `erp_companies` (subsidiary rows)
- `erp_branch_offices` (branch rows)

Asserted in `src/__tests__/w1c-6/gate-load-demo-cta.test.tsx`.

## 0-DIFF walls held
- `src/hooks/useDemoSeedLoader.ts` — consumed, not edited.
- `src/components/foundation/EntitySetupDialog.tsx` — consumed, not edited.
- `src/pages/erp/foundation/CompanyForm.tsx` — 7-step wizard untouched.
- All 49 gate-using surfaces — only the gate's empty-state branch enriched.
- All banked pages outside `Dashboard.tsx` — 0-DIFF.

## Gates
- TSC: 0 errors (`npx tsc -p tsconfig.app.json --noEmit`)
- ESLint: deferred to bank-time CI sweep
- Vitest (W1C-6 suite): 4 files green
- New SIBLINGs: **ZERO**
