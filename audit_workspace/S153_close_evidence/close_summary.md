# Sprint 153 · EcomX Channel Foundation — CLOSE SUMMARY

Predecessor HEAD: `4af7cbdd` (S152.T4) · Target: 76 ⭐ · two-pass · gates LAST · ~1,450 LOC zone

## Disposition table (enumerate-or-fail · 1:1 to Blocks 0.1–9)

| # | Item | Status | Evidence (file:line) |
|---|------|--------|----------------------|
| 0.1  | applications.ts has the (formerly unicomm) entry | DELIVERED · rewritten to `ecomx` active | `src/components/operix-core/applications.ts:271-279` |
| 0.2  | CardId union renamed `unicomm`→`ecomx` | DELIVERED | `src/types/card-entitlement.ts:26` |
| 0.3  | `CARD_BASE_ROUTES` adds ecomx (single line per wall) | DELIVERED | `src/lib/breadcrumb-memory.ts:72` |
| 0.4  | seedDemoEntitlements + role default both add ecomx | DELIVERED | `src/lib/card-entitlement-engine.ts:64-…` + `src/types/card-entitlement.ts:63` (ROLE_DEFAULT_CARDS.sales) |
| 0.5  | S152.T3 buildCardRoute invariant + active⇒seed invariant green for ecomx | GREEN | `src/test/seed-entitlement-coverage.test.ts:148-170` (35 tests pass) |
| 0.6  | Order path imports mirror `webstorex-order-engine` (ordersKey · generateDocNo · fyForDate · logAudit) | DELIVERED · §H 0-DIFF on source engine | `src/lib/ecomx-engine.ts:18-25, 631, 655, 672, 677-682` |
| 0.7  | PIM CALL-ONLY (getStoreItem · listVariants) | DELIVERED | `src/lib/ecomx-engine.ts:21, 191, 194, 204, 599, 609` |
| 0.8  | Party surface CALL-ONLY (loadPartyMaster · findPartyByName · upsertParty) | DELIVERED | `src/lib/ecomx-engine.ts:22-24, 147, 149, 536, 569, 735` |
| 0.9  | Sibling-register N→N+1 with `ecomx-engine` | DELIVERED · 175→176 | `src/lib/_institutional/sibling-register.ts:480-481` |
| 0.10 | Clean tree + HEAD = `4af7cbdd` at sprint start | CONFIRMED | git log |
| 0.11 | S152 headSha backfill `'4af7cbdd'` | DELIVERED | `src/lib/_institutional/sprint-history.ts:923` (TBD_AT_BANK → 4af7cbdd) |
| 1    | 4-point rename ceremony (applications + union + CARD_BASE_ROUTES + seed/role-default) | DELIVERED | see 0.1–0.4 |
| 2    | `src/types/ecomx.ts` types verbatim | DELIVERED | `src/types/ecomx.ts:1-115` |
| 3    | `src/lib/ecomx-engine.ts` registry + listings + inbox + templates + parse + commit + resolveUnmatchedOrder + stats | DELIVERED | `src/lib/ecomx-engine.ts:1-821` (18 exports) |
| 4    | `resolveUnmatchedOrder` reuses shared booking path | DELIVERED | `src/lib/ecomx-engine.ts:724-785` |
| 5    | Active⇒seed + buildCardRoute invariants still green for ecomx | GREEN | 35 tests in seed-entitlement-coverage.test.ts |
| 6.1  | Pages tree under `src/pages/erp/ecomx/` (own shell-config + sidebar-config) | DELIVERED | `src/pages/erp/ecomx/EcomXPage.tsx` + `src/apps/erp/configs/ecomx-shell-config.ts` + `src/apps/erp/configs/ecomx-sidebar-config.ts` |
| 6.2  | No per-item requiredCards on sidebar (institutional parity) | DELIVERED | `src/apps/erp/configs/ecomx-sidebar-config.ts:15-24` (zero `requiredCards:`) |
| 6.3  | Module-switch shell (welcome · dashboard · marketplaces · listings · unmapped · import-center · orders) | DELIVERED | `src/pages/erp/ecomx/EcomXPage.tsx:24-34` |
| 6.4  | Import Center: marketplace picker → upload → parse-report triad → commit button → booking result | DELIVERED | `src/pages/erp/ecomx/import-center/EcomXImportCenterPage.tsx` |
| 6.5  | Orders register with layer/status tabs + Parked B2B resolution | DELIVERED | `src/pages/erp/ecomx/orders/EcomXOrdersPage.tsx` |
| 6 lazy route | `/erp/ecomx` lazy-imported in App.tsx | DELIVERED | `src/App.tsx:241-242, 651-653` |
| 7    | Mobile-honest at 380px (stack, no horizontal scroll) | DELIVERED | all 6 panels use `p-4 sm:p-6 md:p-10` + `grid-cols-1` defaults + `overflow-x-auto` only on tables |
| 8    | `src/test/sprint-153/ecomx.test.ts` ≥32 it() | DELIVERED · **39 it() pass** including idempotency + parked-no-voucher | `src/test/sprint-153/ecomx.test.ts` |
| 9    | This close summary | DELIVERED | this file |

## CardId-union touched-file list (TSC was the net)

Only one file required the union rename itself (`src/types/card-entitlement.ts:26`).
All downstream consumers route through that union; the rename ceremony's other 3 points
(applications.ts catalog · CARD_BASE_ROUTES · seed/role-default) are the only additional
files touched. Lazy route added in `src/App.tsx`. Sibling register updated in
`src/lib/_institutional/sibling-register.ts`. New types in `src/types/ecomx.ts`.
New engine in `src/lib/ecomx-engine.ts`. New shell pages under `src/pages/erp/ecomx/`
and configs under `src/apps/erp/configs/ecomx-*`. New tests under
`src/test/sprint-153/ecomx.test.ts`.

## §H 0-DIFF walls (verified clean)

| File | Status |
|------|--------|
| `src/lib/webstorex-order-engine.ts` | 0-DIFF (pattern copied, helpers imported · NEVER edited) |
| `src/lib/webstorex-engine.ts`       | 0-DIFF (CALL-ONLY: getStoreItem, listVariants) |
| `src/lib/webstorex-commerce-engine.ts` | 0-DIFF |
| `src/lib/party-master-engine.ts`    | 0-DIFF (CALL-ONLY: loadPartyMaster, findPartyByName, upsertParty) |
| `src/lib/fincore-engine.ts`         | 0-DIFF (CALL-ONLY: generateDocNo, fyForDate) |

## FR-44 reuse table

| Reused surface | Source | EcomX call site |
|----------------|--------|-----------------|
| `ordersKey`, `Order`, `OrderLine` | `@/types/order` | engine line 18-19 |
| `generateDocNo`, `fyForDate` | `@/lib/fincore-engine` | line 20 |
| `getStoreItem`, `listVariants` | `@/lib/webstorex-engine` | line 21 |
| `loadPartyMaster`, `findPartyByName`, `upsertParty` | `@/lib/party-master-engine` | line 22-24 |
| `logAudit` | `@/lib/audit-trail-engine` | line 25 |
| `Shell`, `ShellConfig`, `SidebarItem` | `@/shell` | shell-config + page |
| `useCardEntitlement` | `@/hooks/useCardEntitlement` | page |
| `useEntityCode` | `@/hooks/useEntityCode` | all 6 panels |

## Idempotency proof (test-anchored)

`src/test/sprint-153/ecomx.test.ts` · "IDEMPOTENCY: re-commitImport adds ZERO orders + ZERO vouchers":
parse → commit (1 booked) → commit again → `booked === 0 && parked === 0 && skippedDuplicates === 0`
AND `ordersKey` row count unchanged AND `ecOrdersKey` row count unchanged.

Cross-import dedupe is also covered by "dedupe across imports: same marketplace_order_id from a
fresh import is skipped" (`skippedDuplicates === 1`).

## Parked-B2B no-voucher assertion (test-anchored)

`src/test/sprint-153/ecomx.test.ts` · "B2B UNMATCHED: GSTIN miss → parked, soVoucherId null,
NO voucher in ordersKey": asserts `ec.layer === 'b2b_unmatched'`, `ec.soVoucherId === null`,
`ec.status === 'parked_unmatched'`, AND `JSON.parse(localStorage.getItem(ordersKey(ENT))).length === 0`.

## Sibling count

175 → **176** (added `ecomx-engine` at `src/lib/_institutional/sibling-register.ts:480-481`).

## Gates · LAST · real outputs

```
$ rg -n "useMemo\([^)]*=>[^}]*\b(Date\.now|new Date)\b" src/lib/ecomx-engine.ts src/pages/erp/ecomx/ src/test/sprint-153/
(no matches — tick-grep clean)

$ NODE_OPTIONS="--max-old-space-size=7168" npx tsc --noEmit
(exit 0 · no errors)

$ npx eslint . --max-warnings 0
(exit 0 · repo-wide clean)

$ npx vitest run src/test/sprint-153/ src/test/seed-entitlement-coverage.test.ts
 ✓ src/test/seed-entitlement-coverage.test.ts (35 tests) 17ms
 ✓ src/test/sprint-153/ecomx.test.ts (39 tests) 39ms
 Test Files  2 passed (2)
      Tests  74 passed (74)
```

**New HEAD** — TBD_AT_BANK
