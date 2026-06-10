# Operix `/erp/dashboard` — CRUD Roundtrip & Playwright Methodology

**Generated:** 10 June 2026 · 23:10 IST
**Source of truth:** `src/components/operix-core/applications.ts` @ HEAD `1ecc878d` · existing Playwright wiring at `./playwright.config.ts` (factory: `lovable-agent-playwright-config`).
**Author method:** Built fresh from current code. **Methodology only.** No spec code is shipped, no Playwright is executed in this document.
**Scope:** Document 4 of 4. The CRUD round-trip contract and the Playwright pattern that would prove it for each of the 33 cards. Executing this contract is a separate engineering deliverable (not part of an audit document).

---

## 0. Method statement

1. The 33-card spine is the same as Documents 1–3 (re-verified at this HEAD: `grep -c "status: 'active'"` → 33).
2. Playwright is **already wired** in the repo (`playwright.config.ts` uses `createLovableConfig` from `lovable-agent-playwright-config`). **Zero `.spec.ts` files exist on HEAD** (`find . -path ./node_modules -prune -o -name "*.spec.ts" -print` → empty). This document does not add any.
3. "CRUD round-trip" in this document means: **Create → Read (list + detail) → Update (one field) → Delete (or soft-cancel) → Verify post-state**, performed against the primary domain entity of each card. Reports are explicitly excluded — they were the subject of Document 3.
4. The Indian-benchmark and Global-benchmark columns from Document 1 are referenced by name only (TallyPrime 7.0 / Fusion 25C / NetSuite 2025.1) — they set the bar for **what a buyer will try to do** in a 15-minute demo. Each card's round-trip is scoped so that the same scenario can be replayed on a competitor demo tenant.
5. **Did NOT do** — execute Playwright; author any `.spec.ts`; touch `src/`, `tests/`, configs, `package.json`, sprint-history, sibling-register, memory; invent timing or pass/fail counts.

---

## 1. CRUD round-trip contract

For every card, a passing round-trip means the following five assertions all hold in sequence on a clean preview:

| # | Step | Assertion | Failure mode it catches |
|---|---|---|---|
| C | Create | After save, the created record is visible in the list view with the entered key fields, and a deterministic ID/voucher number is rendered (no `undefined`/`NaN`/`Lorem`) | Form submit no-ops; localStorage key drift; ID generator regression |
| R-list | Read (list) | The new record appears in default-sorted list within ≤1s; filter by its key value returns exactly 1 row | Indexing/sort regression; filter predicate bug |
| R-detail | Read (detail) | Clicking the row opens detail view rendering every field entered at Create | Detail-route param parsing; entity-by-id loader regression |
| U | Update | Edit one designated field, save, return to list — the row reflects the new value; audit-trail entry exists where MCA Rule 3 applies | Optimistic-update drift; audit-log skip |
| D | Delete / cancel | Delete (or soft-cancel where deletion is not permitted, e.g. posted vouchers) returns the list to its prior count; D-127 zero-touch rule honoured for accounting vouchers (cancellation, not deletion, on posted records) | Cascade leak; D-127 violation; ghost records |

All five must use **deterministic test data** (no `Lorem`, no `$`, ₹ in paise integers, `DD MMM YYYY` dates, Indian phone 6-9, valid GSTIN/PAN format) per the Indian-locale Core memory rule. The 6th implicit assertion is **no console error / no network 4xx-5xx** emitted by the React layer during the run.

---

## 2. Per-card round-trip table

For each card: **primary entity**, **route under test**, **D-127 status** (whether Delete or Cancel applies), **Create payload key fields**, **Update field**, **post-state verification** (which derived view also updates), **competitor parity check** (what a buyer will replay on a Tally/Fusion/NetSuite demo to compare).

Files cited are HEAD locations from Documents 1–2; no new file paths are invented.

### 2.1 Ops Hub

| # | Card | Primary entity | Route | D-127 | Create key fields | Update field | Post-state verification | Competitor parity scenario |
|---:|---|---|---|---|---|---|---|---|
| 1 | Command Center | Org / Entity master | `/erp/command-center` | Delete allowed for unposted-against masters | name, code, GSTIN, address | address line 2 | Replica refreshed in every consuming card (spot-check 1 card) | Tally `Company Info > Alter`; Fusion MDG `Manage Customers/Suppliers` |
| 2 | Procure360 | Purchase Order | `/erp/procure-hub` → PO create | Cancel only after GRN; Delete pre-GRN | vendor, item, qty, rate, expected date | expected date | `PoStatusByEnquiryPanel`, `PoAgingCrossDeptPanel` reflect change | Tally `Purchase Order Voucher`; Fusion `Create PO`; NetSuite `New Purchase Order` |
| 3 | Main Store Hub | GRN | `/erp/main-store-hub` → GRN create | Cancel only (D-127); Delete forbidden post-post | PO ref, qty received, batch, location | batch number | `GRNRegisterV2`, `StockLedgerReport` reflect change; Bill Passing 3-way picks up | Tally `Receipt Note`; Fusion `Receive Returns`; NetSuite `Item Receipt` |
| 4 | QualiCheck | NCR | `/erp/qualicheck` | Soft-close, not delete | source GRN, defect code, qty rejected, root cause | root cause text | `NcrRegister`, `CapaRegister` linkage created | Fusion Quality Inspection result; NetSuite QM SuiteApp |
| 5 | GateFlow | Gate Pass | `/erp/gateflow` | Delete allowed pre-exit | vehicle no, party, purpose, time in | time out | Vehicle log filter shows out-time; Procure360 GRN linkage if inward | Fusion Yard Logistics gate event; SAP Yard Mgmt gate book |
| 6 | Production | Work Order | `/erp/production` | Cancel only after issue; Delete pre-issue | item, qty, route, planned start | planned start date | `ProductionOrderRegister`, `OEEDashboard`, `WIPReport` reflect | Tally ✖; Fusion `Create Work Order`; NetSuite `Create Work Order` |
| 7 | MaintainPro | Maintenance Ticket | `/erp/maintainpro` | Close, not delete | equipment, fault code, priority | assigned-to | `OpenTicketsLive`, `MTBFMTTRReport` update | Fusion `Create Work Request`; NetSuite Fixed Assets ✖ (partner CMMS) |
| 8 | RequestX | Indent | `/erp/requestx` | Cancel pre-PO; Delete pre-approval | category, item, qty, requested-by | qty | `IndentPending` → `IndentClosed` on PO conversion | Tally `Indent Voucher`; Fusion `Submit Requisition`; NetSuite `Create Requisition` |
| 9 | EngineeringX | Drawing | `/erp/engineeringx` | New revision, not delete | drawing no, revision, project, owner | revision number | DocVault entry created (cross-card check); BOM linkage refreshed | Fusion PLM `Create Item Revision`; SAP EPD Item; NetSuite ◐ Item Revision |
| 10 | Department Stores | MIN (Material Issue Note) | `/erp/department-store` | Cancel only; Delete forbidden | dept, item, qty, issued-by | qty | `DepartmentConsumptionSummary`, Main Store Hub `ConsumptionRegister` reflect | Tally `Stock Journal`; Fusion `Sub-Inventory Transfer`; NetSuite `Inventory Transfer` |
| 11 | Vendor Portal | Vendor master | `/erp/vendor-portal` | Soft-disable, not delete | name, PAN, GSTIN, MSME status, bank | MSME status flag | PayOut respects MSME-43BH stop-clock immediately | Fusion `Supplier Profile`; NetSuite `Vendor Record`; Tally `Ledger > Vendor` |
| 12 | SiteX | Site / DPR entry | `/erp/sitex` | Close, not delete | site code, date, weather, manpower, photos count | manpower count | `SiteTwinDashboard` reflects; project-imprest reconciles | Fusion PPM + EHS combined ✖ (split); NetSuite ✖ |
| 13 | Logistics | LR (Lorry Receipt) | `/erp/logistics` | `UNVERIFIED` — page existence pending S1 fix (Doc 2) | LR no, transporter, vehicle, freight | freight amount | `TransporterScorecard`, Dispatch `PODRegister` reconcile | Fusion TM `Create Trip`; SAP TM Freight Order |

### 2.2 Sales Hub

| # | Card | Primary entity | Route | D-127 | Create key fields | Update field | Post-state verification | Competitor parity scenario |
|---:|---|---|---|---|---|---|---|---|
| 14 | SalesX Hub | Sales Order | `/erp/salesx` | Cancel only post-confirm | customer, item, qty, rate, delivery date | delivery date | `SalesOrderRegister`, `SalesOrderTrackerReport`, stock reservation reflect | Tally `Sales Order`; Fusion `Create Sales Order`; NetSuite `New Sales Order` |
| 15 | Distributor Hub | Distributor Order | `/erp/distributor-hub` | Cancel only | distributor, scheme code, items | scheme code | `SchemeEffectivenessReport`, `DistributorOrderRegister` reflect | Marg distributor order; Fusion Channel Revenue Mgmt |
| 16 | Customer Hub | Customer master / Opportunity | `/erp/customer-hub` | Soft-disable for master; Delete pre-stage for opportunity | name, GSTIN, segment, owner | segment | `CLVRankingsReport`, SalesX pipeline reflect | Zoho CRM Lead/Account; Fusion CX Sales; NetSuite CRM |
| 17 | ProjX | Project | `/erp/projx` | Close, not delete | code, customer, start, budget | budget | Every other card stamps new `project_centre_id` (D-218) — spot-check Procure360 PO | Fusion PPM `Create Project`; NetSuite SuiteProjects |
| 18 | WebStoreX | Product / Catalog item | `/erp/webstorex` | Unpublish, not delete | SKU, title, price, brand, category | price | Public storefront preview reflects (manual visual check) | Fusion Commerce Cloud; SuiteCommerce; SAP Commerce Cloud |
| 19 | EcomX | Marketplace Order (ingested) | `/erp/ecomx` | No delete (source-of-truth marketplace) | marketplace, marketplace order id, items, settlement | settlement reconciliation status | SalesX voucher created; 194-O TDS line correct (₹ paise integer) | ✖ no Tier-1 vendor ships Indian-marketplace claims natively |

### 2.3 Fin Hub + International Trade

| # | Card | Primary entity | Route | D-127 | Create key fields | Update field | Post-state verification | Competitor parity scenario |
|---:|---|---|---|---|---|---|---|---|
| 20 | Fin Core | Sales Voucher | `/erp/fincore` | **Cancel only** (D-127 strict; voucher-integrity hash check) | customer, items, GST split, IRN flag | narration only (no amount edit post-IRN) | `DayBook`, `LedgerReport`, `TrialBalance`, `GSTR-1 preview`, `IRNRegister` reflect; hash unchanged where field is non-financial | Tally `F8 Sales`; Fusion `Create Invoice`; NetSuite `Invoice` |
| 21 | Comply360 | GSTR-1 period | `/erp/comply360` | No delete (statutory file) | period selection, file-from voucher set | acknowledgement entry | Health Score tile recalculates; statutory memory updates | Tally `GSTR-1`; Fusion India localisation pack; NetSuite SuiteTax India |
| 22 | PayOut | Payment Run | `/erp/payout` | Cancel pre-execute; no delete post-execute | vendor set, due-cutoff date, bank | bank | MSME-43BH due rows highlighted (CC `vendor.msme_status` honoured); paise integer arithmetic | Tally `Payment Voucher`; Fusion `Payment Process Request`; NetSuite `Pay Bills` |
| 23 | ReceivX | Collection / Receipt | `/erp/receivx` | Cancel only post-post | customer, instrument type, amount, against-invoices | instrument number | `AgingByPerson`, `CollectionEfficiency` reflect | Tally `Receipt Voucher`; Fusion `Apply Receipt`; NetSuite `Customer Payment` |
| 24 | Bill Passing | Vendor Invoice | `/erp/bill-passing` | Cancel pre-post | vendor, PO ref, GRN ref, amount, GST, TDS | TDS section code | 3-way match status flips correctly; PayOut queue reflects | Fusion `Create Invoice with Match`; NetSuite `Vendor Bill`; SAP MIRO |
| 25 | FP&A / Planning | Budget Line | `/erp/fpa-planning` | Delete pre-lock; lock post-approval | entity, account, period, amount | amount | Cascade to lower tiers (D-D.0); scenario rollup updates | EPM Cloud `Create Form Data`; NSPB `Update Plan`; SAC Planning |
| 26 | EximX | Export Shipment | `/erp/eximx` | Cancel pre-shipment | buyer country, incoterm, items, IEC, LUT flag | incoterm | FEMA 270-day timer starts; landed-cost replay engine queues | Fusion GTM `Create Shipment`; SAP GTS Customs Declaration |

### 2.4 Pay Hub, Dispatch, FrontDesk, Support, InsightX

| # | Card | Primary entity | Route | D-127 | Create key fields | Update field | Post-state verification | Competitor parity scenario |
|---:|---|---|---|---|---|---|---|---|
| 27 | PeoplePay | Employee | `/erp/pay-hub` | Soft-exit, not delete | name, PAN, UAN, PF/ESI flags, CTC | CTC | Next payroll run reflects (paise integer salary breakup) | Tally ✖; Fusion HCM `New Hire`; Zoho People Add Employee; SuccessFactors EC |
| 28 | Dispatch Hub | Delivery Memo | `/erp/dispatch` | Cancel pre-dispatch | SO ref, items, transporter, vehicle | transporter | `DeliveryMemoRegister`, E-Way Bill draft created | Tally `Delivery Note`; Fusion `Ship Confirm`; NetSuite `Item Fulfillment` |
| 29 | FrontDesk | Visitor entry | `/erp/frontdesk` | Delete pre-close | visitor name, phone, host, purpose | host | Visitor log + (when implemented) GateFlow link | Fusion ✖; partner add-on land |
| 30 | ServiceDesk | Service Ticket | `/erp/servicedesk` | Close, not delete | customer, asset, issue, SLA tier | technician assignment | `SLAPerformance`, `AMCProfitabilityPerCustomer` reflect; `CSATHappyCode` capture armed on close | Fusion Field Service ticket; NetSuite FSM ticket; Zoho Desk ticket |
| 31 | TaskFlow | Task | `/erp/taskflow` | Delete pre-active; close post-active | title, owner, due, dept | owner | Accountability dashboard tile refreshes for both old and new owner | SuiteFlow workflow instance; Power Automate flow run |
| 32 | DocVault | Document | `/erp/docvault` | New version, not delete | name, dept, file ref, tags | tags | `VersionVelocityReport`, `DocumentsByDeptReport` reflect | Fusion WebCenter Content; NetSuite File Cabinet; SAP DMS |
| 33 | InsightX | (no CRUD; read-only) | `/erp/insightx` | N/A — write-forbidden by architectural lock (lines 402-407 of `applications.ts`) | N/A | N/A | **Anti-test:** posting from InsightX must fail with the read-only guard; the spec asserts the lock holds | Fusion Analytics dashboards (read-only); NSAW (read-only) |

---

## 3. Playwright pattern (specification only)

The pattern below is the contract any future spec must follow. Nothing here is committed as a `.spec.ts` file in this document.

### 3.1 File and naming convention

```
tests/e2e/erp/<card-id>/<entity>-crud.spec.ts
```

One spec file per card. The file name carries the card-id from `applications.ts` so the audit trail is unambiguous.

### 3.2 Spec skeleton (illustrative — not committed)

```ts
// tests/e2e/erp/procure-hub/po-crud.spec.ts   <-- NOT created in this document
import { test, expect } from "@playwright/test";

test.describe("Procure360 · PO round-trip", () => {
  test("Create → Read → Update → Cancel → verify post-state", async ({ page }) => {
    await page.goto("/erp/procure-hub");

    // CREATE
    await page.getByRole("button", { name: /new po/i }).click();
    // ... fill deterministic Indian-locale payload (₹ paise, DD MMM YYYY) ...
    await page.getByRole("button", { name: /save/i }).click();
    const poNumber = await page.getByTestId("po-number").innerText();
    expect(poNumber).toMatch(/^PO\/\d{4}\/\d+$/);

    // READ-list
    await expect(page.getByText(poNumber)).toBeVisible();

    // READ-detail
    await page.getByText(poNumber).click();
    await expect(page.getByTestId("vendor-name")).toHaveText(/Acme Industries/);

    // UPDATE
    await page.getByTestId("expected-date").fill("15 Jul 2026");
    await page.getByRole("button", { name: /save/i }).click();

    // CANCEL (D-127: PO can be cancelled pre-GRN)
    await page.getByRole("button", { name: /cancel po/i }).click();
    await expect(page.getByTestId("po-status")).toHaveText(/Cancelled/);

    // POST-STATE: PoAgingCrossDeptPanel reflects new status
    await page.goto("/erp/procure-hub/reports/PoAgingCrossDeptPanel");
    await expect(page.getByText(poNumber)).toHaveText(/Cancelled/);

    // 6th implicit assertion: no console errors during the run is captured by
    // a global page.on("pageerror") listener in playwright.config.ts.
  });
});
```

### 3.3 Required `data-testid` taxonomy

Specs must rely on a stable `data-testid` taxonomy, not on visible text (which is i18n-variable per `mem://localization/hindi-framework`). Suggested namespace:

```
data-testid="{card-id}.{entity}.{field-or-action}"
e.g. "procure-hub.po.expected-date"
     "fincore.voucher.save"
     "insightx.lock.guard"
```

If the codebase does not yet expose these, the spec authoring sprint must add them as a non-invasive preparatory commit.

### 3.4 Test-data factories

A single factory module `tests/e2e/factories/india.ts` (to be authored separately) must expose:

- `gstin(state, pan)` → valid 15-char GSTIN with checksum
- `pan()` → valid 10-char PAN
- `phone()` → 10-digit starting 6-9
- `paise(rupees)` → integer paise (per `mem://standards/money-math-precision`)
- `date(d, m, y)` → IST-correct `DD MMM YYYY` string

Specs **must not** call `faker` with default locales (US-centric), per the Indian-locale Core memory rule and the prohibition on `$`.

### 3.5 D-127 enforcement in tests

For any card whose D-127 column reads "Cancel only" or "Soft-disable":

- The spec must attempt Delete via the destructive route and assert a **guard rejection** (HTTP 403 / disabled button / toast: "Cannot delete posted record").
- The spec must then perform the legal Cancel/Soft-disable instead and assert the record persists with a `status = 'Cancelled' | 'Inactive'` flag.

### 3.6 Audit trail assertion (where MCA Rule 3 applies)

For Fin Core, Bill Passing, PayOut, ReceivX, EximX: after the Update step the spec must navigate to `AuditTrailReport` (Fin Core) or the card's equivalent audit surface and assert one new row with the editing user, timestamp (IST), old value, new value. Per `mem://logic/mca-audit-trail` and `mem://standards/voucher-integrity-hashing`.

### 3.7 Competitor parity scenario (out-of-band)

The "competitor parity scenario" column in §2 is **not** automated. It is the script for a human running the same flow on a Tally/Fusion/NetSuite demo tenant, measuring click count + time-to-complete + visible compliance hooks. That comparison belongs in a sales/demo workbook, not in a Playwright spec.

---

## 4. CI / execution plan (specification only)

| Stage | What runs | Where |
|---|---|---|
| Pre-commit | `tsc --noEmit` (per `mem://architecture/coding-standards`) | local + CI lint |
| PR check | Vitest unit tests + Playwright specs scoped to the changed card | CI |
| Nightly | All 33 card round-trip specs in parallel (5 shards × ~7 specs each) against the latest preview build | CI nightly |
| Pre-release | Full matrix + axe-core a11y audit on the entity-detail pages | CI release gate |

Failure handling: a card's spec failing must block merge for any PR touching that card's folder; not for PRs touching unrelated cards.

---

## 5. Coverage rollup (what the suite WILL prove once authored)

| Coverage class | Cards covered | Notes |
|---|---:|---|
| Full CRUD round-trip | 31 of 33 | InsightX is read-only (anti-test only); Logistics is `UNVERIFIED` until S1 (Doc 2) resolves |
| D-127 Cancel-only enforcement | 11 cards (every Fin Hub voucher + Production WO + GRN + MIN + Dispatch DM + ServiceDesk close + EximX shipment) | Direct compliance hook |
| MCA Rule 3 audit-trail assertion | 5 cards (Fin Core, Bill Passing, PayOut, ReceivX, EximX) | Mandatory before any India SME pitch |
| Cross-card post-state spot-check | 13 cards | Catches integration regressions (e.g. PO update → Aging report; MIN → Department consumption report; Vendor MSME flip → PayOut stop-clock) |
| Anti-test (write-forbidden guard) | 1 card (InsightX) | Locks the read-only architectural rule into CI |

---

## 6. What this document explicitly does **not** ship

- Any `.spec.ts` file (zero on HEAD; zero added).
- Any `data-testid` additions in `src/`.
- Any factory module under `tests/e2e/factories/`.
- Any `package.json` script (Playwright command exists via `lovable-agent-playwright-config`).
- Any executed run / pass-fail count / timing data.

Authoring the spec suite is a separate sprint (sized at minimum 33 spec files + 1 factory module + the `data-testid` instrumentation commit; expected ~3 sprints to land cleanly with cross-card spot-checks).

---

## 7. Method appendix

### 7.1 Commands run
```
git rev-parse HEAD                                       # 1ecc878d...
grep -c "status: 'active'"  src/components/operix-core/applications.ts   # 33
cat playwright.config.ts                                # uses createLovableConfig
find . -path ./node_modules -prune -o -name "*.spec.ts" -print  # zero specs
```

### 7.2 Non-actions
- No edits to `src/`, `tests/`, `package.json`, configs, sprint-history, sibling-register, memory.
- No Playwright execution. No browser automation in this audit.
- No scoring, no timing, no fabricated pass-rates.
- No carry-over from any prior audit document.

### 7.3 Cross-document index

| Document | File |
|---|---|
| 1 · Feature Comparison | `docs/audits/operix-erp-dashboard-feature-comparison-2026-06-10-IST.md` |
| 2 · Enhancement Roadmap | `docs/audits/operix-erp-dashboard-enhancement-roadmap-2026-06-10-IST.md` |
| 3 · 3-Dimension Reports Audit | `docs/audits/operix-erp-dashboard-3dimension-reports-2026-06-10-IST.md` |
| 4 · CRUD Roundtrip & Playwright Methodology | `docs/audits/operix-erp-dashboard-crud-roundtrip-playwright-2026-06-10-IST.md` |

---

**End of Document 4.** Audit set complete.
