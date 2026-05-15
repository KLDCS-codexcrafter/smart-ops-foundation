# /erp/dashboard — Card-by-Card Enhancement Roadmap to Top-1% ERP

| Field | Value |
|---|---|
| Auditor | Lovable AI · read-only |
| Generated | 15 May 2026 · 15:31 IST |
| Scope | `/erp/dashboard` ACTIVE cards only (25 of 32) |
| Source of truth | `src/components/operix-core/applications.ts` |
| Benchmarks | India: Tally Prime · Zoho One · Marg ERP 9+ · BUSY 21 · TCS iON · Ramco · Acumatica-IN partners. Global: SAP S/4HANA · Oracle NetSuite · MS Dynamics 365 BC/F&O · Odoo 17 · Infor LN · Workday · Epicor Kinetic · IFS Cloud · ServiceMax · Coupa · Ariba · Manhattan WMS · BlueYonder · Anaplan |
| Methodology | Honest first-pass: read description + category + route per card. Identify built-in scope, then list (a) gaps vs benchmarks, (b) out-of-the-box differentiators that would push the card into Top-1% global tier. No assumptions about unstated internal logic; recommendations are framed as "add / verify / promote." |
| Cards excluded | All `coming_soon` cards (WebStoreX, UniComm, Comply360, EximX, FrontDesk, TaskFlow, InsightX) — covered in feature comparison report dated 2026-05-15_1521. |

---

## How to read each card block

```
TODAY        — what the card description claims is in scope
GAPS vs Top-1% — what leading Indian + global ERPs ship out-of-box that this card doesn't (visibly) have
OOB UPGRADES — concrete enhancements to leapfrog into Top-1%, grouped:
   · India-Critical (regulatory / market necessity)
   · Global-Parity (table-stakes for SAP/NetSuite/Dynamics buyers)
   · MOAT (Awwwards-tier differentiators no competitor offers)
PRIORITY     — P0 must-ship · P1 next quarter · P2 backlog
```

---

# OPS HUB (12 active cards)

---

## 1. Command Center  ·  `/erp/command-center`
**TODAY** — Master SSOT hub: org structure, geography, taxes, voucher types, period locks. Other cards render replicas.

**GAPS vs Top-1%**
- No tenant-wide health pulse (system uptime, integration status, SLA breach feed)
- No "what changed" change-log timeline across masters (SAP S/4 has Change Documents)
- No cross-card master propagation diff/preview before publish
- No data-quality dashboard (duplicates, orphan ledgers, stale GSTINs)
- No multi-entity consolidation switch (single-pane for group companies)
- No role × scope simulator ("preview as Manager-Mumbai-Plant2")

**OOB UPGRADES**
- *India-Critical:* GSTIN bulk re-validation cron + PAN-Aadhaar linkage status board
- *Global-Parity:* Master-data governance workflow (Maker-Checker-Approver) with versioning, branch/merge per master record (NetSuite SuiteAnalytics parity)
- *MOAT:* "Master Drift Detector" — diffs CC SSOT vs each card's local replica, auto-flags drift; one-click reconcile. **No competitor ships this.**
- *MOAT:* AI Master Quality Score (0-100) per master class with auto-fix suggestions

**PRIORITY:** Master Drift Detector = **P0** (it justifies the entire SSOT thesis). Rest = P1.

---

## 2. Procure360  ·  `/erp/procure-hub`
**TODAY** — Vendor enquiry → 3-mode vendor selection → RFQ → quotation comparison → award → PO. Feeds RequestX + Bill Passing.

**GAPS vs Top-1%**
- No spend analytics cube (Coupa/Ariba ship this Day-1: spend by category × vendor × cost-centre × project)
- No contract lifecycle (CLM) — clauses, renewals, auto-escalation
- No reverse-auction module (mandatory for PSU/large-private buyers)
- No vendor risk score from external feeds (MCA defaulter list, GST cancellation list, court cases)
- No supplier diversity tracking (MSME / women-led / SC-ST vendor % — required for many Indian PSUs and ESG reports)
- No catalog-based PR (punch-out to vendor catalogs)
- No "should-cost" model engine

**OOB UPGRADES**
- *India-Critical:* MSME 43BH 45-day countdown badge on every PO line; auto-block PO award to GST-cancelled vendors; e-invoice reverse-validation on vendor invoices
- *India-Critical:* GeM (Government e-Marketplace) bid sync for PSU clients
- *Global-Parity:* Reverse English/Dutch/Japanese auction · Sealed-bid + dynamic bid · Should-cost calculator
- *Global-Parity:* CLM micro-module (clause library, redline tracking, e-sign integration)
- *MOAT:* "Vendor Truth Card" — single-pane vendor view fusing GSTIN status, MCA filings, court cases, OEM authorization letters, plant audit photos, payment history, OTIF score, dispute count
- *MOAT:* AI Quote Negotiator — drafts WhatsApp/email counter-offers based on historic price bands

**PRIORITY:** Vendor Truth Card + MSME 43BH countdown = **P0**. CLM + reverse auction = P1.

---

## 3. Inventory Hub  ·  `/erp/inventory-hub`
**TODAY** — GRN, MIN, RTV, Cycle Count, Item Master, Storage Matrix, Batch/Serial, ABC, Hazmat, Reorder.

**GAPS vs Top-1%**
- No WMS-grade slotting optimization (Manhattan/BlueYonder ship this)
- No wave-picking / cluster-picking / pick-by-light/voice
- No demand sensing (statistical + ML forecast vs naive reorder)
- No multi-echelon inventory optimization (MEIO)
- No drone/IoT cycle count integration
- No serialized track-and-trace genealogy (parent serial → child serial → raw batch)
- No obsolescence/E&O provision automation (auto-suggest write-down per IND-AS 2)
- No vendor-managed inventory (VMI) consignment workflow

**OOB UPGRADES**
- *India-Critical:* E-way bill auto-trigger on stock movement above ₹50k threshold (state-wise rules engine); FSSAI batch labelling for food-grade items; drug serialization (Schedule M / DSCSA-equivalent)
- *Global-Parity:* Pick-path optimization · Slot-based bin master · License-plate (LPN) tracking · ASN inbound · Cross-docking
- *Global-Parity:* Statistical forecasting (Croston, Holt-Winters, ARIMA) + Prophet baseline; service-level driven safety stock
- *MOAT:* "Stock X-Ray" — visual heatmap of warehouse with live serial/batch overlay, click-to-locate, ageing tint, hazmat halo
- *MOAT:* IoT-ready: MQTT bin-level subscriber for smart-shelf weight sensors + RFID gate reads → auto cycle count
- *MOAT:* Genealogy graph viewer (D3 force-directed) for full upstream/downstream serial trace — recall-ready in 60 sec

**PRIORITY:** E-way bill auto-trigger + Pick-path + Stock X-Ray = **P0** (these alone outclass Tally/Marg). Forecasting + IoT = P1.

---

## 4. QualiCheck  ·  `/erp/qualicheck`
**TODAY** — Incoming/in-process/final inspection · NCR · CAPA · MTC · FAI · welder qualification · ISO 9001 + IEC 17025.

**GAPS vs Top-1%**
- No SPC (Statistical Process Control) charts (X-bar R, p-chart, c-chart) — standard in Plex / iBASEt / Siemens Opcenter QMS
- No gauge R&R / MSA module
- No 8D problem-solving template with linkages to NCR/CAPA
- No supplier quality scorecard auto-feed back to Procure360
- No APQP / PPAP packet generator (mandatory for auto OEMs — Tier-1 supplier requirement)
- No e-signature on COC/COA per 21 CFR Part 11 (pharma/medtech)

**OOB UPGRADES**
- *India-Critical:* IS / BIS standard library link per item · Drug Pharmacopoeia (IP) limits library · FSSAI test matrix for food
- *Global-Parity:* Live SPC dashboards · Cp/Cpk/Pp/Ppk auto-compute · Control-limit alerts to shopfloor
- *Global-Parity:* APQP-PPAP wizard (15 elements) · MSA Type 1/2/3 calculators · 8D template
- *MOAT:* "Quality Twin" — every batch/serial gets a digital twin with all QC events, photos, instrument readings, operator signatures; QR-code on physical part links to twin in 1 scan
- *MOAT:* AI Defect Vision — upload inspection photo, model classifies defect type and routes NCR automatically

**PRIORITY:** SPC + APQP-PPAP = **P0** (auto-Tier-1 supplier dealmaker). Quality Twin = P1.

---

## 5. GateFlow  ·  `/erp/gateflow`
**TODAY** — Vehicle in/out · gate passes · weighbridge integration. Interfaces with Procure360 GRN inward + Dispatch outward.

**GAPS vs Top-1%**
- No ANPR (number-plate camera) integration
- No driver-app for ETA / OTP-based gate-in (Rivigo/Delhivery-style)
- No yard management (slot booking, dock-door scheduling)
- No appointment-window vs actual-arrival OTIF-IN tracker
- No security incident log + visitor blacklist

**OOB UPGRADES**
- *India-Critical:* RFID FASTag read at gate → auto-match driver + truck + e-way bill + LR
- *Global-Parity:* Dock-door scheduler with calendar UI (BlueYonder Yard Mgmt parity); appointment SMS/WA confirmations; trailer dwell-time KPIs
- *MOAT:* "Gate Pulse" — single screen showing all open gates, vehicles inside, dwell timers turning amber/red, anomaly alerts (truck inside > 4h)
- *MOAT:* CCTV snapshot auto-attached to every gate event (zero-trust audit)

**PRIORITY:** ANPR + FASTag read + Gate Pulse = **P0**. Dock scheduler = P1.

---

## 6. Production  ·  `/erp/production`
**TODAY** — Work Orders · routing · 8-stage shopfloor · capacity planning · OEE · wastage · scheduling.

**GAPS vs Top-1%**
- No finite scheduling engine (APS) — Siemens Opcenter / Preactor / SAP DSM ship this
- No digital work-instructions (multimedia SOPs at workstation)
- No paperless batch record (eBR) — pharma must-have
- No Andon escalation board
- No shopfloor MES events bus (machine-OEE auto from PLC/OPC-UA)
- No make-to-order (MTO) / engineer-to-order (ETO) configurator
- No shop calendar overlay vs maintenance window from MaintainPro (cross-card friction)

**OOB UPGRADES**
- *India-Critical:* Job-work outward + 57F4 challan + 1-year return tracker (already in BillPassing — surface here); excise-equivalent batch register for FMCG
- *Global-Parity:* APS engine (CP-SAT / OR-Tools) — finite capacity, sequence-dependent setups, what-if scenarios
- *Global-Parity:* eBR with 21 CFR Part 11 e-sign · Andon board · Digital SOPs with photo/video per step
- *MOAT:* "Shopfloor Mission Control" — large-display TV mode showing live OEE per machine, current operator, current batch, time-to-target, defect rate, animated material flow
- *MOAT:* AI Bottleneck Predictor — runs every 15 min on live WIP, predicts which order will slip and why
- *MOAT:* MTO Product Configurator (rule-based) — sales selects options → BOM + routing auto-generated

**PRIORITY:** APS + Shopfloor Mission Control = **P0** (manufacturing dealmaker). eBR + Andon = P1.

---

## 7. MaintainPro  ·  `/erp/maintainpro`
**TODAY** — Breakdown logs · PM schedules · AMC for own machines · spare parts consumption.

**GAPS vs Top-1%**
- No Reliability-Centred Maintenance (RCM) framework
- No FMEA / MTBF / MTTR analytics
- No condition-based maintenance (CBM) from IoT vibration / temperature sensors
- No spare-parts kitting + reservation against planned PM
- No mobile-first technician PWA (offline-first work-order completion)
- No predictive maintenance ML (vibration FFT, oil-analysis trending)

**OOB UPGRADES**
- *India-Critical:* CLMS (Contract Labour) compliance for outsourced maintenance crews; statutory inspection register (boiler, pressure vessel, lift)
- *Global-Parity:* RCM workflow · MTBF/MTTR/MTBR dashboards · Mobile PWA (offline) · PM kit auto-reservation
- *MOAT:* "Asset Health Score" 0-100 per asset combining age, breakdown frequency, IoT readings, spare-part availability — colour-coded fleet view
- *MOAT:* AR-assisted repair: technician scans QR on machine → 3D exploded view + step-by-step animated SOP overlaid (WebXR)
- *MOAT:* Predictive failure ML on vibration/temperature time-series → auto-create PM ticket 7-30 days before failure

**PRIORITY:** Mobile PWA + Asset Health Score = **P0**. Predictive ML = P1.

---

## 8. RequestX  ·  `/erp/requestx`
**TODAY** — Material indents · service requests · capital indents · 11 categories · 3-tier approval.

**GAPS vs Top-1%**
- No budget-check-at-source (block PR if cost-centre budget exceeded)
- No catalog-based requisition (punch-out / internal item picker with images)
- No requisition consolidation engine (auto-bundle similar PRs across departments into single RFQ)
- No CapEx workflow with NPV/IRR/payback fields + board-approval gate
- No SLA timer per approval level

**OOB UPGRADES**
- *India-Critical:* TDS-section pre-tag (194C / 194J / 194I) at request stage to block downstream errors
- *Global-Parity:* Budget envelope validation (Coupa parity) · Catalog requisition · CapEx-AFE (Authorization For Expenditure) packet
- *MOAT:* "Smart Bundler" — AI clusters open PRs by item-similarity + delivery-window + vendor-overlap and proposes consolidated RFQ to procurement (cost-saving estimator built-in)
- *MOAT:* WhatsApp-based approval (one-tap approve from BlackBerry-era CXO phones) with full audit trail

**PRIORITY:** Budget check + WhatsApp approval = **P0**. Smart Bundler = P1.

---

## 9. EngineeringX  ·  `/erp/engineeringx`
**TODAY** — Drawing register · version control · BOM-from-drawing · Reference Project Library · AI similarity / change-impact prediction.

**GAPS vs Top-1%**
- No ECN/ECO (Engineering Change Notice/Order) workflow with cost-impact + inventory-impact
- No CAD integration (SolidWorks / AutoCAD / Fusion 360 plug-in for direct drawing push)
- No BOM compare (red-line two BOM versions) — PLM table-stakes
- No "Where Used" reverse lookup for parts
- No supplier-drawing watermark + DRM (drawing leak prevention)

**OOB UPGRADES**
- *India-Critical:* GST HSN auto-suggest from material/process tags; drawing approval matrix that auto-routes to Project Manager + QA Head
- *Global-Parity:* ECN/ECO workflow · CAD plug-ins · Visual BOM compare · Where-used graph
- *MOAT:* Drawing similarity AI already in description — extend to "this 90% matches Drawing X from Project Y, reuse 12 sub-assemblies, est. saving ₹X lakh"
- *MOAT:* Drawing DRM — vendor downloads watermarked PDF with vendor-id + timestamp baked in pixel-level, expiry timer, view-count log

**PRIORITY:** ECN workflow + Visual BOM compare = **P0**. Drawing DRM = MOAT P1.

---

## 10. Department Stores (store-hub)  ·  `/erp/store-hub`
**TODAY** — Department-level Stores console · stock issue · receipt acks · cycle count status · reorder · forecast.

**GAPS vs Top-1%**
- No mobile-first issue/return UX for store-keepers
- No two-bin / Kanban replenishment visual
- No reservation against planned production order
- No cross-department borrow-return workflow (common in heavy industry)

**OOB UPGRADES**
- *India-Critical:* Issue voucher with TDS-section auto-tag for consumables to contractor sites
- *Global-Parity:* PWA for store-keeper (offline issue + signature capture) · Kanban two-bin board
- *MOAT:* "Borrow Bay" — graph of inter-department lending with auto-return SLA + cost-centre cross-charge

**PRIORITY:** PWA + Kanban = **P0**.

---

## 11. SupplyX  ·  `/erp/supplyx`
**TODAY** — Internal supply requisition · stock check before requisition · auto-PR trigger to Procure360 (early scaffold).

**GAPS vs Top-1%**
- Scaffold-stage; needs full graduation to Coupa-style internal marketplace
- No "shop the catalog" UX with images, ratings, alternatives
- No spend pre-approval based on user's role + cost-centre

**OOB UPGRADES**
- *Global-Parity:* Punch-out to Amazon Business / Flipkart Wholesale / Industrybuying for indirect spend
- *MOAT:* "Best Buy Engine" — given an item ask, returns 3 options with internal-stock vs PR-route vs marketplace cost+ETA comparison and one-click choose

**PRIORITY:** Graduate scaffold + Best Buy Engine = **P0**.

---

## 12. SiteX  ·  `/erp/sitex`
**TODAY** — Install/commission + construction + CAPEX · DPR with geo-fenced photos · snag list (mobile) · safety (PTW · JSA · TBT · incidents) · site imprest · customer signoff · 4 closeout handoffs.

**GAPS vs Top-1%**
- No drone-survey progress integration (Procore parity)
- No 4D BIM overlay (planned vs actual)
- No labour productivity baseline (planned hours vs actual hours per activity)
- No subcontractor RA-bill workflow with retention + price escalation
- No HSE leading-indicator dashboard (TBT count, near-miss reports, observation-card velocity)

**OOB UPGRADES**
- *India-Critical:* BOCW-cess auto-calculation on RA-bill; CLRA workmen register + half-yearly Form-XXIV; ESI/PF subcontractor compliance tracker; statutory site-sign board generator
- *Global-Parity:* Subcontractor RA-bill module · Drone progress upload · 4D BIM viewer (IFC / glTF)
- *MOAT:* "Site Pulse Wall" — TV-mode dashboard for site office: live manpower count, today's work-front status, safety incidents, weather, material at site, snag-burn-down
- *MOAT:* AI Snag Triage — photo upload → vision model categorizes snag (electrical/plumbing/civil), assigns priority + responsible vendor

**PRIORITY:** BOCW + CLRA + RA-bill = **P0** (legal + commercial). Site Pulse Wall = MOAT P1.

---

# SALES HUB (5 cards · 4 active)

---

## 13. SalesX Hub  ·  `/erp/salesx`
**TODAY** — Enquiry → Quotation → Sales Order → Sample/Demo Outward · stock reservations · 6-role mobile suite · 14 reports.

**GAPS vs Top-1%**
- No CPQ (Configure-Price-Quote) for product variants + discount-rule engine + approval matrix
- No quote-to-cash analytics (win-rate, cycle-time, discount leakage)
- No territory + quota planning (Salesforce SPM parity)
- No commission engine with clawback rules
- No deal-room (collaborative quote portal for buyer + seller)

**OOB UPGRADES**
- *India-Critical:* GST place-of-supply rule engine baked into quotation; e-invoice preview before SO conversion; B2B vs B2C tax behavior; freight-as-supply rule
- *Global-Parity:* CPQ rule engine · Approval matrix · Commission engine · Territory planner
- *MOAT:* "Quote Confidence Score" — AI predicts win-probability per quote based on historic win-loss, competitor presence, customer payment history, current pipeline
- *MOAT:* WhatsApp-native quotation share with read-receipts and customer-approval-via-OTP (no PDF email needed)

**PRIORITY:** CPQ + Commission engine = **P0**. Quote Confidence Score = MOAT P1.

---

## 14. Distributor Hub  ·  `/erp/distributor-hub`
**TODAY** — Scheme management · secondary sales · distributor hierarchy · primary/secondary order pipelines · live tracker.

**GAPS vs Top-1%**
- No DMS-grade beat plan + GPS-tracked field-rep visits (Bizom / FieldAssist parity)
- No retailer (tertiary) tracking — needed for FMCG van-sales
- No auto-claim settlement engine (scheme/discount/CN reconciliation)
- No distributor credit insurance integration

**OOB UPGRADES**
- *India-Critical:* TCS 206C(1H) auto-deduction · MSME 43BH for distributor payments (reverse view) · primary-sales vs secondary-sales GST reconciliation
- *Global-Parity:* Beat-plan · GPS field-visit · Retailer master · Auto-claim settlement
- *MOAT:* "Channel Heat Map" — India map with distributor-level sales pulse, scheme-uptake, stock days, complaint count, click-to-drill
- *MOAT:* WhatsApp-bot order placement for retailers (Tier-3 town reality)

**PRIORITY:** Beat-plan + Auto-claim + WhatsApp-bot = **P0**.

---

## 15. Customer Hub  ·  `/erp/customer-hub`
**TODAY** — B2B/B2C portal · master · opportunity · service requests · AMC visibility.

**GAPS vs Top-1%**
- No CDP (Customer Data Platform) unification — same customer across SalesX + ServiceDesk + ReceivX should resolve to one Golden Record
- No NPS / CSAT capture loop tied to ticket close
- No customer-360 timeline (every touch: order, ticket, payment, complaint, visit)
- No churn-risk score
- No self-service portal (download invoices, raise tickets, track AMC, request quote)

**OOB UPGRADES**
- *India-Critical:* GSTIN-based bulk customer cleanup; PAN-Aadhaar + UDYAM number on customer master for MSME counterparty status
- *Global-Parity:* Customer-360 timeline · NPS/CSAT engine · Self-service portal · Golden Record dedup
- *MOAT:* "Customer Pulse" composite score (payment behaviour + service tickets + NPS + share-of-wallet) with drift alerts to KAM
- *MOAT:* AI Cross-sell Suggester — based on look-alike customer purchase patterns

**PRIORITY:** Customer-360 + Self-service portal = **P0**.

---

## 16. ProjX  ·  `/erp/projx`
**TODAY** — Multi-line long-running orders · milestones · resources · time entries · project P&L · project invoicing. Orchestrator: every transaction tags `project_centre_id`.

**GAPS vs Top-1%**
- No EVM (Earned Value Management) — PV/EV/AC/SPI/CPI dashboards · standard in MS Project / Primavera / Oracle PPM
- No critical-path / Gantt with dependency lag-lead
- No risk register with Monte-Carlo simulation
- No revenue recognition (POC / milestone / IndAS 115) automation
- No resource histogram + over-allocation auto-resolver

**OOB UPGRADES**
- *India-Critical:* TDS 194Q + 206C(1H) project-line tracker · MSME counterparty payment timer · BOQ vs actual variance with GST
- *Global-Parity:* EVM · Critical Path Gantt · Resource histogram · Rev-rec engine (IndAS 115 / IFRS 15) · Risk register Monte-Carlo
- *MOAT:* "Project Truth Pane" — single screen with EVM + cash-curve + risk burn + RFI count + drawing-version compliance + safety incidents (cross-card aggregation)
- *MOAT:* AI Slip-Detector — every night, scans schedule + resource + RFI + drawing-revision + procurement lead-time, predicts which milestone will slip and recommends mitigation

**PRIORITY:** EVM + Gantt + Rev-rec = **P0** (without these, ProjX cannot win L&T-tier deals). Project Truth Pane = MOAT P0.

---

# FIN HUB (5 cards · 4 active)

---

## 17. Fin Core  ·  `/erp/fincore`
**TODAY** — Sales · purchase · payments · journals · voucher register. India compliance (GST/TDS/E-invoice).

**GAPS vs Top-1%**
- No multi-GAAP / multi-currency / multi-book (S/4 + NetSuite ship this)
- No continuous close (soft-close on demand any day-of-month)
- No automated bank reconciliation with ML-based match (Trintech / BlackLine parity)
- No fixed-asset module with WDV+SLM dual + Companies Act Sched-II auto-depreciation
- No transfer pricing module
- No XBRL / Ind-AS financial statement generator
- No segment / cost-centre P&L matrix view
- No allocations engine (HQ overhead spread to BUs)

**OOB UPGRADES**
- *India-Critical:* GSTR-1/3B/2A/2B/9 auto-prep + reconciliation; e-invoice + e-way bill API live; TDS 24Q/26Q/27Q + 27EQ; PT/PF/ESI ECR; 26AS reconciliation; Form 3CD auto-prep; MSME 43BH stop-clock; XBRL Form AOC-4; CARO checklist
- *Global-Parity:* Multi-currency revaluation · Inter-company elim + auto-reversal · Bank-rec ML · FA module · Allocations · Continuous close
- *MOAT:* "Audit-Ready Daily" — every voucher carries integrity hash + immutable audit trail; auditor login = read-only with sampling tools, GST-2B match, TDS reconciliation, MCA filing diff already pre-computed
- *MOAT:* "Tax Drift Alarm" — daily scan: any voucher posted that breaks GST place-of-supply / TDS section / RCM detection rule → flags before month-end
- *MOAT:* AI Journal Entry Suggester — paste bank narration → suggests correct voucher type + ledger + cost-centre + project

**PRIORITY:** GSTR auto + FA module + Bank-rec ML + Audit-Ready Daily = **P0**. Multi-currency + XBRL = P1.

---

## 18. PayOut  ·  `/erp/payout`
**TODAY** — AP scheduling · payment runs · advance tracking · release approvals · vendor recon · MSME 45-day rule.

**GAPS vs Top-1%**
- No payment factory (single payment file across HDFC/ICICI/SBI/Axis/Citi with bank-format routing)
- No virtual account (VA) tagging for vendor refunds
- No dynamic discounting (early-pay for cash discount à la C2FO / Taulia)
- No supply-chain finance integration (RXIL TReDS / M1xchange / Invoicemart)
- No FX hedging tracker
- No positive-pay file generator

**OOB UPGRADES**
- *India-Critical:* TReDS auto-upload of MSME bills; positive-pay XML for HDFC/ICICI/Axis/SBI; UPI bulk-pay; NEFT/RTGS/IMPS routing engine; vendor-bank account penny-drop (Cashfree / Razorpay X)
- *Global-Parity:* Payment factory · Dynamic discounting · FX hedging · VA tagging
- *MOAT:* "Cash Conductor" — AI suggests optimal payment plan: pay X early for 1.5% cash discount, defer Y to use float, pay MSME-Z today to avoid 43BH penalty — with one-click execute
- *MOAT:* Penny-drop + GSTIN-on-PAN + bank-account-name fuzzy-match before every payment release (fraud killer)

**PRIORITY:** Penny-drop + TReDS + Cash Conductor = **P0**.

---

## 19. ReceivX  ·  `/erp/receivx`
**TODAY** — Customer outstanding · collections · dunning · disputes · credit limits.

**GAPS vs Top-1%**
- No DSO/CCC analytics with cohort comparison
- No collections worklist auto-prioritized by risk × value × ageing
- No disputed-invoice resolution workflow with root-cause taxonomy
- No customer credit insurance + credit-bureau (CIBIL Commercial / D&B / Experian) integration
- No payment portal (one-link customer pays via UPI/card/NEFT)
- No promise-to-pay tracker with break-promise auto-escalation

**OOB UPGRADES**
- *India-Critical:* TDS-on-receipt 194Q reverse-tracking; auto-issue of credit/debit note with e-invoice IRN; cash-vs-bank receipts MIS for CA-style review
- *Global-Parity:* Collections worklist (HighRadius parity) · Credit-bureau auto-pull · Customer payment portal · Promise-to-pay engine · Dispute resolution
- *MOAT:* "Collector Co-Pilot" — for each customer call, AI shows: amount due, last promise, broken-promise count, suggested talking points based on past dispute reasons, and one-click WhatsApp template
- *MOAT:* "Credit X-Ray" — fuses internal payment behaviour + CIBIL + GST cancellation + MCA defaults + court cases for one credit-limit recommendation

**PRIORITY:** Customer payment portal + Collector Co-Pilot = **P0**. Credit-bureau pull = P1.

---

## 20. Bill Passing  ·  `/erp/bill-passing`
**TODAY** — 3-way match (PO + GRN + Vendor Invoice) for Procure360 + RequestX + JobWorkOut. Feeds PayOut.

**GAPS vs Top-1%**
- No OCR-based invoice ingestion (Kofax / Hyperscience / Rossum parity)
- No GST 2B auto-match at invoice line level (block ITC if not in 2B)
- No tolerance-based auto-pass (qty/price within X% → auto-approve)
- No vendor self-service invoice upload portal
- No job-work return + 1-year clock visible at invoice screen

**OOB UPGRADES**
- *India-Critical:* GSTR-2B per-line ITC eligibility check at bill-pass; e-invoice IRN reverse-validation against NIC API; RCM auto-detect; TDS section auto-suggest from vendor master + nature-of-payment
- *Global-Parity:* OCR ingestion (PDF/image/email) · Auto-tolerance pass · Vendor portal upload · Touchless invoice processing
- *MOAT:* "Bill Bot" — email a PDF invoice to bills@tenant.com → OCR + 3-way match + GST-2B match + TDS suggest + RCM detect → posts to bill-pass queue with confidence score; auto-approves if >95% and within tolerance
- *MOAT:* "ITC Watchdog" — daily scan: any vendor invoice with ITC claimed but missing in GST-2B for >30 days → red flag with auto-WA-followup to vendor

**PRIORITY:** OCR + GST-2B match + ITC Watchdog = **P0** (this is where ITC leakage happens). Bill Bot = MOAT P1.

---

# PAY HUB (1 active)

---

## 21. PeoplePay  ·  `/erp/pay-hub`
**TODAY** — Attendance · leaves · payroll · PF/ESI/LWF/PT · employee master · contract manpower · shift master · L&D · exit/F&F.

**GAPS vs Top-1%**
- No biometric/face-recognition device gateway (eSSL / Matrix / Mantra)
- No geo-fenced mobile attendance for field staff
- No comp & ben benchmarking (Mercer / AON data overlay)
- No performance management (OKR/KRA/360-feedback)
- No learning-content marketplace (LinkedIn Learning / Udemy plug-in)
- No Workday-style "manager self-service" workflows
- No payroll outsourcing handover (Excelity / ADP integration)
- No income-tax declaration + investment-proof workflow
- No flexi-benefit plan (FBP) optimizer
- No full & final settlement automation with statutory clearances

**OOB UPGRADES**
- *India-Critical:* New tax regime vs old comparator + auto-best-pick; Section 80C/80D/HRA proof workflow; bonus & gratuity actuarial valuation handover; LWF state-wise; PT state-wise; CLRA Form-XXIV; POSH register; maternity benefit tracker; Apprenticeship Act compliance
- *Global-Parity:* OKR/KRA/360 PMS · L&D LMS · Comp benchmarking · Manager self-service portal · Helpdesk (PeopleSoft parity)
- *MOAT:* "Salary X-Ray" — for each employee shows take-home delta under both regimes, FBP allocation suggestion, tax-saving suggestion → one-click apply
- *MOAT:* "Attrition Predictor" — ML on attendance volatility, leave-pattern, last-rating, salary-percentile, manager-change → 90-day attrition probability

**PRIORITY:** Geo-attendance + IT declaration + F&F automation = **P0**. PMS + LMS + Salary X-Ray = P1.

---

# DISPATCH HUB / LOGISTICS (2 active)

---

## 22. Logistics  ·  `/erp/logistics`
**TODAY** — Transporter panel · LR · POD · courier · freight recon · transporter scorecard · dispute queue. External-party.

**GAPS vs Top-1%**
- No live truck-GPS integration (FASTag / VAHAN / SIM-based GPS aggregators — LogiNext / Locus parity)
- No freight RFQ + spot-rate auction
- No multi-modal (FTL / LTL / parcel / rail / air) routing
- No carbon-emission per-shipment KPI (Scope-3 ESG)
- No detention/demurrage auto-calculator with proof timestamps

**OOB UPGRADES**
- *India-Critical:* E-way bill validity auto-extend trigger; VAHAN-API truck-fitness check; FASTag balance pre-trip; transporter GST cancellation block; lorry-receipt e-sign
- *Global-Parity:* Live GPS · Freight RFQ · Multi-modal optimizer · Carbon KPI · TMS-grade slot booking
- *MOAT:* "Live Lane" — India map with every active shipment · ETA · live driver speed · halt-detector · WhatsApp ping driver · proactive customer ETA SMS
- *MOAT:* Auto-detention computation: gate-in + gate-out timestamps from GateFlow → compute dwell → auto-debit-note draft

**PRIORITY:** Live GPS + E-way validity + Live Lane = **P0**.

---

## 23. Dispatch Hub  ·  `/erp/dispatch`
**TODAY** — Internal department · inward & outward · Delivery Memo · Packing Slip · GRN inward · sample/demo outward · OMR · exceptions.

**GAPS vs Top-1%**
- No load-plan optimizer (3D bin-pack / cube-fill)
- No carton-content scan-pack QC
- No proof-of-delivery photo + e-sign + OTP capture
- No reverse-logistics workflow (sales-return-pickup with QC + restock)
- No SLA-IN / SLA-OUT performance dashboards

**OOB UPGRADES**
- *India-Critical:* Multi-state GST place-of-supply per dispatch line; e-way bill consolidator; e-invoice IRN attach to delivery
- *Global-Parity:* Cube-fill load planner · Scan-pack · Reverse logistics (RMA) · POD with photo+e-sign+OTP
- *MOAT:* "Dispatch War Room" — large-display screen showing today's dispatches, pending packs, awaiting trucks, exceptions list, color-coded SLA timer

**PRIORITY:** POD with photo+OTP + RMA + Cube-fill = **P0**.

---

# SUPPORT HUB (3 cards · 2 active)

---

## 24. ServiceDesk  ·  `/erp/servicedesk`
**TODAY** — Post-handover AMC + service tickets · technician scheduling · mobile dispatch · spare parts · SLA · CSAT. (Tier 1 #13.)

**GAPS vs Top-1%**
- No field-service AI dispatch (right-tech-right-time-right-skill — ServiceMax / FieldGlass parity)
- No knowledge base (KB) with solution-suggester to technician
- No customer self-service ticket portal + chatbot
- No SLA breach forecast (predict before breach, not after)
- No installed-base hierarchy (asset → sub-asset → serial → spare)
- No subscription billing (recurring AMC fee, auto-renewal, pro-rata)
- No swap-stock for advance replacement workflow

**OOB UPGRADES**
- *India-Critical:* GST place-of-supply auto-determination per visit (intra-state vs inter-state service); TDS 194J reverse-tracking; e-invoice for service vouchers; AMC contract printout with stamp-duty value
- *Global-Parity:* AI dispatch · KB + RAG-search · Customer chatbot · Installed-base graph · Subscription billing
- *MOAT:* "Tech-on-Site Co-Pilot" — technician opens ticket on phone → KB suggests top-3 fixes from past similar tickets, AR-overlays parts, captures before/after photos, OTP-based customer signoff with CSAT in same flow
- *MOAT:* "AMC Auto-Renew Engine" — 60-day-before-expiry, generates renewal quote, sends WA + email, tracks acceptance, books revenue; auto-creates next year's PM schedule

**PRIORITY:** Mobile co-pilot + AMC auto-renew + Subscription billing = **P0**.

---

## 25. DocVault  ·  `/erp/docvault`
**TODAY** — Versioned document storage · drawings · MOMs · certifications · ISO/IEC docs. Prereq for EngineeringX.

**GAPS vs Top-1%**
- No DMS-grade full-text OCR search
- No retention/disposition policy engine (legal-hold, auto-purge after X years)
- No e-sign integration (DocuSign / Leegality / SignDesk)
- No watermark + DRM for external sharing
- No granular folder ACL (Box / SharePoint parity)
- No version-compare diff (PDF redline)

**OOB UPGRADES**
- *India-Critical:* Aadhaar e-sign integration (Leegality / NSDL e-sign); MCA filing repository auto-link; ISO 27001 retention rules
- *Global-Parity:* OCR full-text · Retention engine · E-sign · Folder ACL · Version diff · Audit log export
- *MOAT:* "Doc DNA" — AI tags every uploaded doc with project, party, voucher type, expiry, sensitivity → searchable like a Google Drive but for ERP
- *MOAT:* Drawing/Doc DRM with view-watermark + IP/device log + auto-expiry (kill leaked files)

**PRIORITY:** OCR + E-sign + Retention engine = **P0**. Doc DNA = MOAT P1.

---

# CROSS-CARD MOAT THEMES (apply to every card)

These 7 patterns, if shipped horizontally, lift the whole platform into Top-1% globally:

| Theme | Implementation |
|---|---|
| **AI Co-Pilot bar** | Persistent "Ask Dishani" sidebar with card-aware RAG over today's data |
| **WhatsApp-native loops** | Every approval, OTP, alert, signoff, customer-comm via WA Business API |
| **TV / Mission-Control mode** | Every card has a 1-key full-screen wall-display mode (factory floor, dispatch, gate, project office) |
| **Mobile PWA-first for blue-collar** | Store-keeper, technician, driver, gate-guard, site-engineer — all offline-first, big-button, voice-input |
| **Audit-Ready by default** | Voucher integrity hashing, immutable trail, auditor read-only login pre-built |
| **India compliance built-in (not bolt-on)** | GST/TDS/MSME/E-invoice/E-way as engines other cards consume, not separate forms |
| **Cross-card "Truth Pane"** | One screen per entity (vendor, customer, project, asset, employee) aggregating ALL card data — kill master drift |

---

# PRIORITISATION SUMMARY

**P0 — Next 90 days (dealmaker / deal-saver)**
1. CC: Master Drift Detector
2. Procure360: Vendor Truth Card + MSME 43BH countdown
3. Inventory Hub: E-way auto-trigger + Pick-path + Stock X-Ray
4. QualiCheck: SPC + APQP-PPAP wizard
5. GateFlow: ANPR + FASTag + Gate Pulse
6. Production: APS + Shopfloor Mission Control
7. MaintainPro: Mobile PWA + Asset Health Score
8. RequestX: Budget check + WhatsApp approval
9. EngineeringX: ECN workflow + Visual BOM compare
10. Department Stores: PWA + Kanban
11. SupplyX: Graduate scaffold + Best Buy Engine
12. SiteX: BOCW + CLRA + RA-bill module
13. SalesX: CPQ + Commission engine
14. Distributor Hub: Beat-plan + Auto-claim + WhatsApp-bot
15. Customer Hub: Customer-360 + Self-service portal
16. ProjX: EVM + Critical-Path Gantt + Rev-rec + Project Truth Pane
17. Fin Core: GSTR auto + FA module + Bank-rec ML + Audit-Ready Daily
18. PayOut: Penny-drop + TReDS + Cash Conductor
19. ReceivX: Customer payment portal + Collector Co-Pilot
20. Bill Passing: OCR + GST-2B match + ITC Watchdog
21. PeoplePay: Geo-attendance + IT declaration + F&F automation
22. Logistics: Live GPS + Live Lane
23. Dispatch Hub: POD photo+OTP + RMA + Cube-fill
24. ServiceDesk: Mobile co-pilot + AMC auto-renew + Subscription billing
25. DocVault: OCR + E-sign + Retention engine

**P1 — Next 6 months (parity)** — all "Global-Parity" rows above not in P0.

**P2 — 12-month MOAT push** — every "MOAT" item above (these are the Awwwards / Gartner-MQ-leader items).

---

# REVIEWER'S CANDID OPINION

**Strengths of current dashboard (real, not flattering):**
- 25 active cards is unusually broad; covers Tally + Marg + Zoho One scope in single shell.
- Architectural disciplines (SSOT, D-218 project tagging, locked memories, integrity hashing) already match Top-1% engineering hygiene — most Indian ERP vendors don't have this.
- India-first depth (RCM detection engine, MSME 43BH countdown, GST validations) is genuinely ahead of NetSuite/Dynamics India localisation.

**Honest weaknesses:**
- Most cards are **wide but shallow**: scope is listed, but the high-leverage modules (APS, EVM, OCR-AP, SPC, CPQ, Bank-Rec ML, Field-Service AI dispatch) are absent. Without these, large enterprise buyers (₹500cr+) will still pick S/4 or NetSuite.
- **Mobile PWA story is incomplete** — Sarathi pattern exists for some roles, but blue-collar workflows (store-keeper, technician, gate-guard, dispatch packer) aren't yet mission-critical mobile.
- **AI is rule-based / mock today** (Ask Dishani is keyword-router, no live RAG over voucher data). Genuine AI Co-Pilot would be the single biggest MOAT, and competitors (SAP Joule, NetSuite Text Enhance) are racing.
- **InsightX is `coming_soon`** — without it, the SSOT thesis is half-told.

**One-line verdict:**  
Ship the **P0 list above** in 90 days and the platform credibly outranks every Indian competitor and lands in the lower-right of the global Mid-Market ERP Magic Quadrant. Ship the MOAT items in 12 months and Lovable-Operix becomes a referenceable global product.

---

*End of report. Read-only · no source code modified · GitHub auto-sync will publish this file to the connected repo.*
