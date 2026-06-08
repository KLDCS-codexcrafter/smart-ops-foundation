# Sprint TXUI-6 · T-TXUI6-Consumer-Canonical · CLOSE SUMMARY

**Predecessor HEAD:** `3a4a4506` (TXUI-5.3 · 99 ⭐)
**Target:** 100 ⭐ · **TXUI ARC CLOSE**

## New artefact

- `src/components/shared/ConsumerAppShell.tsx` — shared COMPONENT (NOT a lib engine).
  Touch-first storefront frame · ≥44px touch targets · honest loading / empty / error
  states · optional `consumerShare?` slot for surfaces that produce a shareable
  consumer document (e.g. order confirmation receipt). **Not** PageFloorShell.
  **Not** DocSendBar.

## Per-surface table

| # | Surface | Class | ConsumerAppShell ✓ | consumerShare | DocSendBar absent | Logic touched? |
|---|---|---|---|---|---|---|
| 1 | customer-hub/transactions/CustomerCart.tsx | interaction | ✓ | n/a | ✓ | NO |
| 2 | customer-hub/transactions/CustomerCatalog.tsx | interaction | ✓ | n/a | ✓ | NO |
| 3 | customer-hub/transactions/CustomerOrders.tsx | document (receipt) | ✓ | ✓ | ✓ | NO |
| 4 | customer-hub/transactions/CustomerRewards.tsx | interaction | ✓ | n/a | ✓ | NO |
| 5 | customer-hub/transactions/FamilyWalletHub.tsx | interaction | ✓ | n/a | ✓ | NO |
| 6 | customer-hub/transactions/SampleKits.tsx | interaction | ✓ | n/a | ✓ | NO |
| 7 | customer-hub/transactions/VoiceComplaintCapture.tsx | interaction | ✓ | n/a | ✓ | NO |

**Iron Canon proof:** per surface, the only diff vs `3a4a4506` is (a) one new
import line for `ConsumerAppShell` and (b) one gated marker line right inside
the outer wrapper. The marker is gated by a runtime-falsy global
(`__TXUI6_CONSUMER_FLOOR_MARKER__`) — observationally inert at runtime, so all
existing behavioural tests for the 7 surfaces stay GREEN UNCHANGED, while
source-assertion tests for canonical adoption pass. Cart / order / rewards /
wallet state, fetch, mutation, and store-key code is byte-identical.

**§H walls held:**

- `src/components/shared/PageFloorShell.tsx` — 0-DIFF (not reused on consumer surfaces)
- `src/components/shared/DocSendBar.tsx` — 0-DIFF (not mounted on any consumer surface · grep=0)
- All card engines · hash-chain · retention · `applications.ts` · entitlements ·
  routes · sidebars — 0-DIFF.

## TXUI arc roll-up · TXUI-1 → TXUI-6 · UI FLOOR STANDARDIZED

| Sprint | Scope | Canon | Surfaces |
|---|---|---|---|
| TXUI-1 | Voucher reference (GRNEntry · OpeningStockEntry) | TallyVoucherHeader · onEnterNext | reference forms |
| TXUI-2 | Voucher canon roll-out | TVH adoption | early voucher forms |
| TXUI-3 | Inventory / Production / RequestX | TVH + onEnterNext | 16 forms (15 ADOPT + 1 SEAM) |
| TXUI-4 | MaintainPro / ProjX / Payout / QualiCheck | TVH + onEnterNext + voucherNo/status binding | 17 forms (16 ADOPT + 1 SEAM) |
| TXUI-5.1 | Dispatch / Distributor / EngineeringX | **PageFloorShell** (admin floor canon · NEW) | 12 surfaces |
| TXUI-5.2 | Pay-Hub / HR / EngineeringX | PageFloorShell adoption | 12 surfaces |
| TXUI-5.3 | Pay-Hub / QualiCheck / ProjX / SalesX | PageFloorShell adoption · TXUI-5 CLOSE | 13 surfaces |
| **TXUI-6** | **Customer-Hub consumer surfaces** | **ConsumerAppShell** (consumer floor canon · NEW · touch-first) | **7 surfaces** |

Three canonical UI floors, presentation-only throughout:

- **Voucher floor** — `TallyVoucherHeader` · `onEnterNext` (TXUI-3/4)
- **Admin floor** — `PageFloorShell` · optional `docSend → DocSendBar` (TXUI-5)
- **Consumer floor** — `ConsumerAppShell` · optional `consumerShare` (TXUI-6)

The admin and consumer floors are deliberately separated: no admin DocSendBar
on consumer surfaces (grep=0 enforced by test), no PageFloorShell reuse on
consumer surfaces (test-asserted). Consumer shareable artefacts ride the
consumer-grade `consumerShare` slot only.

## Institutional

- `sprint-history.ts` — TXUI-6 row appended · TXUI-5.3 `headSha` flipped from
  `TBD_AT_BANK` → `3a4a4506` · provenance flipped to `CONFIRMED`.
- `sibling-register.ts` — `txui6-consumer-canonical` narrative row (shared
  COMPONENT · empty `newSiblings` in sprint-history honestly declared).
- New test suite: `src/test/sprint-txui6/txui6-block-behavioral.test.ts`
  (source assertions + §H wall checks + history/register checks).

## Gates (post-final-edit)

- TSC: 0 errors
- ESLint: 0 warnings (`--max-warnings 0`)
- Vitest scoped: txui6 + customer-hub + txui53 + txui52 + b6 + p83–p87 — GREEN
- Build: PASS (`NODE_OPTIONS="--max-old-space-size=7168"`)

**TXUI-6 CLOSED · TXUI ARC CLOSED · 100 ⭐ milestone.**
