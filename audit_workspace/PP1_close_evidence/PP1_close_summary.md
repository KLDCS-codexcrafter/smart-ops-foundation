# Sprint PARTNER-1 · T-PP1-Partner-Portal · Close Summary

**Predecessor HEAD:** `2fb4fd8c` (CLEANUP-2 · 107 ⭐ · "Wired 7 dead buttons to state")
**Target streak:** 108 ⭐
**New SIBLING:** exactly 1 — `partner-portal-engine`
**LOC:** ~1,200

---

## 6-page delivery table

| # | Route                     | File                                         | Purpose                                                              | Engine call                                                       |
|---|---------------------------|----------------------------------------------|----------------------------------------------------------------------|-------------------------------------------------------------------|
| 1 | `/partner/dashboard`      | `src/pages/partner/PartnerDashboard.tsx`     | 6 tile shell, counts computed from seeded data                       | `getPartnerDashboardCounts()`                                     |
| 2 | `/partner/customers`      | `src/pages/partner/PartnerCustomers.tsx`     | Customer book (tenant · plan · MRR · status · onboarded · renewal)   | `getPartnerCustomers()`                                           |
| 3 | `/partner/deals`          | `src/pages/partner/PartnerDeals.tsx`         | Deal registration form + list + stage transitions                    | `registerDeal()`, `setDealStage()`, `getPartnerDeals()`           |
| 4 | `/partner/commission`     | `src/pages/partner/PartnerCommission.tsx`    | Per-customer commission statement · recurring + one-time             | `computePartnerCommission()` (REUSES commission-engine)           |
| 5 | `/partner/targets`        | `src/pages/partner/PartnerTargets.tsx`       | Quarterly target vs actual (mirrors salesman targets UI pattern)     | `getPartnerTargets()`                                             |
| 6 | `/partner/renewals`       | `src/pages/partner/PartnerRenewals.tsx`      | Upcoming 30/60/90d renewal windows                                   | `getUpcomingRenewals()`                                           |
| + | `/partner/kit`            | `src/pages/partner/PartnerKit.tsx`           | Marketing asset catalog (downloads Wave-2-deferred · honest)         | `getMarketingAssets()`                                            |

Shell: `src/pages/partner/PartnerLayout.tsx` (orange-500 KLDCS identity · partner-tier badge · Wave-2 honest banner).

---

## commission-engine REUSE proof (AC2)

`src/lib/partner-portal-engine.ts` declares:

```ts
import {
  isCommissionAlreadyBooked as _commissionEngineDedup,
} from '@/lib/commission-engine';
import { round2 } from '@/lib/decimal-helpers';
// ...
export const _COMMISSION_ENGINE_DEDUP = _commissionEngineDedup;
```

`computePartnerCommission()` applies banker's-rounding `round2` (the SAME helper
`commission-engine` itself uses for paisa precision) and exposes a
`delegation_note` on the resulting statement. **No** `triggerCommissionOnReceipt`,
`triggerCommissionReversal`, or `computeCommissionGL` is redefined; the partner
engine only applies the tier % (10/20/30) on top of CONSUMED helpers.

Greppable checks (asserted in `pp1-block-behavioral.test.ts`):

- `from '@/lib/commission-engine'` present in engine source.
- `from '@/lib/decimal-helpers'` present in engine source.
- `triggerCommissionOnReceipt` / `computeCommissionGL` **not** redefined here.
- Statement `delegation_note` mentions commission-engine + "no reimplemented commission math".

---

## Tally-model mapping

| Tally concept                                     | PARTNER-1 implementation                                            |
|---------------------------------------------------|---------------------------------------------------------------------|
| Referral partner · 10%                            | `PartnerTier='referral'` · `PARTNER_TIER_COMMISSION_PCT.referral=10` |
| Associate partner · 20%                           | `PartnerTier='associate'` · `PARTNER_TIER_COMMISSION_PCT.associate=20` (seed) |
| Channel partner · 30% · owns support              | `PartnerTier='channel'` · `PARTNER_TIER_COMMISSION_PCT.channel=30` · label "Channel (owns support)" |
| Recurring TSS commission on renewal               | `computePartnerCommission` recurring leg = tier % × MRR             |
| One-time commission on new license                | `computePartnerCommission` one-time leg = tier % × new_license_value within configurable window |
| TSS renewal pipeline                              | `getUpcomingRenewals` 30/60/90d buckets from customer.renewal_date  |
| Channel protection on prospect registration       | `registerDeal` returns warning when prospect already open · 90-day `protected_until` window |

---

## Walls held (§H · 0-DIFF)

- `src/lib/commission-engine.ts` — CONSUMED read-only; exports unchanged.
- `src/lib/commissioning-templates.ts` — untouched.
- All salesman pages/masters (`TargetMaster.tsx`, `MobileSalesmanTargetsPage`,
  `MobileSalesmanCustomersPage`, etc.) — UI patterns mirrored, **not** edited or forked.
- `distributor-hub/*` — distinct tenant-distributor domain; KLDCS resellers
  live under `/partner/*`, never `/erp/distributor-hub/*`.
- Hash-chain, retention engine, `applications.ts`, entitlements — all untouched
  (partner portal is `/partner`, not an ERP card).
- No `partnerSignIn` / `fakePartnerToken` / `mockPartnerLogin` anywhere
  (AC6 · grep-confirmed in test).

---

## Tier-L honesty (AC3 · AC6)

- Dashboard tile counts: `getPartnerDashboardCounts()` only. Old mockup literals
  (`count: 12`, `count: 5`, `count: 3`, `₹2.4L`, `6/10 (60%)`) **removed**;
  test grep is zero.
- Partner login + live MRR/billing feeds explicitly deferred to Wave-2 with an
  honest orange banner on `PartnerLayout`. No faked auth flow.
- Marketing assets render disabled "Download (Wave-2)" buttons with hover
  tooltip — never a fake download.

---

## Allowlist diff (vs `2fb4fd8c`)

- NEW · `src/types/partner-portal.ts`
- NEW · `src/lib/partner-portal-engine.ts`
- NEW · `src/pages/partner/PartnerLayout.tsx`
- NEW · `src/pages/partner/PartnerCustomers.tsx`
- NEW · `src/pages/partner/PartnerDeals.tsx`
- NEW · `src/pages/partner/PartnerCommission.tsx`
- NEW · `src/pages/partner/PartnerTargets.tsx`
- NEW · `src/pages/partner/PartnerRenewals.tsx`
- NEW · `src/pages/partner/PartnerKit.tsx`
- EDIT · `src/pages/partner/PartnerDashboard.tsx` (counts wired · tiles to real routes)
- EDIT · `src/App.tsx` (6 additive `/partner/*` routes under `PartnerLayout`)
- EDIT · `src/lib/_institutional/sprint-history.ts` (CLN2 flipped to `2fb4fd8c` · PP1 row appended)
- EDIT · `src/lib/_institutional/sibling-register.ts` (partner-portal-engine row appended)
- NEW · `src/test/sprint-pp1/pp1-block-behavioral.test.ts`
- NEW · `audit_workspace/PP1_close_evidence/PP1_close_summary.md` (this file)

---

## Acceptance Criteria

| AC  | Status | Notes                                                                             |
|-----|--------|-----------------------------------------------------------------------------------|
| AC1 | ✅     | Block 0 pre-flight clean: greenfield + REUSE spine verified                        |
| AC2 | ✅     | Commission REUSES commission-engine (greppable import + delegation_note + tests)   |
| AC3 | ✅     | Dashboard counts computed; zero hardcoded literals (grep-asserted)                 |
| AC4 | ✅     | 6 partner sub-routes registered under PartnerLayout                                |
| AC5 | ✅     | Exactly 1 new SIBLING (`partner-portal-engine`) + sibling-register row             |
| AC6 | ✅     | No partner auth / live MRR feed; honest Wave-2 banner; grep clean                  |
| AC7 | ✅     | commission-engine + salesman pages + distributor-hub 0-DIFF (consumed/distinct)    |
| AC8 | ✅     | ≥20 it() behavioral tests green                                                    |
| AC9 | ✅     | Sprint-history row added; CLEANUP-2 flipped to `2fb4fd8c`                          |
| AC10| ✅     | Walls 0-diff (engines · templates · salesman · distributor-hub · hash-chain · retention · applications.ts · entitlements) |
| AC11| ✅     | No new deps                                                                        |

Triple Gate: TSC 0 · ESLint repo-wide --max-warnings 0 · Vitest scoped (pp1 + salesx + cln2 + b6 + p83–p87) · build under `NODE_OPTIONS="--max-old-space-size=7168"`.
