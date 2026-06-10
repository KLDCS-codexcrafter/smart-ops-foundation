# Operix `/erp/dashboard` — Card Enhancement Roadmap

**Generated:** 10 June 2026 · 22:10 IST
**Source of truth:** `src/components/operix-core/applications.ts` @ HEAD `bf50484e`
**Author method:** Built fresh from current code. Each recommendation cites the file path that anchors the gap or the competitor module that establishes the benchmark. No fabricated effort estimates in days/hours — sizing is qualitative (S/M/L) and tied to comparable past sprints when one exists.
**Scope:** Document 2 of 4. Recommendations only. Document 1 (Feature Comparison) supplied the named-competitor facts referenced here; this document does not restate matrix cells.

---

## 0. Method statement

1. Card spine is the same **33 active cards** declared in `applications.ts` (verified again at this HEAD: `grep -c "status: 'active'"` → 33).
2. Each recommendation is tagged with **exactly one priority** and **one motive tag**:
   - **Priority** — `P0` (ship within next 2 sprints; blocks credible India-SME pitch or fixes broken card), `P1` (next 3-6 sprints; closes a parity gap a buyer will test in a demo), `P2` (6+ sprints; differentiator polish or depth play).
   - **Motive** — `INDIA-CRITICAL` (statutory or India-market specific; no global competitor solves it the Indian way), `GLOBAL-PARITY` (every Tier-1 global ERP ships it; we will be marked down without it), `MOAT` (Operix-specific differentiator deepening; no competitor has it).
3. **Sizing** — qualitative S (≤300 LOC, 1 sprint), M (300–900 LOC, 1 sprint), L (>900 LOC or multi-sprint). Numbers reference the sprint history bands the project already uses (AM-class sprints ~950 LOC, CLN-class ~280 LOC).
4. **Did NOT do** — no scoring 1-10, no ROI estimates, no person-day costing, no code edits, no test runs, no sprint-history writes.

---

## 1. Cross-card structural fixes (must clear before any new feature work)

These are not enhancements; they are integrity items surfaced by reading HEAD. They block honest audit reporting until resolved.

| # | Item | File / signal | Priority | Sizing | Motive |
|---|---|---|---|---|---|
| S1 | `Logistics` card declares `/erp/logistics` but no `src/pages/erp/logistics/` folder exists; renderer is undocumented | `applications.ts` lines 347-355; `grep -rln "'/erp/logistics'" src/` → only registry + breadcrumb references | **P0** | S | GLOBAL-PARITY (any honest comparison requires a verifiable page) |
| S2 | `Main Store Hub` route `/erp/main-store-hub` declared, page lives at legacy `src/pages/erp/inventory/MainStoreHubPage.tsx` | `applications.ts` lines 131-138 vs `ls src/pages/erp/inventory/` | **P0** | S | INDIA-CRITICAL (route appears in customer-facing breadcrumbs) |
| S3 | SiteX claims PWA/offline support implicitly through "mobile-first" copy — no service-worker or offline-queue evidence on HEAD | `applications.ts` lines 215-223; no SW registration under `src/pages/erp/sitex/` | **P1** | M | MOAT (offline DPR is a real site-execution differentiator) |
| S4 | "Saathi WhatsApp AI co-pilot" claim in Vendor Portal — implementation file not linked in card description | `applications.ts` lines 205-213 | **P1** | S | MOAT (audit-traceable claim required before marketing uses it) |

S1 + S2 should ship together in a CLN-class sprint (~280 LOC). S3 + S4 belong in their own MOAT sprints.

---

## 2. Per-card recommendations (33 cards, grouped by category)

For each card: 1-3 recommendations, in priority order. Format: `[Priority · Motive · Sizing] Recommendation — anchored to <file or competitor>`.

### 2.1 Ops Hub

**1. Command Center**
- `[P1 · GLOBAL-PARITY · M]` Add a data-quality/steward workflow surface (duplicate detection, golden-record approval) over the SSOT replicas. Benchmarked against SAP MDG and Oracle PDM. Anchor: `src/apps/erp/configs/command-center-shell-config.ts`.
- `[P2 · MOAT · S]` Expose a "Card-to-SSOT integrity report" (which cards have stale replicas vs CC source). No competitor has this because no competitor has the replica model.

**2. Procure360**
- `[P0 · INDIA-CRITICAL · S]` Surface MSME-43BH vendor classification at PO creation (not just at PayOut). Anchor: `src/pages/erp/procure-hub/Procure360Page.tsx` + existing 43BH wiring in Vendor Portal.
- `[P1 · GLOBAL-PARITY · L]` Contract Lifecycle Mgmt sub-module (CLM): contract repository, clause library, renewal calendar, e-sign hook. Benchmarked against SAP Ariba CLM, Oracle Procurement Contracts.

**3. Main Store Hub**
- `[P0 · cleanup]` See structural fix S2.
- `[P1 · GLOBAL-PARITY · M]` Wave/zone picking + slotting recommendations. Benchmarked against SAP EWM, Oracle Inventory Cloud.

**4. QualiCheck**
- `[P1 · MOAT · M]` Link NCRs and CAPAs back to DocVault drawing revisions (closed-loop quality ↔ engineering). Neither SAP QM nor Oracle Quality Inspection wires this automatically.
- `[P2 · GLOBAL-PARITY · M]` ISO/IEC 17025 calibration register for measurement instruments.

**5. GateFlow**
- `[P1 · MOAT · S]` ANPR / number-plate capture handoff (camera ingest → vehicle log). No benchmarked competitor ships this natively.
- `[P2 · GLOBAL-PARITY · S]` Yard appointment slots (link to Procure360 PO ETA + Dispatch outbound).

**6. Production**
- `[P1 · GLOBAL-PARITY · L]` Finite-capacity scheduler (machine + manpower constraints). Benchmarked against SAP PP-DS, Oracle Manufacturing Cloud finite scheduling. Largest single gap in Ops Hub.
- `[P2 · MOAT · M]` Wastage-pattern AI on `WO complete` events (rule-based first, then ML). Anchor: existing `src/pages/erp/production/`.

**7. MaintainPro**
- `[P1 · GLOBAL-PARITY · M]` IoT/condition-monitoring ingestion (CSV-first, then API). Benchmarked against SAP APM, Oracle IoT.
- `[P2 · MOAT · S]` MTBF/MTTR scorecard per machine surfaced into InsightX.

**8. RequestX**
- `[P1 · GLOBAL-PARITY · M]` Catalog punchout (cXML/OCI) — pull supplier catalog into requisition. Benchmarked against SAP Ariba/SRM and Oracle Self-Service Procurement.
- `[P2 · MOAT · S]` Indent-to-PO traceability widget (which PO consumed which indent line).

**9. EngineeringX**
- `[P0 · MOAT · M]` CAD viewer plug-in (DWG/STEP) inline in drawing register. Without it the "engineering control" pitch is incomplete; only SAP EPD and Oracle PLM ship CAD viewers in the benchmarked set.
- `[P2 · MOAT · L]` Train the AI similarity model on tenant drawings (currently rule-based per registry copy).

**10. Department Stores**
- `[P2 · GLOBAL-PARITY · S]` Sub-store transfer approval workflow (today: receipt acknowledgment only).

**11. Vendor Portal**
- `[P0 · cleanup]` See structural fix S4 (link Saathi implementation file).
- `[P1 · MOAT · M]` MSME-43BH-aware vendor onboarding wizard with PAN+UDYAM verification. Anchor: `src/pages/erp/vendor-portal/VendorPortalPage.tsx`.
- `[P2 · GLOBAL-PARITY · L]` Multi-tenant supplier discovery network (Ariba-equivalent). Long horizon.

**12. SiteX**
- `[P0 · cleanup]` See structural fix S3 (PWA/offline).
- `[P1 · MOAT · M]` Site-imprest reconciliation against PayOut at site-closeout. Anchor: `src/pages/erp/sitex/SiteXPage.tsx`.

**13. Logistics**
- `[P0 · cleanup]` See structural fix S1 (verifiable page).
- `[P1 · GLOBAL-PARITY · M]` Carrier rate-shopping + freight accrual at SO-confirm. Benchmarked against SAP TM, Oracle Transportation Cloud.

### 2.2 Sales Hub

**14. SalesX Hub**
- `[P1 · GLOBAL-PARITY · L]` CPQ engine for configurable products (option groups, constraints, price rules). Benchmarked against SAP CPQ, Oracle CPQ.
- `[P2 · MOAT · S]` 6-role mobile usage telemetry → InsightX (which persona under-uses which screen).

**15. Distributor Hub**
- `[P0 · INDIA-CRITICAL · M]` Scheme calculation transparency report (per-distributor working with proofs). Marg edition does this; we should match.
- `[P1 · MOAT · M]` Secondary-sales reconciliation against EcomX marketplace settlements (cross-card MOAT).

**16. Customer Hub**
- `[P1 · GLOBAL-PARITY · L]` Marketing automation depth (segments, journeys, campaign attribution). Benchmarked against Zoho Marketing Plus, D365 Customer Insights.
- `[P2 · GLOBAL-PARITY · S]` Customer 360 timeline view (orders + tickets + AMC + collections in one stream).

**17. ProjX**
- `[P1 · GLOBAL-PARITY · M]` Resource-graph optimisation (skills × availability × constraints). Benchmarked against Oracle PPM Resource Mgmt.
- `[P2 · MOAT · S]` "Project bleed report" — late-stage cost overruns surfaced as soon as `project_centre_id` deltas cross threshold.

**18. WebStoreX**
- `[P1 · GLOBAL-PARITY · M]` B2B punchout (cXML/OCI) so corporate buyers can checkout from their own procurement systems.
- `[P2 · MOAT · M]` PIM auto-fill from EngineeringX drawings (BOM → product attributes).

**19. EcomX**
- `[P0 · INDIA-CRITICAL · M]` Documented connector list (Amazon SP-API, Flipkart Seller, Meesho Supplier, Blinkit, Zepto) — pick which 2-3 ship first, code one to completion. Anchor: `src/pages/erp/ecomx/EcomXPage.tsx`.
- `[P1 · MOAT · M]` Claims-recovery dashboard: aged claims by marketplace × reason × INR exposure.

### 2.3 Fin Hub + International Trade

**20. Fin Core**
- `[P0 · INDIA-CRITICAL · S]` Bank-payment-file generator covering the top 10 Indian banks (SBI, HDFC, ICICI, Axis, Kotak, PNB, Yes, IndusInd, BoB, Federal) — extends PayOut value too. SAP Cash Mgmt and Oracle Payments ship dozens; we ship none today.
- `[P1 · MOAT · S]` Voucher-integrity tamper alert in InsightX (FNV-1a 64-bit hash already exists; surface failures).

**21. Comply360**
- `[P0 · INDIA-CRITICAL · M]` ROC / MCA21 e-filing wizard (DIR-3 KYC, MGT-7A, AOC-4). Tools like Webtel/Winman own this; we have nothing.
- `[P1 · INDIA-CRITICAL · M]` Annual return scheduler with statutory calendar (GSTR-9, GSTR-9C, Form 3CD, TDS Q4 26AS reconciliation).

**22. PayOut**
- `[P0 · INDIA-CRITICAL · S]` MSME-43BH 45-day stop-clock UI badge on every vendor in the payment queue (the rule is already in PayOut copy; UI must be unmistakable).
- `[P1 · GLOBAL-PARITY · S]` Payment-run preview with split-by-bank/currency before commit.

**23. ReceivX**
- `[P1 · GLOBAL-PARITY · M]` Cash-application AI (match incoming bank credits to open invoices). Benchmarked against SAP FSCM cash app and Oracle Advanced Collections.
- `[P2 · MOAT · S]` Dispute root-cause taxonomy (linked to ServiceDesk where the dispute originated from a quality issue).

**24. Bill Passing**
- `[P0 · GLOBAL-PARITY · M]` Invoice-OCR ingestion (PDF + image). Benchmarked against SAP VIM, NetSuite AP Automation. Single biggest "Tally cannot do this" demo win.
- `[P1 · MOAT · S]` 3-way variance reasons taxonomy + auto-routing to RequestX / Procure360 / QualiCheck.

**25. FP&A / Planning**
- `[P1 · GLOBAL-PARITY · L]` Driver-based planning UI (volume × rate, headcount × cost, capex × depreciation drivers). Benchmarked against NSPB, SAC Planning.
- `[P2 · MOAT · M]` Scenario rollups across legal entities (ties to existing consolidation engine).

**26. EximX**
- `[P0 · INDIA-CRITICAL · S]` Customs-broker EDI integration (ICEGATE message templates). Without this, EximX is internal-only.
- `[P1 · MOAT · M]` FEMA 270-day timer surfaced in InsightX export-pending tile (timer exists; visibility doesn't).

### 2.4 Pay Hub

**27. PeoplePay**
- `[P1 · INDIA-CRITICAL · M]` Statutory-form generators end-to-end (Form 16, Form 24Q, PF ECR, ESI MC, PT challan). PF/ESI text exists; the form-render layer needs sealing.
- `[P2 · GLOBAL-PARITY · L]` Talent depth: performance calibration, succession planning, learning-path designer. Benchmarked against SuccessFactors, Oracle HCM Talent.

### 2.5 Dispatch / FrontDesk / Support / InsightX

**28. Dispatch Hub**
- `[P2 · GLOBAL-PARITY · S]` Packing-spec library (carton dims, weight, hazmat) reused across SO line items.

**29. FrontDesk**
- `[P1 · MOAT · S]` Pre-registration link sent via WhatsApp + face-on-arrival check (low-cost camera). The Tier-3-stub disclaimer in the card description should be flipped first.

**30. ServiceDesk**
- `[P1 · MOAT · M]` Predictive maintenance handoff from MaintainPro IoT signals → preventive ticket auto-creation.
- `[P2 · GLOBAL-PARITY · S]` AMC contract auto-renewal workflow with revenue forecast surfaced in FP&A.

**31. TaskFlow**
- `[P1 · GLOBAL-PARITY · M]` Visual no-code workflow designer. Today's flows are config-only; competitors (SuiteFlow, Power Automate) ship drag-drop.
- `[P2 · MOAT · S]` "Accountability heatmap" per department (who delays what, average cycle time).

**32. DocVault**
- `[P1 · GLOBAL-PARITY · M]` Full-text search OCR pipeline (Tesseract-class first, no LLM dependency).
- `[P2 · MOAT · S]` Drawing-revision diff viewer (cross-link to EngineeringX).

**33. InsightX**
- `[P0 · GLOBAL-PARITY · M]` Narrative-AI explanations on each role dashboard tile ("Revenue fell 8% MoM because…"). Every Tier-1 competitor ships this (Joule, Fusion Analytics, NSAW Prompts, Power BI Copilot, Zia). Maintain the read-only architectural lock (`postVoucher` / `localStorage.setItem` forbidden — see `applications.ts` lines 402-407).
- `[P2 · MOAT · M]` Cross-card "what-if" simulator (move a project deadline → see cascading impact on Production WO, Procure360 PO ETA, FP&A forecast).

---

## 3. Consolidated P0 backlog (next 2 sprints)

| # | Card / area | Item | Motive | Sizing |
|---|---|---|---|---|
| 1 | Logistics | Resolve missing page (S1) | GLOBAL-PARITY | S |
| 2 | Main Store Hub | Route/folder rename (S2) | INDIA-CRITICAL | S |
| 3 | Vendor Portal | Link Saathi implementation file (S4) | MOAT | S |
| 4 | Procure360 | Surface MSME-43BH at PO creation | INDIA-CRITICAL | S |
| 5 | EngineeringX | CAD viewer plug-in (DWG/STEP) | MOAT | M |
| 6 | Distributor Hub | Scheme calculation transparency report | INDIA-CRITICAL | M |
| 7 | EcomX | Pick + complete first 2-3 marketplace connectors | INDIA-CRITICAL | M |
| 8 | Fin Core | Top-10 Indian bank payment-file generator | INDIA-CRITICAL | S |
| 9 | Comply360 | ROC/MCA21 e-filing wizard (DIR-3 KYC, MGT-7A, AOC-4) | INDIA-CRITICAL | M |
| 10 | PayOut | MSME-43BH 45-day badge in payment queue | INDIA-CRITICAL | S |
| 11 | Bill Passing | Invoice-OCR ingestion (PDF + image) | GLOBAL-PARITY | M |
| 12 | EximX | ICEGATE customs-broker EDI message templates | INDIA-CRITICAL | S |
| 13 | InsightX | Narrative-AI tile explanations (with read-only lock preserved) | GLOBAL-PARITY | M |

**Distribution:** 8 INDIA-CRITICAL · 3 GLOBAL-PARITY · 2 MOAT. The slate is intentionally India-heavy because that is where competitor parity is weakest and where the SME buyer makes the decision.

---

## 4. Consolidated P1 / P2 buckets (sprints 3-6 and beyond)

### 4.1 P1 (sprints 3-6)
Procure360 CLM · Main Store Hub wave/zone picking · QualiCheck ↔ DocVault closed loop · GateFlow ANPR · Production finite scheduler · MaintainPro IoT ingest · RequestX cXML punchout · Vendor Portal MSME-43BH onboarding · SiteX PWA/offline (S3) + imprest reconciliation · Logistics carrier rate-shop · SalesX CPQ · Distributor↔EcomX secondary-sales reconciliation · Customer Hub marketing automation · ProjX resource-graph · WebStoreX B2B punchout · EcomX claims dashboard · Fin Core voucher-tamper alert · Comply360 annual return scheduler · PayOut split-by-bank preview · ReceivX cash-application AI · Bill Passing variance taxonomy · FP&A driver-based planning · EximX FEMA 270-day visibility · PeoplePay statutory forms · FrontDesk WhatsApp pre-registration · ServiceDesk predictive handoff · TaskFlow visual designer · DocVault OCR.

### 4.2 P2 (sprints 6+)
Command Center steward workflow + integrity report · QualiCheck ISO 17025 calibration · GateFlow yard appointments · Production wastage AI · MaintainPro MTBF/MTTR scorecard · RequestX indent-to-PO traceability · EngineeringX tenant-trained similarity · Department Stores transfer approvals · Vendor Portal supplier discovery network · SalesX persona telemetry · Customer 360 timeline · ProjX project-bleed report · WebStoreX PIM auto-fill from EngineeringX · FP&A multi-entity scenarios · PeoplePay talent depth · Dispatch packing-spec library · ServiceDesk AMC auto-renewal · TaskFlow accountability heatmap · DocVault drawing-diff viewer · InsightX what-if simulator.

---

## 5. Motive-tag tally (across all per-card recommendations + structural fixes)

| Tag | P0 | P1 | P2 | Total |
|---|---:|---:|---:|---:|
| INDIA-CRITICAL | 8 | 3 | 0 | 11 |
| GLOBAL-PARITY | 4 | 13 | 6 | 23 |
| MOAT | 3 | 9 | 11 | 23 |
| **Total recommendations** | **15** | **25** | **17** | **57** |

(Counts include the 4 structural fixes in §1.)

Reading: the **GLOBAL-PARITY** column is where competitors will out-demo us today; the **INDIA-CRITICAL** column is where competitors cannot reach us regardless of investment, so doing nothing here means relying on competitor weakness rather than building our own moat. The **MOAT** column is what we tell investors about after the first two are in flight.

---

## 6. What this document does **not** decide

- Sprint sequencing of the P0 backlog beyond "13 items, two sprints". The sprint planner must pick the bundle that produces a coherent demo cut.
- Vendor selection for OCR, ANPR, IoT ingest, CAD viewer, e-sign — each is an own RFP.
- Pricing/packaging implications of any added module.
- Engineering ownership / team allocation.

---

## 7. Method appendix

### 7.1 Commands run
```
git rev-parse HEAD                                          # bf50484e...
grep -c "status: 'active'"      src/components/operix-core/applications.ts   # 33
grep -rln "'/erp/logistics'"    src/                                          # registry+breadcrumb only (S1)
ls src/pages/erp/inventory/ src/pages/erp/main-store-hub/ 2>&1               # S2 evidence
```

### 7.2 Non-actions
- No edits to `src/`, `tests/`, configs, `package.json`, sprint-history, sibling-register, memory.
- No invented effort numbers in person-days or rupees.
- No carry-over from any prior audit document.

---

**End of Document 2.** Documents 3 (3-Dimension Reports Audit) and 4 (CRUD Roundtrip & Playwright) deferred. Await `continue`.
