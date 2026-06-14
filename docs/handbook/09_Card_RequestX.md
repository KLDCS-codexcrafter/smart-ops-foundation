# CARD DEEP-DIVE · REQUESTX
## Operix Developer Handbook — Card Series

**Verified against:** registry `applications.ts` + card surfaces at freeze `c30f161`.
**Hub:** Ops Hub · **Route:** `/erp/requestx` · **Icon:** ClipboardList · **Registry id:** `requestx`

---

## 1. What it is / what it's for
Internal request hub · material indents, service requests, capital indents · 11 indent categories · 3-tier approval matrix. Feeds Procure360 PO creation.

## 2. Where it lives
- **Route:** `/erp/requestx`
- **Registry id:** `requestx` (in `src/components/operix-core/applications.ts`)
- **Hub / category:** Ops Hub
- **Source:** pages under `src/pages/erp/` and/or feature modules under `src/features/` matching this card.

## 3. Representative surfaces (verified samples)
- `RequestXWelcome`
- `ServiceRequestEntry`
- `MobileRequestXIndentPage`

(This is a representative sample, not the exhaustive list — explore the card's folder for all panels, registers and reports.)

## 4. How it fits the architecture
- **Masters come from Command Center** (the SSOT) — this card renders replicas, it does not independently own platform masters.
- **Logic lives in engines** (`src/lib/*.ts`); pages are thin and resolve the active company via `useEntityCode()` at top level.
- **Backend seams** are marked `[JWT]` throughout — Wave-2 swaps localStorage for `/api/*` without changing call sites.

## 5. Header / sidebar / profile in context
Renders inside the full ERP shell: the two-row `ERPHeader` (date · FY badge · Ctrl+K search · app launcher · notifications · Dishani · profile) and the hub-grouped `AppSidebar`. Breadcrumb reflects the card and sub-page. The active **entity** scopes all data.

## 6. Track notes
- **General:** Operations card — physical-goods flows; mind single-door/dispatch canon and cross-card master replicas from Command Center.
- **Frontend:** add panels/registers thin; logic in engines; mark `[JWT]` seams.
- **Backend (Wave-2):** build this card's `/api/*` endpoints to its OpenAPI contract; server-enforce entity isolation.
- **Mobile:** if this card has a `Mobile*` surface (see §3), keep parity; capture/approval flows are the common mobile pattern.

## 7. Gotchas
- Never hardcode the entity — use `useEntityCode()` (top level). A repo-wide guard enforces this across pages/components/features.
- No synthetic data on rendered surfaces — real reads or honest empty state.
- Money math via decimal helpers; never `Math.round` on currency.
- Consume existing engines; don't rebuild logic another card already owns (no-duplicity rule).

---
*Card deep-dive · RequestX · verified at c30f161 · Operix Developer Handbook card series.*
