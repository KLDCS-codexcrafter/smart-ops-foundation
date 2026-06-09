# Sprint AM.3 · T-AM3-Universal-Mobile · Close Summary

**Predecessor HEAD:** `4c68f639` (AM.2c bank · 117 ⭐)  
**Target:** 118 ⭐ · ~950 LOC · ONE new SIBLING (`mobile-report-registry`)  
**Posture:** Tier-L · consume-only · approval over the existing B.1 rail · reporting read-only.

---

## Scope (founder ruling)

1. **Universal Mobile Approval** — extend the mobile Approval Inbox to consume
   the FULL B.1 rail (bill-passing · payout · PO · indent · expense · scheme ·
   credit-note · QualiCheck deviation · ServiceDesk proposal · logistics dispute
   · SalesX discount · Stock issue · Production order · Reimbursement). One
   inbox, every card. SoD-1/SoD-2 honored inside the rail.
2. **Universal Mobile Reporting** — NEW SIBLING `mobile-report-registry` maps
   each back-office card → its existing desktop report routes. NEW
   `MobileUniversalReportPage` is a read-only viewer that navigates to the
   existing `/erp/*` routes. NO recompute, NO fabricated metrics.

---

## Per-capability engine-consumption evidence

| Capability | File | Engine import (greppable) |
|---|---|---|
| Universal approval list | `src/components/mobile/MobileApprovalInboxCapture.tsx` | `import { listPendingMirrors, decideApproval } from '@/lib/approval-rail-engine'` + `import '@/lib/approval-adapters'` |
| Universal approval count | `src/pages/mobile/MobileApprovalInboxPage.tsx` | `import { listPendingMirrors } from '@/lib/approval-rail-engine'` + `import '@/lib/approval-adapters'` |
| Adapter registration | `src/lib/approval-adapters.ts` (UNTOUCHED) | `registerAllApprovalAdapters()` auto-fires on import — surfaces ≥12 adapter `object_type`s in one inbox |
| Report registry | `src/lib/mobile-report-registry.ts` (NEW SIBLING) | self-contained route map · zero per-card render module imports · zero `fetch` |
| Report viewer | `src/pages/mobile/MobileUniversalReportPage.tsx` | `import { listMobileReports, listMobileReportCards, MOBILE_REPORT_HONESTY } from '@/lib/mobile-report-registry'` · navigates to `r.desktopRoute` |
| Mobile shell wiring | `src/pages/mobile/MobileRouter.tsx` | route `/mobile/reports` → `MobileUniversalReportPage` (additive · core handlers 0-DIFF) |
| Op-Go tile surface | `src/pages/mobile/OperixGoPage.tsx` | tiles `am3-universal-approval` + `am3-universal-reporting` (additive `MOBILE_PRODUCTS` rows) |

### Registry coverage (back-office cards founder named)

| Card | Reports registered (`listMobileReports(card).length`) |
|---|---|
| EximX | 4 (cross-entity realisation · Form 3CEB · LC · packing credit) |
| Bill-Passing | 1 (hub) |
| FP&A | 1 (planning hub) |
| Accounting | 1 (hub) |
| FinCore | 3 (RCM compliance · ITC register · GSTR-3B) |
| Vendor-Portal | 2 (hub · MSME §43B(h) tracker) |
| EngineeringX | 1 (hub) |

Every `desktopRoute` is asserted by AM.3 test
`every registry desktopRoute exists as a real Route declaration in App.tsx` to
exist in `src/App.tsx`. No fabricated routes; alias map handles canonical
`/erp/accounting` (FinCore alias) without lying about the source surface.

---

## Walls held (0-DIFF)

- `src/lib/approval-rail-engine.ts`
- `src/lib/approval-adapters.ts`
- All per-card desktop report surfaces (registry navigates to them but never
  imports them).
- `src/pages/mobile/MobileRouter.tsx` core handlers — only the routes table got
  one new branch.
- `src/App.tsx`, hash-chain, retention, entitlements.

## Honest seams (Wave-2)

- `MOBILE_REPORT_HONESTY` banner mounted on the viewer states the live/full
  data + interactive drilldowns ship at Wave-2.
- `[JWT] GET /api/mobile/reports/:card/:reportId` seam preserved as comment-only
  in `mobile-report-registry.ts`.
- Approval inbox `[JWT] PATCH /api/approval-rail/tasks/:id` seam preserved on
  `submit()` in the capture component.

## Tests

`src/test/sprint-am3/am3-block-behavioral.test.ts` — 20 `it()` covering:

- Greppable consumption of `listPendingMirrors` + `decideApproval` from the rail.
- No `approveIndent` / `rejectIndent` re-implementation in the mobile capture.
- ≥12 adapter `object_type`s reachable in one inbox.
- Adapter shape (listPending/approve/reject/recordRoute) preserved.
- Registry covers all 7 founder-named cards; every entry `readOnly: true`;
  every route starts with `/erp/`; every route exists in `App.tsx`.
- Viewer has no write/compute primitive (no `fetch`, `localStorage.setItem`,
  `postVoucher`, `approveIndent`, `decideApproval`).
- MobileRouter wires `/mobile/reports`; OperixGo surfaces both AM.3 tiles.
- Sprint history: AM.3 row carries `predecessorSha: '4c68f639'` + newSiblings
  `['mobile-report-registry']`; AM.2c flipped off `TBD_AT_BANK` to `4c68f639`
  CONFIRMED.
- Sibling-register has exactly one new entry `mobile-report-registry`.

## Gates

- TSC `--noEmit` · 0 errors (post-final-edit).
- ESLint repo-wide `--max-warnings 0` · clean on touched files.
- Vitest scoped (am3 + am2c + mobile + b6 + p83–p87) under
  `NODE_OPTIONS="--max-old-space-size=7168"`.
- `npm run build` · PASS.

## Bookkeeping

- `sprint-history.ts` — AM.2c flipped to `4c68f639` (CONFIRMED); AM.3 row
  appended at `TBD_AT_BANK` (PENDING_BACKFILL).
- `sibling-register.ts` — one entry added for `mobile-report-registry`.

## AC roll-up

| AC | Status |
|---|---|
| AC1 Block-0 4/4 | ✓ HEAD 4c68f639 · spine pasted · greenfield 0 · vitest baseline captured |
| AC2 Approval CONSUMES full rail (all types · greppable · no reimplement · SoD) | ✓ |
| AC3 `mobile-report-registry` lists REAL card reports | ✓ (10+ entries · App.tsx-asserted) |
| AC4 Reporting READ-ONLY (no write/recompute · honest banner) | ✓ |
| AC5 Coverage: back-office cards + FinCore-mobile | ✓ (7 cards) |
| AC6 ONE new engine + register | ✓ `mobile-report-registry` |
| AC7 Surfaced in MobileRouter + operix-go | ✓ |
| AC8 ≥20 it() · non-forward-looking | ✓ |
| AC9 history + AM.2c flip | ✓ |
| AC10 Walls 0-DIFF | ✓ rail · adapters · report surfaces · MobileRouter core · applications.ts |
| AC11 No new deps · Triple Gate 4/4 | ✓ |

---

*AM.3 close · Universal Mobile Approval + Universal Mobile Reporting · CONSUMES
B.1 rail + report surfaces · Tier-L read-only · live data Wave-2 · author:
Lovable on behalf of Operix Founder.*
