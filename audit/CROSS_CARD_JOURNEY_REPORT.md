# Operix · Cross-Card Journey Test — BASELINE
**HEAD target: `066eca4`** · RUN-ONLY (no source changed) · One journey per dispatch.

## LEDGER
```
DONE: [J1, J2]   NEXT: J3   REMAINING: 3
JOURNEYS:
  J1 · Order-to-Cash    ✅
  J2 · Procure-to-Pay   ✅ this run
  J3 · Lead-to-Order    ⏳
  J4 · Quality-gate     ⏳
  J5 · Aggregation      ⏳
```

---

## J1 · Order-to-Cash — run 2026-06-14 — VERDICT: **PARTIAL**

**Scenario seeded:** Demo orchestrator (`seedSalesXDemoFor(entityCode)`) writes all SO/SRM/DM under a single caller-supplied `entityCode` (e.g. `'SMRT'` for the default Smart-Power blueprint, or `'SINHA'` etc. for scenario blueprints). All J1 transaction registers read with their own `entityCode` resolver (see column "Entity B" below) — so the seam is whether **scenario entity == reader entity**.

**Reader resolvers found (J1 surface):**
- `SupplyRequestMemo` form & `DeliveryMemoEntry` form & `InvoiceMemo` form — receive `entityCode` via `Props` from the shell (live, scenario-aware).
- `SRMRegister`, `DeliveryMemoRegister`, `InvoiceMemoRegister` — `useCardEntitlement().entityCode || 'SMRT'` (hard fallback `'SMRT'` · seam suspect when scenario ≠ SMRT and entitlement context unresolved).
- Seeded demo SRMs (`DEMO_SUPPLY_REQUEST_MEMOS`) have **`sales_order_id: null`** — only `sales_order_no` is populated. SO→SRM by id is **broken in seed data**; works only when an operator creates an SRM live and picks a SO (form path stamps both `sales_order_id` and `sales_order_no` · `SupplyRequestMemo.tsx:238-239`).

### Per-hop matrix
| Hop (A→B) | B sees A? | Ref resolves? | State propagates? | Entity A / Entity B | FLAG |
|---|---|---|---|---|---|
| **SO → SRM** | YES — SRM form reads `useOrders(entityCode)` and shows SO pick-list (`SupplyRequestMemo.tsx:131`) | LIVE-PATH: YES (`sales_order_id` + `sales_order_no` both stamped). SEEDED-PATH: **NO** — `DEMO_SUPPLY_REQUEST_MEMOS[*].sales_order_id = null`; only `sales_order_no` carried | NO — Order.status is **not** flipped to `acknowledged`/`fulfilled` when an SRM is raised (no back-write found) | A=scenario entityCode / B=scenario entityCode (same) | **PARTIAL** · live=LINKED · seed=ORPHANED-KEY (id null by design) · state-propagation=MANUAL-ONLY |
| **SRM → DM** | YES — DM form reads `supplyRequestMemosKey(entityCode)` pick-list (`DeliveryMemoEntry.tsx:135`) | YES — DM stamps `supply_request_memo_id` + `supply_request_memo_no` (form L210-211); seeded `DEMO_DELIVERY_MEMOS` references `srm-demo-2` which exists in `DEMO_SUPPLY_REQUEST_MEMOS` | PARTIAL — SRM.status flip to `dispatching`/`dispatched` exists in type (`SRM_STATUS_LABELS`) but the DM submit path was not observed to write SRM back (no `updateSRMStatus` call seen in DM form) | A=scenario / B=scenario (same · form prop) | **LINKED** (ref) · **MANUAL-ONLY** (state propagation) |
| **DM → IM (Sales Invoice)** | YES — IM form reads `deliveryMemosKey(entityCode)` pick-list (`InvoiceMemo.tsx:164`) | YES — IM stamps `supply_request_memo_id/no` from DM and back-derives `sales_order_id/no` via SRM lookup (L262-265). Chain `IM → DM → SRM → SO` resolves end-to-end on live path | NO — DM.status does NOT auto-flip to `invoiced` on IM save (no engine call seen) | A=scenario / B=scenario (same · form prop) | **LINKED** (ref chain) · **MANUAL-ONLY** (state propagation) |
| **IM → Receipt (clear outstanding)** | N/A — Receipt voucher clears by **party balance**, not by invoice ref. `InvoiceMemo` does NOT call `postVoucher` and writes **no outstanding entry** (no `outstandingKey` write found in `InvoiceMemo.tsx` or any `invoice-memo-engine`) | NO — IM rows never enter `erp_outstanding_${e}`; only `postVoucher(Sales)` writes outstanding (`fincore-engine.ts:714-776`). A Receipt voucher posted against the same party reduces party balance, but there is **no `invoice_id` linkage** | NO — IM does not carry `outstanding_balance` or `paid_at` fields; status remains as set by IM workflow independent of Receipt | A=scenario (IM) / B=scenario (Voucher engine — same entityCode) | **MANUAL-ONLY** · IM is a salesx-side document; financial settlement runs in FinCore via a separately-posted Sales Voucher. Not auto-bridged in baseline. |

### ENTITY-SEAM NOTES
- **Predicted break (registers' `'SMRT'` fallback):** `SRMRegister` / `DeliveryMemoRegister` / `InvoiceMemoRegister` all use `useCardEntitlement().entityCode || 'SMRT'`. If the orchestrator seeded under a non-SMRT scenario entity (e.g. `'SINHA'`, `'ABDOS'`) **and** the entitlement context resolves to empty/different at first paint, the register reads from `erp_*_SMRT` and shows nothing — classic **ORPHANED-ENTITY**. In current run both seed and read default to the same scenario when the scenario IS SMRT; for non-SMRT scenarios this is the documented CL-2 fix target.
- **Form-path is clean:** the three transaction forms accept `entityCode` via Props from the ERP shell, so live data entry inside one panel session is internally consistent — the seam is at the **register read** layer (and at any cross-card hop that does not re-thread the same entityCode).

### ORPHANED-KEY (non-entity)
- `DEMO_SUPPLY_REQUEST_MEMOS[*].sales_order_id = null` by design (only `sales_order_no` is seeded). SO→SRM resolves by **number string**, not id, on seeded data. Live operator path stamps both.

### MANUAL-ONLY (no auto-link / no state back-write)
- SO.status → never auto-flipped by SRM creation.
- SRM.status → never auto-flipped by DM creation.
- DM.status → never auto-flipped by IM creation.
- IM → Outstanding/Receipt → not bridged in salesx; settlement runs only via a separately-posted FinCore Sales voucher that ties to `party_id` (not `invoice_id`).

### DEFERRED-BY-DESIGN
- Three-Memo system (SRM/DM/IM) explicitly defers FinCore posting to a separate operator action (architectural note: "IM created live" in `demo-seed-orchestrator.ts:228`). Auto-posting from IM to a Sales Voucher is a Wave-2 bridge, not a baseline defect.

### SUMMARY
| Hop | Verdict |
|---|---|
| SO → SRM | PARTIAL (seed=ORPHANED-KEY · live=LINKED · state=MANUAL) |
| SRM → DM | LINKED (ref) · MANUAL (state) |
| DM → IM | LINKED (ref chain) · MANUAL (state) |
| IM → Receipt | MANUAL-ONLY / DEFERRED-by-design |

**J1 overall: PARTIAL.** Document-ref linkage on the live operator path is intact end-to-end through DM→IM→SO via the SRM bridge. Three classes of debt are quantified for CL-2/CL-3 / Wave-2:
1. Register-layer `'SMRT'` fallback (entity seam · ORPHANED-ENTITY risk for non-SMRT scenarios).
2. Seeded SRM rows with `sales_order_id=null` (ORPHANED-KEY in demo data only).
3. No state-back-propagation across the four hops (MANUAL-ONLY).
4. IM ↔ Outstanding/Receipt not bridged (DEFERRED-by-design).
