# CAT1 Close Summary · T-CAT1-Modules-AddOns · 110 ⭐

**Sprint:** CATALOG-1 · T-CAT1-Modules-AddOns
**Predecessor:** `630bdd2a` (PRUDENT360 · 109 ⭐)
**Streak target:** 110 ⭐
**New SIBLING:** NONE (catalog data refresh · `newSiblings: []`)
**Scope:** refresh `/modules` (6 → 28 entries) + `/add-ons` (4 → 12 entries) · catalog-entries-ONLY (no per-module landing pages) · honest phases · entries route to existing card surfaces

---

## Modules · 28 entries

| # | Name | Section | Route | Phase | Built capability |
|---|---|---|---|---|---|
| 1  | Accounts Basic                       | Accounts          | `/erp/fincore`                    | phase2 | FinCore |
| 2  | Accounts Standard                    | Accounts          | `/erp/fincore`                    | phase2 | FinCore + InventoryHub + Comply360 |
| 3  | Multi-Entity Consolidation           | Accounts          | `/erp/comply360`                  | phase2 | Comply360 consolidation engine |
| 4  | FAR — Fixed Assets Register          | Accounts          | `/erp/fa-physical-verification`   | phase2 | FA pack + Comply360 fixed-assets |
| 5  | Sales CRM Basic                      | Sales             | `/erp/salesx`                     | phase2 | SalesX |
| 6  | Sales CRM Advanced                   | Sales             | `/erp/salesx`                     | phase2 | SalesX + commission-engine + distributor-hub |
| 7  | ReceivX Collections                  | Sales             | `/erp/receivx`                    | phase2 | ReceivX |
| 8  | Purchase Management                  | Procure & Store   | `/erp/procure-hub`                | phase2 | Procure360 + bill-passing |
| 9  | Store Management                     | Procure & Store   | `/erp/store-hub`                  | phase2 | StoreHub |
| 10 | Quality Check                        | Procure & Store   | `/erp/qualicheck`                 | phase2 | QualiCheck |
| 11 | Purchase + Store Bundle              | Bundles           | `/erp/procure-hub`                | phase2 | Procure360 + StoreHub |
| 12 | Store + QC Bundle                    | Bundles           | `/erp/store-hub`                  | phase2 | StoreHub + QualiCheck |
| 13 | Procure-to-Pay Bundle                | Bundles           | `/erp/procure-hub`                | phase2 | Procure360 + StoreHub + bill-passing + Payout |
| 14 | CRM Advanced + Accounts Bundle       | Bundles           | `/erp/salesx`                     | phase2 | SalesX + FinCore + ReceivX |
| 15 | TaskFlow                             | Workflow & Docs   | `/erp/taskflow`                   | phase2 | TaskFlow |
| 16 | Document Management                  | Workflow & Docs   | `/erp/docvault`                   | phase2 | DocVault |
| 17 | DMS — Approvals + e-Sign Wrap        | Workflow & Docs   | `/erp/docvault`                   | phase2 | DocVault + approval workflow |
| 18 | Budget Management                    | Workflow & Docs   | `/erp/fpa-planning`               | phase2 | FP&A Planning engines |
| 19 | Production / MRP                     | Operations        | `/erp/production`                 | phase2 | Production |
| 20 | Maintenance CMMS                     | Operations        | `/erp/maintainpro`                | phase2 | MaintainPro |
| 21 | Payments / Payout                    | Operations        | `/erp/payout`                     | phase2 | PayOut |
| 22 | Warehouse WMS                        | Operations        | `/erp/inventory-hub`              | phase2 | InventoryHub WMS |
| 23 | ServiceDesk                          | Operations        | `/erp/servicedesk`                | phase2 | ServiceDesk |
| 24 | GateFlow                             | Operations        | `/erp/gateflow`                   | phase2 | GateFlow |
| 25 | WebStoreX Storefront                 | Flagship          | `/erp/webstorex`                  | phase2 | WebStoreX |
| 26 | EcomX Marketplace Settlement         | Flagship          | `/erp/ecomx`                      | phase2 | EcomX |
| 27 | Comply360                            | Flagship          | `/erp/comply360`                  | phase2 | Comply360 |
| 28 | EximX                                | Flagship          | `/erp/eximx`                      | phase2 | EximX |
| 28*| Vetan Nidhi — वेतन निधि               | Flagship          | `/modules/vetan-nidhi`            | phase2 | PeoplePay + PayOut + Comply360 payroll |

> Vetan Nidhi keeps its legacy `/modules/vetan-nidhi` route (the only allowed `/modules/*` landing left in place). Catalog total = 28.

---

## Add-ons · 12 entries

| # | Name | Route | Phase | Built capability |
|---|---|---|---|---|
| 1  | Barcode                       | `/add-ons/barcode`                          | phase2  | Barcode add-on page + InventoryHub labels |
| 2  | WhatsApp Integration          | `/erp/customer-hub`                         | phase2  | Customer Hub comm templates + useWaTemplates |
| 3  | AI Price Forecasting          | `/add-ons/ai-price` (non-clickable)         | planned | Not built — planned |
| 4  | Hardware Connectors           | `/add-ons/hardware` (non-clickable)         | planned | Not built — planned |
| 5  | Approval Workflows            | `/erp/fincore/registers/approvals-pending`  | phase2  | Approvals register + bridge/approvals |
| 6  | E-Invoice & E-Way Bill        | `/erp/comply360`                            | phase2  | Comply360 tax-GST + IRN locks |
| 7  | Tally Sync                    | `/bridge`                                   | phase2  | Bridge console + sync engine |
| 8  | Master Cleanup                | `/bridge/reconciliation`                    | phase2  | Bridge reconciliation |
| 9  | Tamper-Proof Audit            | `/bridge/audit`                             | phase2  | Voucher integrity hashing + MCA audit-trail |
| 10 | Omni-Channel Comms            | `/erp/servicedesk`                          | phase2  | ServiceDesk multi-channel |
| 11 | Analytics — InsightX          | `/erp/insightx`                             | phase2  | InsightX cockpit |
| 12 | Gate + Weighbridge            | `/erp/gateflow`                             | phase2  | GateFlow + weighbridge |

---

## §H walls held (0-DIFF)

- All ERP cards / engines (catalog only LINKS in)
- `src/components/operix-core/applications.ts`
- Entitlements (`src/types/card-entitlement.ts`)
- Hash-chain · retention engine
- Sidebar configs · App routing
- `sibling-register` (no new sibling beyond own narrative row)
- No new per-module landing-page files

## Allowlist diff

- M `src/pages/modules/ModulesPage.tsx` (28 entries + sections + capability mapping)
- M `src/pages/addons/AddOnsPage.tsx` (12 entries + capability mapping)
- M `src/lib/_institutional/sprint-history.ts` (PRUDENT360 → `630bdd2a` flip · CAT1 row appended)
- A `src/test/sprint-cat1/cat1-block-behavioral.test.ts` (≥20 it)
- A `audit_workspace/CAT1_close_evidence/CAT1_close_summary.md`

## Gates

Triple Gate to be pasted after final edit (tsc · eslint repo-wide --max-warnings 0 · vitest scoped (sprint-cat1 + sprint-p360 + sprint-b6 + sprint-p83–p87) · `npm run build` under `NODE_OPTIONS="--max-old-space-size=7168"`).

## Acceptance Criteria

AC1 Block-0 4/4 · AC2 ModulesPage = 28 / AddOnsPage = 12 · AC3 every phase2 route points at an EXISTING surface · AC4 only AI-Price + Hardware = planned · AC5 NO landing-page files created · AC6 NO new engine · AC7 capability cards + applications.ts 0-DIFF · AC8 ≥20 it() green · AC9 history + PRUDENT360 flip · AC10 walls zero diff · AC11 no new deps · close summary + origin/main advance to confirm after bank.
