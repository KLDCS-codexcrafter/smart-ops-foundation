# CARD DEEP-DIVE · EXIMX
## Operix Developer Handbook — Card Series

**Verified against:** registry `applications.ts` + card surfaces at freeze `c30f161`.
**Hub:** International Trade · **Route:** `/erp/eximx` · **Icon:** Globe · **Registry id:** `eximx`

---

## 1. What it is / what it's for
International trade · 19 moats v10 LOCKED · IEC + LUT workflow + Replayable Landed Cost + TDL Gaps Atlas + Dual Exchange Rate + Buyer Reliability + FEMA 270-day · 3 sub-modules (Export · Import · Unified) · Tier 1 #14.

## 2. Where it lives
- **Route:** `/erp/eximx`
- **Registry id:** `eximx` (in `src/components/operix-core/applications.ts`)
- **Hub / category:** International Trade
- **Source:** pages under `src/pages/erp/` and/or feature modules under `src/features/` matching this card.

## 3. Representative surfaces (verified samples)
- `EximXImportLayout`
- `EximXExportLayout`
- `EWSDashboard`

(This is a representative sample, not the exhaustive list — explore the card's folder for all panels, registers and reports.)

## 4. How it fits the architecture
- **Masters come from Command Center** (the SSOT) — this card renders replicas, it does not independently own platform masters.
- **Logic lives in engines** (`src/lib/*.ts`); pages are thin and resolve the active company via `useEntityCode()` at top level.
- **Backend seams** are marked `[JWT]` throughout — Wave-2 swaps localStorage for `/api/*` without changing call sites.

## 5. Header / sidebar / profile in context
Renders inside the full ERP shell: the two-row `ERPHeader` (date · FY badge · Ctrl+K search · app launcher · notifications · Dishani · profile) and the hub-grouped `AppSidebar`. Breadcrumb reflects the card and sub-page. The active **entity** scopes all data.

## 6. Track notes
- **General:** Follow the standard engine/hook/page separation and entity-scoping rules.
- **Frontend:** add panels/registers thin; logic in engines; mark `[JWT]` seams.
- **Backend (Wave-2):** build this card's `/api/*` endpoints to its OpenAPI contract; server-enforce entity isolation.
- **Mobile:** if this card has a `Mobile*` surface (see §3), keep parity; capture/approval flows are the common mobile pattern.

## 7. Gotchas
- Never hardcode the entity — use `useEntityCode()` (top level). A repo-wide guard enforces this across pages/components/features.
- No synthetic data on rendered surfaces — real reads or honest empty state.
- Money math via decimal helpers; never `Math.round` on currency.
- Consume existing engines; don't rebuild logic another card already owns (no-duplicity rule).

---
*Card deep-dive · EximX · verified at c30f161 · Operix Developer Handbook card series.*
