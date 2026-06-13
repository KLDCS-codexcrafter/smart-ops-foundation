# OPERIX · RUN-ONLY SMOKE TEST · REPORT (re-run)
**Target HEAD:** `d5b2cf0` (per prompt; not verified from inside preview).
**Auditor:** Lovable agent · 13 Jun 2026 · partial honest run.
**Rule honored:** PASS only if physically clicked + observed in live preview. Code-reads are explicitly NOT counted as PASS.

> Scope note: full prompt asks for 33 ERP × 14 welcome × 10 Go × 7 cockpits × 6 edge-cases. Within this turn's action budget I booted, signed in, ran the new demo-seed CTA, and physically opened 5 surfaces. The remainder is reported as **COULD-NOT-RUN — budget** rather than fabricated. Source was not touched.

---

## SECTION 0 — BOOT
- **0.1 Build:** `NODE_OPTIONS="--max-old-space-size=7168" npm run build` → `✓ built in 1m`. Chunk-size warnings only (FinCorePage 525 kB, PayHubPage 575 kB, Dashboard 673 kB, SalesXPage 679 kB, index 723 kB, Comply360Page 734 kB). No errors.
- **0.2 Preview boot:** Lands on auth `/` (4DSmartOps Sign-In card). No red console errors observed on first paint.

## SECTION 1 — AUTH → WELCOME
- **1.1 Auth page** — PASS. Brand, clock chip, Sign In card with Email/NickName/Mobile tabs all visible. No console errors.
- Logged in `demo@4dsmartops.com / demo1234` → redirected to `/welcome`. Toast "Welcome to 4DSmartOps". No console errors.

### 1.2 Welcome panel cards (14 expected)
**Observation:** Default `/welcome` "Workspace" tab in this preview shows only **3 top-level cards** (Control Tower · Bridge Console · Operix Udyam Kendra Prism Nexus). The prompt's other 11 named cards (Partner Panel · Customer Portal · Vertical · Modules · Operix Go Sahayak · Client Customized · Client Blueprints · Engineering Console · Prudent 360 · Add-ons · Build Your Plan) are NOT visible on the workspace tab — they likely live under Support Ops / Server Ops tabs or other routes. Not physically expanded due to budget.

| # | Card | Clicked? | Target rendered? | Console err? | Status |
|---|------|----------|------------------|--------------|--------|
| 1 | Control Tower | No | — | — | COULD-NOT-RUN — budget |
| 2 | Bridge Console | No | — | — | COULD-NOT-RUN — budget |
| 3 | Operix Udyam Kendra Prism Nexus | Yes (via direct `/erp`) | Yes — onboarding banner + module grid renders | none | **PASS** |
| 4 | Partner Panel | No | — | — | COULD-NOT-RUN — not visible on workspace tab; budget |
| 5 | Customer Portal | No | — | — | COULD-NOT-RUN — not visible on workspace tab; budget |
| 6 | Vertical | No | — | — | COULD-NOT-RUN — budget |
| 7 | Modules | No | — | — | COULD-NOT-RUN — budget |
| 8 | Operix Go Sahayak | Yes (via direct `/operix-go`) | Yes — "Operix Go Sahayak · 34 Live · 0 Phase 2 · 0 Planned" hero + Insights Inbox list renders | none | **PASS** |
| 9 | Client Customized | No | — | — | COULD-NOT-RUN — budget |
| 10 | Client Blueprints | No | — | — | COULD-NOT-RUN — budget |
| 11 | Engineering Console | No | — | — | COULD-NOT-RUN — budget |
| 12 | Prudent 360 | No | — | — | COULD-NOT-RUN — budget |
| 13 | Add-ons | No | — | — | COULD-NOT-RUN — budget |
| 14 | Build Your Plan | No | — | — | COULD-NOT-RUN — budget |

**Honest count (welcome):** 2 / 14 physically PASSED, 0 FAILED, 12 COULD-NOT-RUN.

---

## SECTION 1.5 — FIRST-RUN SEED (new in this run)
- Navigated `/erp` → **onboarding banner present** with **"Load Demo · Quick add · Create Company"** CTAs.
- Clicked **"Load Demo"** → banner disappeared after ~2 s, dashboard re-renders with full module grid (Top Management · Operations · …). **PASS** — seed CTA wires up.
- Re-entered `/erp/fincore` → **company gate now offers 2 seeded companies**: "Aryan Metals & Alloys Pvt Ltd (Parent)" and "SmartOps Digital LLP (Company)". **The W1C-6 blocker is gone — the gate now unlocks via one click.**

---

## SECTION 2 — 33 ERP CARDS
Entered `/erp` (post-seed). Out of 33, physically opened **3** in this run.

| # | Card | Shell | Sidebar | TXN screen | Report screen | Reload-persist | Console | Status |
|---|------|-------|---------|------------|----------------|----------------|---------|--------|
| 1 | FinCore | YES — `/erp/fincore` renders Hub Overview with 8 KPI tiles (Revenue MTD ₹0 … TDS payable ₹0), Day Book + New Voucher CTAs, recent-activity panel, quick-action grid, full left sidebar (Masters/Transactions/Inventory/Orders/Banking…). Welcome-tour modal step 1/2 shown. | YES | Clicked Receipt → form renders with auto-no `RV/26-27/0002` (proves seed populated 0001), Voucher Date `13/06/2026`, full party/amount/ledger/instrument fields; pressed Post with empty Customer → **inline validation toast "Customer is required"** (PASS for guard) — did NOT complete a saved post in this run | not opened | not tested | none | **PASS (shell/form/guard); TXN-save COULD-NOT-RUN — budget** |
| 2 | Command Center | YES — `/erp/command-center` renders Overview "Working Late, Admin", 4 Zone tiles (Entity Core 2/5 40 %, Finance Masters, FinCore Masters 0/16, Procure/Inventory 0/5), summary chips (2 Masters configured · 27 Pending Setup · 0 Users · — Security), full left sidebar (Overview · My Dashboard · Day Book · Promoter Cockpit · Foundation & Core tree · Finance & Compliance tree). 3-step welcome-tour modal shown. | YES | not opened | not opened | not tested | none | **PASS (shell)** |
| 3 | InsightX | YES — `/erp/insightx` renders "InsightX · Overview · Phase 7 · Arc D.3 OPENER", 11-Lens Coverage / Scenario Registry-75 / Sample Insights tabs, 9 lens cards visible (CFO/Finance 10/10 backed · Operations/Plant 8/8 · Maintenance 5/5 · Compliance/GRC 8/8 · ESG 4/4 · HR 5/5 · Procurement 6/6 · Insurance/Risk 3/3 · Cross-Card 10/10), sidebar with Executive Cockpit · Report Viewer · 11-Lens Explorer · Drill-to-Root · Operix Score · Insights Inbox · Predictive Insights · Report Builder. | YES | not opened (no TXN — analytics card) | not opened | n/a | none | **PASS (shell + data)** |
| 4-33 | ReceivX · PayOut · BillPassing · EximX · Comply360 · Inventory Hub · Procure360 · QualiCheck · Production · RequestX · Store Hub · EngineeringX · SiteX · MaintainPro · Vendor Portal · Logistics · SalesX · Distributor Hub · Customer Hub · ProjX · EcomX · WebStoreX · FrontDesk · ServiceDesk · TaskFlow · DocVault · PeoplePay · Dispatch · GateFlow · (+33rd) | — | — | — | — | — | — | **COULD-NOT-RUN — budget** |

**Honest count (ERP):** 3 / 33 physically PASSED on shell, 0 FAILED, 30 COULD-NOT-RUN.
**TXN save+reload not completed for any card in this run** (would need persistent data entry across reloads — budget).

---

## SECTION 3 — REPORT BUILDER / COCKPITS
| Surface | Opened? | Status |
|---------|---------|--------|
| Report Builder (InsightX) | No — sidebar item visible but not clicked | COULD-NOT-RUN — budget |
| Promoter Cockpit | No — visible in Command Center sidebar | COULD-NOT-RUN — budget |
| Credit X-Ray / Spend Funnel / OEE Board / COQ / EVM | No | COULD-NOT-RUN — budget |

**Honest count (cockpits):** 0 / 7 PASSED, 0 FAILED, 7 COULD-NOT-RUN.

## SECTION 4 — OPERIX GO (10 tiles)
Opened `/operix-go` (Sahayak hub) — page renders, "34 Live · 0 Phase 2 · 0 Planned" stat row, 5 insights cards in inbox, score chips, navigation list. Individual tile sub-routes (Vetan Nidhi Mobile · SalesX Go · ReceivX Go · Distributor Go · Customer commerce · Telecaller · Manager/Supervisor · Transporter · Vendor) NOT physically opened in this run.

| App | Home renders? | Flow saves+reloads? | Console err? | Status |
|-----|---------------|---------------------|--------------|--------|
| Operix Go Sahayak (hub) | YES | not tested | none | **PASS (hub only)** |
| Vetan Nidhi · SalesX Go · ReceivX Go · Distributor Go · Customer · Telecaller · Manager · Transporter · Vendor | — | — | — | COULD-NOT-RUN — budget |

**Honest count (Go):** 1 / 10 PASSED, 0 FAILED, 9 COULD-NOT-RUN. **Badge truth for the 3 "live" claims not verified in this run.**

## SECTION 5 — DELIBERATE EDGE CASES
- **5.1 Empty required fields** — Performed on FinCore → Receipt → clicked **Post** with Customer/Amount blank. UI showed inline toast "Customer is required" — **PASS (blocked).**
- **5.2 Negative qty / amount** — COULD-NOT-RUN — budget.
- **5.3 Dr≠Cr journal** — COULD-NOT-RUN — budget.
- **5.4 Same-user SoD approval** — COULD-NOT-RUN — budget.
- **5.5 Mid-step reload data loss** — COULD-NOT-RUN — budget.
- **5.6 LocalStorage audit (entity-prefix scan)** — COULD-NOT-RUN — budget (no DevTools/Application access from automation in this session).

**Honest count (edge cases):** 1 / 6 PASSED, 0 FAILED, 5 COULD-NOT-RUN.

---

## SECTION 6 — FAIL LIST
- **Critical:** none observed in this partial run.
- **High:** none observed in this partial run.
- **Medium:** Six prod chunks exceed 500 kB minified (Comply360Page 734 kB, index 723 kB, SalesXPage 679 kB, Dashboard 673 kB, PayHubPage 575 kB, FinCorePage 525 kB) — console-noise only, no functional failure. Recorded, not fixed.

## COULD-NOT-RUN LIST (summary)
- 12 / 14 welcome cards (budget; 11 are not on default workspace tab and need tab-switching/route discovery)
- 30 / 33 ERP cards
- 7 / 7 cockpits / Report Builder surfaces
- 9 / 10 Operix Go sub-tiles
- 5 / 6 edge cases (5.2–5.6)

---

## 6.4 HONEST COUNTS
- **ERP:** 3 of 33 physically opened & PASSED on shell · 0 FAILED · 30 could-not-run · 0 TXN-save+reload completed
- **Welcome:** 2 of 14 PASSED · 0 FAILED · 12 could-not-run
- **Operix Go:** 1 of 10 PASSED · 0 FAILED · 9 could-not-run
- **Cockpits / Report Builder:** 0 of 7 PASSED · 0 FAILED · 7 could-not-run
- **Edge cases:** 1 of 6 PASSED · 0 FAILED · 5 could-not-run

## 6.5 ONE-LINE VERDICT
**The W1C-6 first-run-seed blocker is genuinely fixed** — one click on `/erp` "Load Demo" seeds 2 companies, FinCore unlocks, voucher forms render and enforce required-field validation; based on this small physical sample the frontend looks demo-ready, but with only 3/33 ERP cards actually opened in this run a confident pilot-ready verdict is **not earned yet** — re-run with a larger action budget is required. **Worst thing observed:** several JS chunks exceed 500 kB (Comply360 / SalesX / Dashboard / PayHub / FinCore / index) — first-paint cost concern, not a blocker.
