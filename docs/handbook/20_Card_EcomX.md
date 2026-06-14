# CARD DEEP-DIVE · ECOMX
## Operix Developer Handbook — Card Series

**Verified against:** registry `applications.ts` + card surfaces at freeze `c30f161`.
**Hub:** Sales Hub · **Route:** `/erp/ecomx` · **Icon:** Store · **Registry id:** `ecomx`

---

## 1. What it is / what it's for
Marketplace commerce hub · Amazon/Flipkart/Meesho/quick-commerce listings · order-file ingestion → SalesX vouchers · settlement reconciliation (194-O TDS · GST-TCS) · claims recovery. MOAT #12.

## 2. Where it lives
- **Route:** `/erp/ecomx`
- **Registry id:** `ecomx` (in `src/components/operix-core/applications.ts`)
- **Hub / category:** Sales Hub
- **Source:** pages under `src/pages/erp/` and/or feature modules under `src/features/` matching this card.

## 3. Representative surfaces (verified samples)
- `EcomXSettlementsPage`
- `EcomXImportCenterPage`
- `ecomx-orders-page`

(This is a representative sample, not the exhaustive list — explore the card's folder for all panels, registers and reports.)

## 4. How it fits the architecture
- **Masters come from Command Center** (the SSOT) — this card renders replicas, it does not independently own platform masters.
- **Logic lives in engines** (`src/lib/*.ts`); pages are thin and resolve the active company via `useEntityCode()` at top level.
- **Backend seams** are marked `[JWT]` throughout — Wave-2 swaps localStorage for `/api/*` without changing call sites.

## 5. Header / sidebar / profile in context
Renders inside the full ERP shell: the two-row `ERPHeader` (date · FY badge · Ctrl+K search · app launcher · notifications · Dishani · profile) and the hub-grouped `AppSidebar`. Breadcrumb reflects the card and sub-page. The active **entity** scopes all data.

## 6. Track notes
- **General:** Sales card — order-to-cash flows feed Fin Core; customer/distributor masters come from Command Center.
- **Frontend:** add panels/registers thin; logic in engines; mark `[JWT]` seams.
- **Backend (Wave-2):** build this card's `/api/*` endpoints to its OpenAPI contract; server-enforce entity isolation.
- **Mobile:** if this card has a `Mobile*` surface (see §3), keep parity; capture/approval flows are the common mobile pattern.

## 7. Gotchas
- Never hardcode the entity — use `useEntityCode()` (top level). A repo-wide guard enforces this across pages/components/features.
- No synthetic data on rendered surfaces — real reads or honest empty state.
- Money math via decimal helpers; never `Math.round` on currency.
- Consume existing engines; don't rebuild logic another card already owns (no-duplicity rule).

---
*Card deep-dive · EcomX · verified at c30f161 · Operix Developer Handbook card series.*
