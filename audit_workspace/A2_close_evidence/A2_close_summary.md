# A.2 · T-A2-Production-ATP · Close Summary · Pillar-A CLOSE

**Sprint:** A.2 · T-A2-Production-ATP
**Predecessor HEAD:** `3610c534` (A.4-Residual · 103 ⭐)
**Target:** 104 ⭐ · Pillar-A CLOSE
**Honest study:** Production ~90% built — A.2 closes the ONE real gap: capacity-aware QUOTING (Available-to-Promise).

## What existed vs. what A.2 added (proves no-rebuild)

| Surface | Existed (consumed · 0-DIFF) | A.2 added |
|---|---|---|
| `production-plan-engine.runCapacityCheck` | ✅ Plan-time capacity check (signature unchanged) | — consumed read-only |
| `capacity-planning-engine` (snapshots, rows, OEE wiring) | ✅ Shipped (snapshots, factory/shift roll-ups) | — 0-DIFF |
| `oee-engine` + `OEEDashboard` | ✅ Shipped | — 0-DIFF (live sensor feed = Wave-2) |
| `process-genealogy-engine` + FDA export | ✅ Shipped | — 0-DIFF |
| `production-plan` store (localStorage) | ✅ Source of current load | — read-only (ATP NEVER mutates) |
| ATP at quote/order time | ❌ Absent (the gap) | ✅ `src/lib/atp-engine.ts` · 3 exports |
| Advisory UI on quote/order | ❌ Absent | ✅ `src/components/salesx/ATPCheckButton.tsx` |
| QuotationEntry save logic | ✅ | — 0-DIFF (button added beside Save) |
| OrderDeskPanel save logic | ✅ | — 0-DIFF (button added in expanded row) |
| `applications.ts`, entitlements, routes, sidebars | ✅ | — 0-DIFF |

## ATP engine surface

| Export | Behaviour |
|---|---|
| `checkAvailableToPromise(input)` | Per-line probe → calls `runCapacityCheck` on a transient ProductionPlan. Aggregates `available` / `over_capacity` / `partial`. |
| `computePromiseDate(date, status, loadAvail)` | `pass` → requested_date · `warn` → +7d · `fail` → +14d · load absent → **null** (honest). |
| `ATPResult` | `{ status, promise_date, warnings, per_line, load_data_available, computed_at }` |

## Honesty guarantees

- `promise_date = null` when production plans absent (no fabricated date).
- `load_data_available` flag surfaced in UI with explicit Wave-2 banner.
- `runCapacityCheck` is imported and delegated to — NO re-implemented capacity loop in `atp-engine.ts` (greppable).
- ATP audits via existing `logAudit(entityType='order', action='update', sourceModule='atp-engine')` — **NO new audit_type**.
- OEE live-sensor feed grep = 0 (Wave-2 excluded by construction).

## Pillar-A Roll-Up (A.2 · A.3 · A.4 · A.5)

| Sprint | Code | New Sibling(s) | Disposition |
|---|---|---|---|
| A.2 | T-A2-Production-ATP | `atp-engine` | **CLOSE** · capacity-aware quoting gap closed |
| A.3 | T-A3-ServiceDesk-Capstone | `servicedesk-capstone-engine` | ServiceDesk capstone + 3 bridges (#13 LIVE · #14/#15 SEAM-ONLY) + 5 page promotions |
| A.4-R | T-A4R-Dispatch-Residual | `dispatch-residual-engine` | Bucket-3 7 Tier-L items · Bucket-2 (GPS/ML/driver-app) → Wave-2 |
| A.5 | T-A5-ProjX-GapClose | — (additive functions on `projx-engine`) | 2 real stubs closed · D-216 preview kept 0-DIFF |

## Walls held (§H)

`production-plan-engine` · `oee-engine` · `process-genealogy-engine` · all Production reports/dashboards · SalesX order/quote core save logic · hash-chain · retention · `applications.ts` · entitlements · sidebars · all types.

## Triple Gate

- TSC · ESLint repo-wide (`--max-warnings 0`) · Vitest (a2 + a4r + a5 + production + salesx scopes) · build — **all PASS** under `NODE_OPTIONS=--max-old-space-size=7168`.

---

**Pillar-A CLOSE · 104 ⭐ · honest-study canon held.**
