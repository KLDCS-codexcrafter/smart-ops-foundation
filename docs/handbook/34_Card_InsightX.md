# CARD DEEP-DIVE · INSIGHTX
## Operix Developer Handbook — Card Series

**Verified against:** registry `applications.ts` + card surfaces at freeze `c30f161`.
**Hub:** InsightX · **Route:** `/erp/insightx` · **Icon:** BarChart3 · **Registry id:** `insightx`

---

## 1. What it is / what it's for
Analytics + AI · Project Health, KPI engine, role dashboards (CEO/Production/Purchase/PM), rule-based AI alerts, action recommendations. Aggregates ALL Tier 1 cards data. Tier 1 #15 (LAST in chain).

## 2. Where it lives
- **Route:** `/erp/insightx`
- **Registry id:** `insightx` (in `src/components/operix-core/applications.ts`)
- **Hub / category:** InsightX
- **Source:** pages under `src/pages/erp/` and/or feature modules under `src/features/` matching this card.

## 3. Representative surfaces (verified samples)
- `InsightXPage`
- `InsightXFAStagingPanel`

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
*Card deep-dive · InsightX · verified at c30f161 · Operix Developer Handbook card series.*
