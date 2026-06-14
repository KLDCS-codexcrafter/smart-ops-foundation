# CARD DEEP-DIVE · WELCOME (the post-login hub)
## Operix Developer Handbook — Card Series

**Verified against:** `src/pages/Welcome.tsx` at freeze `c30f161`.
**Track relevance:** Frontend (primary) · Mobile (OperixGo launch surface) · Backend (provisioning queue is a Wave-2 endpoint).

---

## 1. What it is / what it's for
The Welcome page is the **post-login landing hub** — the first thing every user sees after authenticating, and the launchpad to every platform surface. It is not a department card like the ERP modules; it's the **top-level workspace** from which you enter the ERP, the admin consoles, the portals, and the mobile apps. It also hosts the **self-serve configurator** (the Prudent360 "Build-Your-Plan" experience).

## 2. Where it lives
- **File:** `src/pages/Welcome.tsx`
- **Route:** `/welcome`
- **Reached from:** `Login` (all five roles route here after auth).

## 3. Structure — three tabs
The page is organised as three tabs (state: `WelcomeTab = "workspace" | "support" | "server"`):

### Tab 1 — Workspace (the launchpad)
A grid of platform surfaces. Verified entries and where each goes:
| Surface | Route | Purpose |
|---|---|---|
| Control Tower | `/tower/dashboard` | Platform management & customer admin — users, plans, billing, security |
| Bridge Console | `/bridge/dashboard` | Tally sync operations & exception management — live bridge agent monitoring |
| Operix (Udyam Kendra Prism Nexus) | `/erp/dashboard` | The Business Operations Hub — the full 33-card ERP |
| Partner Panel | `/partner/dashboard` | Partner dashboard & commission management |
| Customer Portal | `/customer/dashboard` | Self-service invoices, payments, orders, support for B2B clients |
| Vertical | `/verticals` | Industry ERPs (Hospital, School live; Hotel/Clinic/Pharmacy/Construction/Agriculture planned) |
| Modules | `/modules` | Standalone modules (GateFlow, Vetan Nidhi payroll) |
| Add-ons | `/add-ons` | Optional extensions (Barcode; planned WhatsApp, AI forecasting) |
| Operix Go (Sahayak) | `/operix-go` | Mobile apps — ESS + manager approvals; PWA + Capacitor |
| Client Customized | `/client-customized` | Bespoke per-client builds |

### Tab 2 — Support Ops
Support/ticket operations view (CLN1 stub today — mock-ticket data). Where support agents triage.

### Tab 3 — Server Ops
Server/infrastructure operations view — the ops-facing surface.

## 4. The self-serve configurator
Within Workspace, the **Prudent360 configurator** lets a user compose ERP cards, modules, add-ons and conditions, see a **live quote**, and **drop a request into the provisioning queue**. Today the queue is local; **checkout & instant provisioning arrive with Wave-2** (a `[JWT]` provisioning endpoint).

## 5. Header, sidebar, profile on this page
Welcome renders inside the global shell context but is itself the hub (not a deep ERP card), so it leads with its own tabbed layout. From here, entering `/erp/*` brings up the full `ERPHeader` + `AppSidebar` shell described in the handbook Part 2.3.

## 6. Track notes
- **Frontend:** keep the Workspace grid data-driven; each tile is a route. New top-level surfaces are added here.
- **Mobile:** the "Operix Go" tile is the entry to the OperixGo apps; mobile devs land users here or deep-link past it.
- **Backend (Wave-2):** the configurator's provisioning-queue submission and the per-role routing become real API calls; the mock-ticket Support Ops data becomes a real ticket service.

## 7. Gotchas
- Welcome is role-aware in intent but Wave-1 mock-auth sends everyone in as `tenant_admin` — don't assume role-gating is enforced yet (it's a Wave-2 server concern).
- The Workspace tiles point at surfaces in varying states of completeness (some are full apps, some planned) — the descriptions name what's live vs planned; preserve that honesty.

---
*Card deep-dive · Welcome · verified at c30f161 · Operix Developer Handbook card series.*
