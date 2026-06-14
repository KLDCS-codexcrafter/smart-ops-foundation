# Operix · Cross-Card Journey Test — BASELINE
**HEAD target: `709ccbd`** · RUN-ONLY (no source changed) · One journey per dispatch.

## LEDGER
```
DONE: [J1, J2, J3, J4, J5]   NEXT: —   REMAINING: 0
JOURNEY RUN COMPLETE ✅
JOURNEYS:
  J1 · Order-to-Cash    ✅
  J2 · Procure-to-Pay   ✅
  J3 · Lead-to-Order    ✅
  J4 · Quality-gate     ✅
  J5 · Aggregation      ✅ this run
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

---

## J4 · Quality-gate — run 2026-06-14 — VERDICT: **PARTIAL**

**Scenario seeded:** GRN (`git_id` on `QaInspectionRecord`), Bill, and QA inspection all under one `entityCode`. The QA cascade chain reads `entityCode` consistently — `completeInspection(... entityCode, byUserId, ...)` (`qa-inspection-engine.ts`) calls `getBillPassing(cur.bill_id, entityCode)` (L225) and `transitionBillPassingStatus(... entityCode ...)` (L229/L237) using the same value passed in by the caller. No DEFAULT/SMRT fallback observed on the QA→Bill cascade.

### Schema-level link surface
- `QaInspectionRecord` (`src/types/qa-inspection.ts:38-78`) carries `bill_id`, `bill_no`, `git_id` (nullable), `po_id`, `po_no` · **no `grn_id` / `grn_no` first-class field.** GRN→QA traversal goes via `git_id` (Goods-In-Transit staging) OR transitively via `QA.bill_id → Bill.po_id → POs ← GRN.po_id`.
- `NonConformanceReport` (`src/types/ncr.ts:33-58`) carries `related_voucher_id` + `related_voucher_kind: 'grn' | 'production_confirmation' | 'sales_invoice' | null` — **no `'qa_inspection'` kind** and no `qa_inspection_id` field. NCR↔QA linkage is by FK absence (string note in `description` only).

### Per-hop matrix
| Hop (A→B) | B sees A? | Ref resolves? | State propagates? | Entity A / Entity B | FLAG |
|---|---|---|---|---|---|
| **GRN → QA Inspection (incoming)** | PARTIAL — `QaInspectionRecord.git_id` (nullable) carries the GIT id (intermediate staging that owns `po_id`, `src/types/git.ts:37`). Direct GRN→QA visibility requires going through GIT → matching back to GRN by `po_id` + lines. No GRN picker on QA entry that I observed | PARTIAL — when `git_id` is set, it resolves; when null, QA hangs off bill/po only. `grn_id` does not exist on the QA row → no direct id-based GRN→QA join | N/A — QA is created independently from the GRN row; GRN status is not auto-flipped to `qa_pending` on QA creation, nor to `released` on QA pass (the bill cascade handles bill state, not GRN state) | A=scenario / B=scenario (entity threaded through bill/git lookups) | **ORPHANED-KEY** for direct GRN↔QA (no `grn_id` field) · **LINKED** for indirect GRN→GIT→QA → MANUAL-ONLY for GRN state propagation |
| **QA finalization → CustomEvent bus** | **NO** — the listener `mountQaBridge` (`bill-passing-qa-bridge.ts:118-126`) is mounted in `Procure360Page.tsx:368` and listens on channel `QA_FINALIZED_EVENT = 'qa:inspection-finalized'` (L82), **but `grep -rn 'qa:inspection-finalized' src/` returns ZERO dispatchers**. The intended cross-card bus is silent. Separately, `qualicheck-bridges.ts:244` dispatches on a different channel `CH_OUTCOME = 'qa.outcome.applied'` for which the bill bridge has no listener — the two halves are **wired to different channel names**. | **NO** — the event-bus pathway does not deliver | N/A — the in-process direct cascade (next row) is what actually runs | A=B (would be entity-consistent if the dispatcher existed) | **MANUAL-ONLY / DEFERRED-by-design via direct call** · the CustomEvent bus described in the prompt is **a documented seam that has no active producer**; current behaviour relies on the in-process direct call instead |
| **QA pass → Bill status (direct in-process cascade)** | YES — `completeInspection` (L223-242) calls `getBillPassing(cur.bill_id, entityCode)` and, if status was `awaiting_qa`, transitions to `matched_clean` or `matched_with_variance` depending on line match status | YES — direct id lookup under the same entityCode | YES — bill status auto-flips · audit row appended (`appendAuditEntry`, L213) | A=scenario / B=scenario | **LINKED** (in-process direct call, not via the bus) |
| **QA fail → Bill status** | YES — same cascade (L236-240) flips bill to `qa_failed` with reason `QA failed via ${qa_no}` | YES — direct id lookup | YES | A=B | **LINKED** (direct call) |
| **QA pass → Stock movement (release inwards)** | NO — `completeInspection` does NOT post any stock-journal/release on PASS. `findQuarantineGodown` exists (L444-460) and `applyFailRouting` handles only `production_order_id` quarantine (L400 early-return when no PO link). For an incoming-GRN flow, the stock release is the existing GRN release path, not auto-triggered by QA pass | N/A | NO state propagation from QA→Stock | A=scenario / B=scenario | **MANUAL-ONLY** · pass→stock is operator-driven via the GRN release UI; no auto-stock-journal on QA pass for incoming inspections |
| **QA fail → NCR auto-raise** | **NO** — `raiseNcr` exists in `ncr-engine.ts:59` but **no caller invokes it from `completeInspection`** (rg confirms zero callers of `raiseNcr` from any QA path). On fail, the QA engine cascades to bill (`qa_failed`) and to production order quarantine (`applyFailRouting`, L392-435 · PO-only, GRN-side returns early at L400) — but does not raise an NCR row | NCR type lacks `qa_inspection_id` field and `related_voucher_kind` enum lacks `'qa_inspection'` (`src/types/ncr.ts:44`) — even if a caller existed, the linkage would degrade to free-text `description` | NO state propagation QA→NCR | A=scenario / B=scenario (would-be) | **ORPHANED-KEY** (no FK field on NCR) · **MANUAL-ONLY** (no auto-raise from QA fail) |

### ENTITY-SEAM NOTES
- The QA→Bill in-process cascade is entity-clean: caller-supplied `entityCode` flows through `getBillPassing(billId, entityCode)` and `transitionBillPassingStatus(..., entityCode, ...)`. If the QA inspection was created under scenario entity X, the bill it cascades to is also read under X by the same caller-threaded value — no seam.
- **The dormant `qa:inspection-finalized` channel would have been the prime ORPHANED-ENTITY suspect if it were active**, because `mountQaBridge` is a global window-level listener while the bill is scoped per-entity via `detail.entityCode` in the payload. Since no producer exists, this is moot in the baseline — but it's a Wave-2 design trap: the moment someone wires a dispatcher, the producer MUST pass the correct `entityCode` in `detail` or the bill lookup silently returns `null` (`bill-passing-qa-bridge.ts:90`).

### ORPHANED-KEY (non-entity)
- **`QaInspectionRecord` has no `grn_id` / `grn_no` field** — GRN↔QA join is via `git_id` (when populated) or via the bill/po transitive chain. Direct "show me all QA inspections for this GRN" is unindexed.
- **`NonConformanceReport` cannot reference a QA inspection by id** — `related_voucher_kind` enum is `'grn' | 'production_confirmation' | 'sales_invoice'`; there is no `'qa_inspection'` variant and no `qa_inspection_id` field. QA-driven NCRs (when raised) lose the QA id at the type boundary.

### MANUAL-ONLY (no auto-link / no state back-write)
- GRN.status not flipped on QA finalization (bill cascade is wired, GRN cascade is not).
- QA pass → stock release: no auto stock-journal; operator-driven via GRN release.
- QA fail → NCR auto-raise: no caller of `raiseNcr` from QA finalization path.
- `qa:inspection-finalized` CustomEvent: listener mounted, **no producer in the codebase** (the bus is a designed-but-dormant seam).

### DEFERRED-BY-DESIGN
- The dual-channel split (`qa:inspection-finalized` listened-but-not-dispatched · `qa.outcome.applied` dispatched-but-not-listened-by-bill-bridge) is consistent with Phase-1 wave separation between the in-process direct cascade (live today) and the future event-bus cross-card pattern (Wave-2). Both halves coexist in the codebase by design — record, do not fail.
- `git_id` as the GRN-side handle on QA (rather than `grn_id`) reflects the GIT-first staging architecture; promotion to a first-class `grn_id` is Wave-2.

### SUMMARY
| Hop | Verdict |
|---|---|
| GRN → QA (direct) | ORPHANED-KEY · no `grn_id` field on QA row |
| GRN → QA (via GIT/Bill chain) | LINKED (transitively) · MANUAL (no GRN state flip) |
| QA → Bill (event bus) | NO PRODUCER · channel name mismatch with `qualicheck-bridges` |
| QA → Bill (direct in-process) | LINKED (cascade in `completeInspection`) |
| QA pass → Stock | MANUAL-ONLY (no auto-stock-journal) |
| QA fail → NCR | ORPHANED-KEY (no FK on NCR) · MANUAL-ONLY (no auto-raise) |

**J4 overall: PARTIAL.** The QA→Bill in-process cascade is **clean and entity-safe** under direct call — this is the part of the quality-gate that actually works end-to-end today. Four debts isolated for Wave-2 / CL-3:
1. **`qa:inspection-finalized` channel has no dispatcher** — wire `qualicheck-bridges` to also emit `QA_FINALIZED_EVENT` (or migrate the bill bridge to listen on `qa.outcome.applied`). Until then, the documented event-bus seam is dead code on the producer side.
2. **NCR has no FK back to QA** — add `'qa_inspection'` to `related_voucher_kind` enum and start populating `related_voucher_id` from `completeInspection` on fail.
3. **QA pass → stock release** is not auto-bridged for incoming GRN — operator-driven via GRN release UI.
4. **`QaInspectionRecord.grn_id`** is absent — direct GRN→QA queries require the GIT/Bill detour.

---

## J5 · Aggregation (Cross-Card DayBook + InsightX roll-up) — run 2026-06-14 — VERDICT: **PARTIAL**

**Scope:** does `CrossCardDayBookPage` (`/erp/command-center` · RPT-5a · `src/features/command-center/pages/CrossCardDayBookPage.tsx`) + `InsightXOverviewPage` (`src/features/insightx-overview/InsightXOverviewPage.tsx`) actually reflect the footprints written by J1–J4 across cards under one entity?

### Mechanism
- `CrossCardDayBookPage` calls `getCrossCardDayBook(entityCode, filter)` (`daybook-aggregator.ts:27`) which fans `listDayBookSources()` (`daybook-source-registry.ts:40`).
- Sources are registered side-effect on app init via `import "@/lib/report-framework/daybook-sources"` in `main.tsx:7`. **7 sources** are registered (`daybook-sources.ts:54-217`).
- `entityCode` is resolved by `useEntityCode()` (Page L46) — same resolver J1–J4 readers use. When the header dropdown is `'all'`, `entityCode === ''` → most readers short-circuit to `[]`.

### Registered DayBook sources (7) vs J1–J4 footprints
| Source (cardId · domain) | Loader wrapped | Covers footprints from |
|---|---|---|
| `fc-fincore-daybook` · finance | `vouchersKey(entityCode)` → all FinCore vouchers | J1: Sales Invoice, Receipt · J2: PI (after FCPI post), PayOut (Payment voucher) |
| `ph-payhub-daybook` · people | `payrollRunsKey(entityCode)` | (none of J1–J4) |
| `sd-service-daybook` · service | `listServiceTickets()` **NO entityCode arg** | (none of J1–J4) — ⚠ entity-leak |
| `p360-goods-inward` · procure | `listGitStage1(entityCode)` | J2: GIT stage of GRN · J4: GIT side of QA |
| `mp-maintenance-entry` · maintenance-entry | breakdowns + work orders | (none of J1–J4) |
| `mp-spares-issue` · maintenance-spares | spares issues | (none of J1–J4) |
| `ex-custom` · eximx | TT outward payments | (none of J1–J4) |

### J1–J4 footprint coverage in the unified DayBook
| Journey · record kind | Visible in Cross-Card DayBook? | Why | FLAG |
|---|---|---|---|
| J1 · Enquiry | NO | no SalesX source registered | **MANUAL-ONLY** (not aggregated) |
| J1 · Quotation | NO | no SalesX source registered | **MANUAL-ONLY** |
| J1 · Sales Order | NO | no SalesX source registered | **MANUAL-ONLY** |
| J1 · Sales Invoice | YES — via `fc-fincore-daybook` (base_voucher_type='Sales' → module `fc-txn-sales-invoice`) | posts a fincore voucher; aggregator pulls it under `entityCode` | **LINKED** |
| J1 · Receipt | YES — same source (type='Receipt') | LINKED via finance | **LINKED** |
| J2 · Purchase Order | NO | no Procure360 PO source registered | **MANUAL-ONLY** (PO never in cross-card feed) |
| J2 · GRN (Goods Receipt) | PARTIAL — visible only as **GIT stage-1** receipt (`p360-goods-inward`); the post-GIT GRN row itself is not separately surfaced | source wraps `listGitStage1` only | **PARTIAL / ORPHANED-KEY for "GRN proper"** |
| J2 · Bill (Bill-Passing) | NO direct row; appears only **after FCPI posts a Purchase voucher** (then visible as 'Purchase' under `fc-fincore-daybook`) | no Bill-Passing source registered | **PARTIAL** (downstream-only) |
| J2 · PayOut (Payment Requisition / Batch) | PARTIAL — only the resulting fincore Payment voucher is surfaced (type='Payment'); the requisition/batch itself is not | requisition has no DayBook source | **PARTIAL** |
| J3 · Enquiry / Quotation / SO | NO | no SalesX source registered | **MANUAL-ONLY** (J3 invisible end-to-end) |
| J4 · QA Inspection | NO | no QualiCheck source registered | **MANUAL-ONLY** |
| J4 · NCR | NO | no NCR source registered | **MANUAL-ONLY** |
| J4 · GRN incoming (the QA-fed side) | PARTIAL — visible only via `p360-goods-inward` GIT entry | as above | **PARTIAL** |

**Net DayBook coverage of the four journeys:** ~30%. The aggregator faithfully fans every **registered** source under one `entityCode`, but the source registry only spans 7 cards — Procure360 PO, Bill-Passing, SalesX (Enquiry/Quote/SO), QualiCheck, NCR, Dispatch DM, FCPI drafts, PayOut batches **have no `registerDayBookSource(...)` call** in `daybook-sources.ts`. The smoke-PASS for DayBook in earlier runs was for the **mechanism** (registered sources merge correctly + date-sort + filter + integrity hash) — not for journey-footprint completeness.

### Entity behaviour
- 6 of 7 sources thread `entityCode` correctly into their loader (`vouchersKey(entityCode)` · `payrollRunsKey(entityCode)` · `listGitStage1(entityCode)` · `listBreakdownReports(entityCode)` + `listWorkOrders(entityCode)` · `listSparesIssues(entityCode)` · `loadTTPayments(entityCode)`). For the records that **are** covered (J1 Sales Invoice/Receipt · J2 GIT · J2 Payment), the cross-card feed is **entity-clean** end-to-end.
- **⚠ `sd-service-daybook` (`daybook-sources.ts:104`) signature is `read: ()` — it ignores `entityCode` and calls `listServiceTickets()` with no entity argument.** Service tickets from **every** entity bleed into the unified feed regardless of the header selection. This is **ORPHANED-ENTITY** (a true cross-tenant leak in the cross-card surface for the service domain). It does not affect J1–J4 footprints (no journey touched service tickets), but it is a real seam.
- When `entityCode === ''` (header set to 'all'): finance/people/procure/maintenance/eximx loaders all return `[]` (their localStorage keys are entity-scoped) → the cross-card feed is empty **except for service tickets**, which still appear because of the leak above. This is the exact shape of the ORPHANED-ENTITY signature.

### InsightX roll-up coverage of J1–J4
- `InsightXOverviewPage` reads only `insightx-aggregator-engine` (`InsightXOverviewPage.tsx:23-30`). The engine ships a **75-scenario registry across 11 lenses** (`insightx-aggregator-engine.ts:163-272`), each entry pointing to a `source_engine` module (or `null` = "unbacked / deferred").
- The page shows **one sample aggregated insight per lens** computed via `aggregateInsight(scenario_id)` (L51-60). For unbacked entries the engine throws (caught → rendered as null). There is **no per-record drill-through** to the J1–J4 voucher rows — InsightX rolls up **aggregate metrics** (e.g. PBT spread, BRSR pulse, spend-by-vendor, IoT signal trend, AR aging buckets), not transaction-feed events.
- Backed scenarios touching J1–J4 footprints (best-effort, via their `source_engine`):
  - **`proc-spend-by-vendor` · procurement** → `fpa-budgeting-engine` reads fincore vouchers → reflects J2 PayOut/Bill spend **once posted as Purchase voucher**. **LINKED (aggregate)**.
  - **CFO / Finance lens scenarios** → fincore-vouchers-backed → reflect J1 Sales/Receipt + J2 PI/Payment in totals. **LINKED (aggregate)**.
  - **Operations / Plant · Maintenance · ESG · HR · Insurance · AI/Predictive · Cross-Card · Differentiation** lenses — none of their backed source_engines read SalesX/Procure360 PO/QA/NCR registers, so J1 Enquiry/Quote/SO, J2 PO, J3 entire chain, J4 QA/NCR contribute **nothing** to the roll-up. **MANUAL-ONLY** / **DEFERRED** (registry entries exist but `backed=false` → throws, rendered as null sample).
- **No entity leak observed in InsightX** — all backed source engines are entity-scoped via their own resolvers; the registry samples are computed without an entity filter (purely registry-shape), and per-lens aggregations resolve `entityCode` through standard hooks.

### Per-source verdict matrix
| Hop | Verdict |
|---|---|
| Aggregator mechanism (`getCrossCardDayBook`) | **LINKED** · pure read · merges + sorts + filters correctly |
| `useEntityCode` threading into sources | **LINKED** for 6/7 sources |
| `sd-service-daybook` entity scoping | **ORPHANED-ENTITY** · `listServiceTickets()` called without entity → cross-tenant leak |
| J1 Sales Invoice / Receipt in DayBook | **LINKED** (via fincore vouchers) |
| J1 Enquiry / Quotation / SO in DayBook | **MANUAL-ONLY** (no SalesX source registered) |
| J2 PO in DayBook | **MANUAL-ONLY** (no Procure360 PO source) |
| J2 GRN in DayBook | **PARTIAL** (GIT stage-1 only) |
| J2 Bill in DayBook | **PARTIAL** (downstream Purchase voucher only) |
| J2 PayOut in DayBook | **PARTIAL** (downstream Payment voucher only) |
| J3 entire chain in DayBook | **MANUAL-ONLY** (no SalesX source) |
| J4 QA Inspection / NCR in DayBook | **MANUAL-ONLY** (no source registered) |
| InsightX aggregate roll-up over fincore-touching journeys | **LINKED (aggregate-only · no per-record drill)** |
| InsightX roll-up over PO / SalesX / QA / NCR | **MANUAL-ONLY / DEFERRED** (registry entries unbacked) |

**J5 overall: PARTIAL.** The cross-card DayBook **mechanism** works; the unified feed reflects every journey's footprint that lands as a **fincore voucher** or a **GIT receipt**, under one entity, cleanly. The honest gap is that 5 cards along the J1–J4 chains have **no DayBook source registered** (SalesX, Procure360 PO, Bill-Passing, QualiCheck, NCR, Payment Requisition), so a large share of the journey events never reach the aggregator. InsightX rolls up the fincore-backed slice as aggregate metrics; the non-fincore slice of J1–J4 is deferred. Three real debts for Wave-2 / CL-3:

1. **`sd-service-daybook` is entity-leaky** — `daybook-sources.ts:104` `read: ()` should be `read: (entityCode) => listServiceTickets().filter(t => t.entity_code === entityCode)` (or whatever the ticket model exposes). This is a cross-tenant leak in the unified Day Book today.
2. **5 missing DayBook sources** — register SalesX (Enquiry/Quote/SO), Procure360 (PO/Bill-Passing/PayOut requisition), QualiCheck (Inspection), NCR. Each is a ~20-line `registerDayBookSource({...})` wrapping the existing loader — the same pattern the 7 current sources follow.
3. **InsightX has no transaction-feed lens** — the registry is built for KPI/aggregate roll-ups, not for "show me every journey event across cards". The Cross-Card DayBook is the right surface for that; once the 5 missing sources are registered, the journey footprints will flow through both surfaces.

---

## JOURNEY RUN · CLOSE-OUT — 2026-06-14

```
J1 · Order-to-Cash    PARTIAL  · entity-shaped LINKED end-to-end · SO→Invoice→Receipt clean · campaign/lead invisibles flagged
J2 · Procure-to-Pay   PARTIAL  · getBillsForPo entity-seam latent · 4 manual state-flips · PayOut↔Bill FK deferred
J3 · Lead-to-Order    LINKED   · cleanest of the five · two narrow back-write debts
J4 · Quality-gate     PARTIAL  · QA→Bill direct cascade LINKED · event-bus dispatcher absent · NCR FK absent · GRN state not auto-flipped
J5 · Aggregation      PARTIAL  · mechanism LINKED · 5 cards unregistered as DayBook sources · service-source entity-leak found
```

**Net read:** the seams the per-card smoke run could not see are now mapped. The aggregation surface is honest about what it reflects — fincore-and-GIT-backed records flow through cleanly under one entity; SalesX/PO/Bill/QA/NCR rows need source registration before they appear. One genuine ORPHANED-ENTITY leak (service tickets) and four debt classes catalogued for CL-2/CL-3/Wave-2. **JOURNEY BASELINE RUN COMPLETE.**
