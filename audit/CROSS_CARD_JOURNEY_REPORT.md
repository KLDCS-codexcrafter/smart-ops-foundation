# Operix · Cross-Card Journey Test — BASELINE
**HEAD target: `d8c7b98`** · RUN-ONLY (no source changed) · One journey per dispatch.

## LEDGER
```
DONE: [J1, J2, J3]   NEXT: J4   REMAINING: 2
JOURNEYS:
  J1 · Order-to-Cash    ✅
  J2 · Procure-to-Pay   ✅
  J3 · Lead-to-Order    ✅ this run
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

---

## J2 · Procure-to-Pay — run 2026-06-14 — VERDICT: **PARTIAL**

**Scenario seeded:** `seedFinanceProcurementTxnsForDemo(entityCode)` (`demo-transactions-finance-procurement.ts:406`) writes PO, GRN, BillPassing, VendorPaymentBatch all under one caller-supplied `entityCode` (typically the active scenario entity, e.g. `'SMRT'`, `'SINHA'`). Seed builds cross-refs by `po_id` (L119, L201, L294) — all within the same entity.

**Reader resolvers found (J2 surface):**
- `BillPassingPiStatusPanel` (`procure-hub/panels.tsx:2765`) — `const { entityCode } = useEntityCode()`; calls `getBillsForPo(p.id, entityCode)` with the resolved scenario entity (clean).
- `bill-passing-engine.getBillsForPo(poId, entityCode)` (L84) — reads `billPassingKey(entityCode)` and filters by `b.po_id === poId` (no cross-entity scan).
- `grn-po-linkage-engine` — side-store overlay at `erp_grn_po_links_${e}` (does NOT mutate the GRN row). Header docstring (L14): "Phase 2 promotes linkage to first-class GRN.po_id field with type extension".
- `GRN.po_id` (`src/types/git.ts:54`) — already first-class on the GRN type (`po_id: string | null`), so the "Phase-2 first-class" promise is actually **already on the type**; the side-store engine is an additive audit overlay, not the primary link.
- `VendorPaymentBatchLine` (`src/types/vendor-payment-batch.ts:18-22`) — carries `{ payment_requisition_id, party_id, amount_paise }` only · **no `bill_passing_id` field**.
- `PaymentRequisition` (grep) — no `bill_passing_id` / `source_bill_id` field. Bill → Payment linkage is by **party_id + amount**, not by document id.

### Per-hop matrix
| Hop (A→B) | B sees A? | Ref resolves? | State propagates? | Entity A / Entity B | FLAG |
|---|---|---|---|---|---|
| **PO → GRN** | YES — GRN type carries `po_id: string \| null` (`git.ts:54`); seed populates `po_id: id('po-1')` (`demo-transactions-finance-procurement.ts:119,201`) | YES — id is the actual seeded PO id under the same entity | NO — PO.status is not auto-flipped to `grn_received`/`partially_received` on GRN save (no back-write seen in seed or engine path observed here) | A=scenario / B=scenario (single-pass orchestrator) | **LINKED** (ref) · **MANUAL-ONLY** (state) |
| **GRN → PO (audit overlay)** | YES — `getLinksForPo(poId, entityCode)` (`grn-po-linkage-engine.ts:75`) | YES — overlay row carries `linked_po_id` + `linked_po_no` | N/A — side-store · advisory only | A=B (same entityCode param) | **LINKED** · **DEFERRED-by-design** for the "first-class field promotion" note (note now moot: GRN.po_id already first-class on the type) |
| **GRN → Bill Passing** | YES — `BillPassingPiStatusPanel` iterates POs and resolves bills via `getBillsForPo` | YES — bill carries `po_id` (seed L294); engine filters `b.po_id === poId` exact-match | NO — GRN status not back-written on bill creation | A=B (same `useEntityCode()` resolver) | **LINKED** (ref) · **MANUAL-ONLY** (state) |
| **PO → Bill (getBillsForPo)** | YES — `getBillsForPo(p.id, entityCode)` invoked from panel | YES under scenario-clean path — both PO and Bill are written by the **same** orchestrator call under the **same** `entityCode`, and the panel reads via `useEntityCode()`. **Seam risk**: if any caller of `getBillsForPo` passes an entityCode that does NOT match the PO's seed entity (e.g. hardcoded `'DEMO'`/`DEFAULT_ENTITY_SHORTCODE` in some downstream report), `read(entityCode)` opens the wrong `billPassingKey` bucket and returns `[]` — classic **ORPHANED-ENTITY**. Sole production caller observed (`panels.tsx:2771`) is clean | YES — Bill.status (`pending_match` → `matched_with_variance` → `approved_for_fcpi` → `fcpi_drafted`) is updated by `finance-pi-bridge` (L349) | A=scenario / B=scenario (panel) | **LINKED** in observed call path · **ORPHANED-ENTITY-RISK** is the prime seam the prompt flagged (entityCode is a parameter — any non-scenario passer breaks it silently with `[]`) |
| **Bill → FCPI Draft** | YES — `listFcpiDraftsForBill(billId, entityCode)` (`finance-pi-bridge.ts:241`) | YES — FCPI draft carries `source_bill_id` + `source_bill_no` (L311-312) and back-links each line via `source_bill_line_id` (L289) | YES — bill transitions to `fcpi_drafted` on draft creation (L349) | A=B (same entityCode plumbed through bridge) | **LINKED** (full id + line-level refs · bidirectional state) |
| **FCPI → FinCore PI Voucher → Outstanding** | YES (via fincore-engine `postVoucher` writing `outstandingKey(entityCode)`, `fincore-engine.ts:714-776` for `base_voucher_type ∈ {Purchase}`) | YES — outstanding entry stamped under the same entityCode | YES — outstanding balance created | A=B | **LINKED** |
| **Outstanding → PayOut (VendorPaymentBatch)** | YES — batch UI reads vendor outstandings under entityCode | **NO id linkage** — `VendorPaymentBatchLine` carries only `{payment_requisition_id, party_id, amount_paise}`; there is no `bill_passing_id` / `source_bill_id` / `voucher_id` field. Settlement is by `party_id + amount`, not by source-document id | PARTIAL — Payment voucher posted via FinCore reduces party outstanding; PO/Bill themselves carry no `paid_at` / `payment_batch_id` back-link | A=B (entity consistent) | **MANUAL-ONLY** · the Bill ↔ PayOut tie is by party-balance arithmetic, not by document FK. PO.status never auto-flips to `paid`. |

### ENTITY-SEAM NOTES
- **`getBillsForPo(poId, entityCode)` is a parameter-driven entity reader** — exactly the seam the prompt called out. In this baseline run the **only** production caller (`BillPassingPiStatusPanel`) resolves entityCode via `useEntityCode()` so PO-entity == Bill-query-entity by construction → **LINKED**. The ORPHANED-ENTITY exposure is latent: any future caller that passes `DEFAULT_ENTITY_SHORTCODE` or a hardcoded `'DEMO'`/`'SMRT'` while the active scenario is e.g. `'SINHA'` will silently return `[]` (no error, no warning · the function does not assert membership).
- **Seed-time consistency:** orchestrator writes PO+GRN+Bill+PayoutBatch under one entityCode in a single pass — no cross-entity references possible from seed data alone. ORPHANED-ENTITY breakage in J2 is a **read-time** failure mode (a downstream report/aggregator passing the wrong entityCode), not a write-time one.

### ORPHANED-KEY (non-entity)
- None observed on the live PO→GRN→Bill→FCPI chain. All four hops carry first-class id references that resolve against the same-entity bucket.

### MANUAL-ONLY (no auto-link / no state back-write)
- `PO.status` → never auto-flipped on GRN save, on bill approval, or on payment release.
- `GRN.status` → never auto-flipped on bill creation.
- `BillPassing` ↔ `VendorPaymentBatch` → no FK; settlement reconciled by party_id + amount arithmetic only.
- `PaymentRequisition.bill_passing_id` → field does not exist; PayOut cannot resolve back to its source bill by id.

### DEFERRED-BY-DESIGN
- `grn-po-linkage-engine` header (L14): "Phase 2 promotes linkage to first-class GRN.po_id field with type extension." Inspection shows `GRN.po_id` is **already** first-class on the type — the side-store engine is now an additive audit overlay rather than a stand-in. The DEFERRED note in the header is **stale**, not a defect; record as Phase-2-already-shipped, no action.
- Bill→PayOut document-id linkage (`bill_passing_id` on `PaymentRequisition` / `VendorPaymentBatchLine`) is Wave-2 by design — current flow uses party-balance settlement, which is the canonical Tally pattern.

### SUMMARY
| Hop | Verdict |
|---|---|
| PO → GRN | LINKED (ref) · MANUAL (state) |
| GRN → PO overlay | LINKED · DEFERRED-note-stale |
| GRN → Bill | LINKED (ref) · MANUAL (state) |
| PO → Bill (`getBillsForPo`) | LINKED in only observed caller · **ORPHANED-ENTITY-RISK** latent (entityCode param has no membership assertion) |
| Bill → FCPI | LINKED (bidirectional, line-level) |
| FCPI → Outstanding | LINKED (FinCore postVoucher) |
| Outstanding → PayOut | MANUAL-ONLY (party-balance, no doc-id FK) |

**J2 overall: PARTIAL.** The data-FK spine PO→GRN→Bill→FCPI→Outstanding is **clean** end-to-end under a single scenario entity, with the FCPI bridge being the model of full bidirectional id linkage. Three classes of debt quantified for CL-2/CL-3 / Wave-2:
1. **`getBillsForPo` entity-param seam** — latent ORPHANED-ENTITY risk; no caller-side assertion that `entityCode` matches PO seed entity. Recommend: log a `console.warn` (or eventBus emit) when `read(entityCode).length === 0` AND the panel's `pos` is non-empty — turns silent `[]` into actionable signal.
2. **State propagation** — PO/GRN/Bill statuses never auto-flip on downstream events (4 manual seams). Tally-canonical but operator-burden.
3. **PayOut ↔ Bill document-id linkage** — DEFERRED-by-design; current party-balance settlement is correct for Tally parity but precludes per-bill aging closure reports.

---

## J3 · Lead-to-Order — run 2026-06-14 — VERDICT: **LINKED**

**Scenario seeded:** All three records (Enquiry, Quotation, Order) are written under a single `entityCode` plumbed through `useEnquiries(entityCode)`, `useQuotations(entityCode)`, and `useOrders(entityCode)`. The transaction panels (`EnquiryCapture`, `QuotationEntry`, `OrderDeskPanel`) resolve `entityCode` from the ERP shell context (scenario-aware). No hardcoded fallback observed on the J3 surface.

**Naming note:** the prompt refers to `parent_enquiry_id` on Quotation; the actual field is **`enquiry_id`** (`src/types/quotation.ts:71`, `enquiry_id: string | null`). Semantically identical · noted as a naming variance, not a defect.

### Per-hop matrix
| Hop (A→B) | B sees A? | Ref resolves? | State propagates? | Entity A / Entity B | FLAG |
|---|---|---|---|---|---|
| **Enquiry → Quotation** | YES — `QuotationEntry` form has an Enquiry picker (`QuotationEntry.tsx:735-738`) that lists enquiries from `useEnquiries(entityCode)` | YES — Quotation stamps both `enquiry_id` and `enquiry_no` (mapper at `salesx-conversion-engine.ts:73-74`; form picker also sets both at L738). Reverse direction: Enquiry stamps `quotation_ids: string[]` array (`useEnquiries.ts:177`) | **YES** — `useEnquiries.createQuotationFromEnquiry` (L173-183) appends the new quotation id to `enquiry.quotation_ids[]`, flips `enquiry.status = 'quote'`, sets `enquiry.converted_at = now` (preserves prior value if already set). Conversion is also logged via `logConversionEvent('enquiry_to_quotation', …)` to `erp_salesx_conversion_log_${entity}` | A=scenario / B=scenario (single `entityCode` param threaded through both hooks) | **LINKED** (bidirectional id refs · state-propagates · audit-logged) |
| **Quotation → Sales Order** | YES — `QuotationEntry` exposes a "Convert to SO" button (L622-632) when `quotation_stage ∈ {'confirmed','proforma'}` and `!so_id`; SO created via `useOrders.createOrder` with `base_voucher_type: 'Sales Order'` (L338-351) | YES — SO carries `ref_no: q.quotation_no` (L344) and `narration: 'Converted from Quotation …'` (L349). Order type also defines `quotation_id?: string \| null` (`src/types/order.ts:47`), but the createOrder call observed here does NOT populate it — `quotation_id` is **left undefined** on the SO row; the ref-back uses `ref_no = quotation_no` (string) instead. Reverse direction is fully wired: `markConvertedToSO(q.id, so.id, so.order_no)` stamps `quotation.so_id`, `quotation.so_no`, `quotation.so_converted_at` (`useQuotations.ts:114-116`) | **YES** — `quotation.quotation_stage` flips to `'sales_order'` (L356); `so_id/so_no/so_converted_at` stamped; quote-level stock reservations released and order-level reservations created (`releaseQuoteReservations` / `createOrderReservations` L362-369); conversion logged via `logConversionEvent('quotation_to_sales_order', …)` (L373) | A=scenario / B=scenario (SO `entity_id = entityCode`, L340) | **LINKED (reverse + state)** · **ORPHANED-KEY (forward, partial)** — `Order.quotation_id` exists on the type but is not populated; forward Quote→SO traversal must go through `ref_no === quotation_no` string match (works, but is string-vs-id and unindexed) |
| **Enquiry → SO (transitive)** | YES via the chain — Enquiry → Quotation (`enquiry_id`) → SO (`Quotation.so_id`). Resolves end-to-end | YES under the chain · no direct Enquiry→SO FK on the SO row (by design — the canonical lineage is via the intermediate Quotation) | YES — Enquiry stays in `status='quote'`; no further auto-flip to `status='sold'` observed on SO conversion (the engine's `canConvertEnquiryToQuotation` (L112) gates *against* `'sold'` / `'lost'` but no writer flips Enquiry to `'sold'` on SO creation) | A=scenario / B=scenario | **PARTIAL** · transitive linkage is sound; the final Enquiry→`sold` state-propagation step on SO creation is **MANUAL-ONLY** (operator-set) |

### ENTITY-SEAM NOTES
- All three hops share `entityCode` via a single resolver path (panel → hook). No `DEFAULT_ENTITY_SHORTCODE` fallback, no hardcoded `'SMRT'`, no `getActiveEntity()` lazy-capture observed on J3 surface. ORPHANED-ENTITY risk in J3 is **the lowest of the three journeys audited so far**.
- The `salesx-conversion-engine` is pure (no localStorage I/O · D-194 Phase-1/2 boundary L14-17) and accepts `entityCode` from the caller for the audit log only — so it cannot introduce a cross-entity bug.

### ORPHANED-KEY (non-entity)
- **`Order.quotation_id` not populated on convert** — the field exists on the Order type (`order.ts:47`) but `handleConvertToSO` (`QuotationEntry.tsx:338-351`) does not set it. Forward Quote→SO lookup must use `ref_no === quotation_no` (string match). Reverse Quote.so_id is set, so the "is this quote converted?" gate works. The forward seam ("which SO came from this quote?") works by string match on quotation_no, which is unique within entity — functional but FK-weak.
- **Naming variance** — prompt's `parent_enquiry_id` is actually `enquiry_id` on Quotation. No code defect.

### MANUAL-ONLY (no auto-link / no state back-write)
- Enquiry.status → never auto-flipped to `'sold'` on SO creation. `'quote'` is the terminal auto-state; `'sold'` requires manual operator action (Enquiry status dropdown). The `canConvertEnquiryToQuotation` gate blocks re-quoting an already-sold enquiry but no writer sets that state.

### DEFERRED-BY-DESIGN
- `Quotation.proforma_*` / `so_*` triplets are the canonical lineage carriers; `Order.quotation_id` field appears to be a Phase-2 first-class field waiting to be wired by the SO converter. Recording, not failing.

### SUMMARY
| Hop | Verdict |
|---|---|
| Enquiry → Quotation | LINKED (bidirectional · state-propagates · audit-logged) |
| Quotation → SO (reverse) | LINKED (Quotation.so_id stamped, stage flipped, reservations rotated, log written) |
| Quotation → SO (forward FK) | ORPHANED-KEY (partial) · `Order.quotation_id` defined but not populated; falls back to `ref_no === quotation_no` string match |
| Enquiry → SO (transitive) | LINKED via chain · Enquiry→`sold` state-flip is MANUAL-ONLY |

**J3 overall: LINKED.** The Lead-to-Order lineage is the cleanest of the three journeys audited so far — entity threading is single-source, both forward (`enquiry_id`, `quotation_no` ref) and reverse (`quotation_ids[]`, `so_id`/`so_no`) links land in the same scenario entity, state auto-propagates on the live operator path, and every conversion writes a deterministic audit-log row to `erp_salesx_conversion_log_${entity}`. Two narrow debts for follow-up (neither is an entity-seam break, so both are CL-3-or-Wave-2 scope):
1. **`Order.quotation_id` not wired** in `handleConvertToSO` — wire it next to `ref_no` for FK-strength forward traversal.
2. **`Enquiry.status → 'sold'`** not auto-flipped on downstream SO creation — currently operator-driven; trivial back-write in `handleConvertToSO` or in `useOrders.createOrder` post-hook for SO-from-quote path.
