# 4DSmartOps VISION · OPERIX PROJECT · PRUDENT360 BRAND
## The complete reference compendium — vision, build, brand, and origins
**Frozen state:** Wave-1 · commit `cbe2357` · 187 ⭐ · 14 June 2026 · verified against the live tree
**Status:** Permanent reference document, committed at repository root. Companion to `Operix_Architecture_of_Record_v1`. Updated only at major boundaries.

> **The three layers, in one line:** **4DSmartOps** is the *vision*, **Operix** is the *project/product being built*, and **Prudent360** is the *brand it is marketed under*. This document ties all three together — vision → build → brand — plus the origin sources behind them.

---

## PART I — WHAT YOU SEE (the live product, verified against the code)

### 1 · The Login page
Entry is `src/pages/auth/Login.tsx`. A user signs in with a credential and password. In Wave-1 this is **mock authentication** — `mockLogin` accepts any password of six or more characters and returns a `tenant_admin` role; the page also supports forgot-password and reset views. Five roles (super_admin, partner_admin, customer_user, operator, tenant_admin) all route to `/welcome` on success, with `/erp/dashboard` as the fallback. Real authentication, role enforcement, and tenant isolation are Wave-2 — every auth call is marked with a `[JWT]` seam comment (e.g. `POST /api/auth/...`).

### 2 · The Welcome page
After login, `src/pages/Welcome.tsx` is the post-login hub, organised into three tabs:
- **Workspace** — the gateway into the 33-card ERP (each tile routes to its card).
- **Support Ops** — routes into ServiceDesk.
- **Server Ops** — an operations/infrastructure view.

The Welcome page already speaks the brand name: its self-serve configurator tile describes "compose **Prudent360** ERP cards, modules, add-ons & conditions, see a live quote."

### 3 · Operix — the 33-card ERP (all verified active in the tree)
From the Workspace, the user enters the product. **33 cards, all status `active`**, organised into hubs:

- **Ops Hub (13):** Command Center, Procure360, Main Store Hub, QualiCheck, GateFlow, Production, MaintainPro, RequestX, EngineeringX, Department Stores, Vendor Portal, SiteX, Logistics
- **Fin Hub (6):** Fin Core, Comply360, PayOut, ReceivX, Bill Passing, FP&A / Planning
- **Sales Hub (6):** SalesX Hub, Distributor Hub, Customer Hub, ProjX, WebStoreX, EcomX
- **Support Hub (3):** ServiceDesk, TaskFlow, DocVault
- **Plus:** EximX (International Trade), PeoplePay (Pay Hub), Dispatch Hub, FrontDesk, InsightX

Beyond the ERP, the live tree also routes external portals and platform surfaces: `/partner`, `/customer`, `/vendor`, `/tower` (SaaS Control Tower), `/bridge` (Tally sync console), `/prudent360`, `/build-your-plan` (self-serve configurator), and `/operix-go` (mobile PWA).

**Scale at freeze (measured, not estimated):** 3,934 source files · 916 test files · 612 engines · 33/33 cards.

---

## PART II — THE OPERIX PROJECT (how it is built)

Operix is the ERP project — the repository, the engines, the frozen Wave-1. Its architecture of record is documented fully in `Operix_Architecture_of_Record_v1`; in brief:

- **Two waves:** Wave-1 is **Tier-L** (all state in browser localStorage, single-user, mock auth — a complete, navigable, demo-seedable product). Wave-2 is the real backend: **self-hosted PostgreSQL, India-resident (Rule 46(8)), Operix-owning all API/auth/realtime/storage** (decision DP-P8-2 — Postgres, not Supabase). Backend built in Claude Code, frontend wired by Lovable, contract = OpenAPI per card.
- **Engine layer:** 612 pure-function engines under `src/lib/` hold the business logic; pages are thin and call engines. Each engine's persistence call is the Wave-2 plug-in point.
- **Entity model:** every read/write is scoped to the active company through the canonical reactive `useEntityCode()` hook (578 files). Wave-1 closed with **zero** non-canonical entity-resolution patterns remaining repo-wide.
- **The Wave-1/Wave-2 boundary:** **1,434 files carry `[JWT]` seam markers** naming the API that replaces each localStorage call; 135 files carry declared Wave-2 stubs. These are the deliberately-drawn line between waves, not gaps.
- **Verified:** closed under a two-auditor protocol (zero fabrications), through a 7-of-7 freeze gate (full suite green, lint clean, TSC 0, entity-grep 0, deterministic).

**Honest claim:** Operix Wave-1 is **Tier-L-complete and Wave-2-ready** — not "production-ready." The Wave-2 production gates (financial-correctness audit of FinCore/Statutory/FA/Comply360, real auth, tenant isolation, security/pen-test) are carried forward and mandatory before any client data flows.

---

## PART III — THE 4DSmartOps VISION (the "why")

4DSmartOps is the product vision Operix realises — grounded in 25 years of real-client Tally/TDL experience. Its enduring tenets (from the v65 roadmap, still true):

- **One universal ERP, all industries.** Not many products — ONE product with a pluggable industry-pack layer over a battle-tested common core. India-first (GST/TDS/TCS/e-invoice/e-way-bill/MSME/multi-entity/Tally-compatible), global-future (multi-currency, multi-jurisdiction tax, IFRS/Ind-AS/US-GAAP, Unicode/RTL — architected day one).
- **80% common core / 20% industry packs.** Vouchers, GL, masters, compliance, reporting, audit, workflow are built once; the industry-specific 20% (batch/expiry, BOM, POS, project accounting, RERA, fee heads, etc.) activates per entity. The vision catalogs 18+ industries (pharma, manufacturing, FMCG, retail, services, real estate, construction, trading, education, healthcare, hospitality, logistics, NGO, PSU/government, IoT asset management, quick-commerce, contract manufacturing, engineer-to-order/turnkey, and more).
- **Top 1% on six dimensions simultaneously:** keyboard-first UX (Tally-grade), pain-point focus, best-in-class UI, out-of-box thinking, global architecture, all-departments coverage.
- **The Leak Register — the signature module.** A cross-cutting module that tracks where value leaks in a business across 12 categories (inventory shrinkage, revenue, cost, compliance, receivables, cash, people, time, data-quality, customer-trust, intercompany, knowledge) — each with a sensor, dashboard, owner, and reduction target. The vision's claim: no other ERP has this.
- **12 departments, end-to-end**, each first-class with its own dashboard and explicit inter-departmental handoff tracking.
- **The Operix Way of Working (OWW):** a governance layer — 7 thinking dimensions, 8 inquiry lenses (Who/What/When/Where/Why/Which/Whom/How), and four ISO standards (25010 product quality, 9001 QMS, 27001 infosec, 20000 ITSM) used as an evaluation grid, with Fortune-500 documentation discipline.

> *Note on vision-vs-build:* the v65 roadmap is the **plan of record from April–May 2026**. Several of its operational specifics were since superseded by the freeze — e.g. it named "custom JWT auth," "NTT Data deployment," and "26 cards," whereas the frozen build uses self-hosted Postgres (DP-P8-2), a Claude-Code/Lovable executor split, and 33 active cards. The *vision* tenets above remain current; the superseded *operational* specifics are noted here so this document agrees with the freeze record.

---

## PART IV — PRUDENT360 (the brand)

**Prudent360 is the market-facing brand** under which Operix is sold. It is a real, built layer in the tree (21 files, a dedicated `prudent360.ts` type, plus product-variant and provisioning types). The productization stack (Wave-1 Tier-L design + quote, Wave-2 enforcement + billing):

- **Prudent360 ERP** is the flagship sellable product — feature set = the 33 dashboard cards (select/deselect to create editions, e.g. "Prudent360 ERP — Manufacturing"). Alongside it: 28 standalone modules, 12 add-ons, and bundles.
- **5-layer productization stack:** Product Catalog → Entitlement/Limits (companies, users, storage, branches, transactions, retention, etc.) → Pricing (per-seat / per-company / tier / usage / hybrid; monthly / annual / multi-year) → Provisioning + Hierarchy (super-admin → direct client or channel-partner → client) → Metering & Enforcement (Wave-2).
- **The "Build Your Plan" configurator** (`/build-your-plan`) — a customer-facing self-serve plan builder: pick Prudent360 ERP (toggle cards) or a module/bundle, add à-la-carte add-ons, set conditions with live sliders, see a live price, choose billing cycle, and drop into the provisioning pipeline. Tier-L today (configure + quote); real checkout/provisioning is Wave-2.

So: **4DSmartOps** is the vision, **Operix** is the product built to it, and **Prudent360** is what a customer buys.

---

## PART V — ORIGINS & REFERENCE REGISTER (where the knowledge came from)

The domain knowledge behind Operix is grounded in 30 catalogued reference sources (the 4DSmartOps Master Reference Register, v1.0, April 2026) — 25 years of real-client production ERP experience. The primary anchors:

- **S-10 · "motherofall" Master TDL Library** — 1,258 Tally TDL files, 55MB, 25 years of production ERP logic across engineering, textile, chemical, pharmaceutical, and trading clients. The single most important source: ledger/stock masters with 50+ UDF fields, 12 smart-security alert rules, compliance (GSTR-1/2/3B/2A/RCM/TDS/26AS, 30+ files), production (Charis: 20 transaction types + 10 reports), fixed assets (80 files, both Companies Act + IT Act depreciation), HRMS, QC, pre-purchase, store management, sales, MIS.
- **S-01 · Primary ERP Frontend Codebase** — the React + TypeScript ERP UI reference (component library, voucher/master patterns, navigation).
- **S-05 · DocFlow (JWT auth reference)** — the custom-JWT authentication pattern (RS256, bcrypt) that informs the Wave-2 auth design.
- **S-06 · Task-Management RBAC** — the 14-key permission model + `hasPermission()` function and role hierarchy.
- **S-07 / PROD-05 · Smart Power (SPPL)** — a LIVE deployed AMC/service system with real paying clients: the 15-table AMC data model, 5-factor risk engine, engineer dispatch — the most battle-tested source.
- **S-04 · Tally Purchase Sync** — the 10-state sync workflow foundation for the Bridge Console.
- **Legacy products** (PROD-01..05): Kariye Nirmaan (full manufacturing ERP in Tally — the origin product being rebuilt as Operix), Trident (trading/distribution), Charis (production module), s4foryou/prudent360.in (earlier web-ERP attempt), Smart Power (live service system).
- **Specialized TDLs** (TDL-01..08): physical stock verification, TallyWARM service management, compliance (GST/TDS/26AS), fixed-assets warranty+AMC, HRMS payroll+attendance, material-requirement analysis, WhatsApp voucher trigger.
- **Documents** (DOC-01..05): pre-purchase guide, production planning, QC control, sales automation, fixed-assets documentation.

These sources are the domain authority — every Operix module has a predecessor here. (The register notes several sources as "to be confirmed" by the founder; those remain open.)

---

## CLOSING

This compendium is the permanent tie between the three layers: the **4DSmartOps vision** (the 25-year-grounded universal-ERP philosophy), the **Operix project** (the frozen Wave-1 build, 33 cards, Tier-L → Wave-2), and the **Prudent360 brand** (the sellable product and self-serve configurator) — anchored to the 30 reference sources that gave it its domain authority. For current build state, read `Operix_Wave1_Freeze_Record_v1`; for architecture, `Operix_Architecture_of_Record_v1`; for the full vision detail, the source roadmap (`Operix_Phase1_Roadmap_v65`) and register (`4DSmartOps_Reference_Register_v1_0`).

*4DSmartOps Vision · Operix Project · Prudent360 Brand — Reference Compendium · freeze `cbe2357` · 187⭐ · code-verified · drafted by Claude (independent architect/auditor), committed to the repository on behalf of the Operix Founder · to be updated at the Wave-2 boundary.*
