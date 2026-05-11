/**
 * @file     applications.ts
 * @sprint   T-Phase-1.3-DashboardAudit-Fix
 * @purpose  Master registry of all dashboard cards in /erp/dashboard.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * STATUS RULES (founder-locked · enforced in every audit):
 * ──────────────────────────────────────────────────────────────────────────
 * - 'coming_soon' · Empty card · NO folder · NO route · NOT yet built
 * - 'wip'         · Work started · partial implementation · NOT plan-complete
 * - 'active'      · Plan-complete (per Master Plan §51.2 LOC budget)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * ARCHITECTURAL ANCHORS · LOCK FOR ALL FUTURE ENGINEERS
 * ──────────────────────────────────────────────────────────────────────────
 *
 * 1. DISPATCH-OPS vs DISPATCH-HUB (NEVER MERGE):
 *    - dispatch-hub · 'Dispatch Hub'  · /erp/dispatch  · Internal department · inward/outward operations
 *    - dispatch-hub · 'Logistics'     · /erp/logistics · Transporter panel · LR · POD · freight · external party
 *
 * 2. INVENTORY-HUB vs STORE-HUB (related but distinct):
 *    - inventory-hub · 'Inventory Hub'      · /erp/inventory-hub · Heavy 22k+ LOC inventory backbone
 *    - store-hub     · 'Department Stores'  · /erp/store-hub     · Lightweight 1.5k LOC department console
 *
 * 3. PROJX is the orchestrator (NOT the dump):
 *    - Every transactional type carries `project_centre_id?: string | null` (D-218)
 *    - 1:1:N pattern (one project · one Project Centre · many tagged transactions)
 *
 * 4. TIER CLASSIFICATION (Master Plan §51.2 LOCKED April 30, 2026):
 *    - Tier 1 (15): ProjX · Inventory Hub · Procure360 · DocVault · EngineeringX (NEW) ·
 *      Production · QualiCheck · GateFlow · MaintainPro · RequestX · SupplyX · SiteX (NEW) ·
 *      ServiceDesk · EximX · InsightX
 *    - Tier 3 (stub): WebStoreX · UniComm · TaskFlow · FrontDesk
 *    - Tier 4 (defer): Comply360
 *
 * 5. CATEGORY MAPPING (9 categories · 30+ cards): see AppCategory.
 *
 * 6. NAMING CONVENTIONS:
 *    - 'Fin Core' (with space) intentional · do not rename
 *      D-NEW-CM-fincore-naming-canonical (CANONICAL · 12th at v15 · technical-vs-display split)
 *      Technical names use FinCore/fincore short form · display name 'Fin Core' (with space) preserved
 *    - 'QualiCheck' (no space · PascalCase) canonical · was 'Qulicheak' (wrong · corrected at H.2)
 *      D-NEW-CN-qualicheck-naming-canonical (CANONICAL · 13th at v16 · canonical correction pattern)
 *      Both technical AND display change · distinguishes from D-NEW-CM display preservation pattern
 *    - 'Inventory Hub' (with space) intentional · do not rename
 *      D-NEW-CM-fincore-naming-canonical pattern (display preservation · technical 'inventory-hub' · display 'Inventory Hub')
 *      Heavy 22k+ LOC platform inventory backbone · NOT to be confused with store-hub (Department Stores · lightweight 1.5k LOC console)
 *      ~39 instances at v17 ALL intentional · DO NOT migrate to 'InventoryHub' · DO NOT remove space
 *    - 'Department Stores' (display) · 'store-hub' (technical) · NOT 'Store Hub' duplicate
 *      D-NEW-CM-fincore-naming-canonical pattern (display preservation · same pattern as Inventory Hub)
 *    - 'Dispatch Hub' (operations) · 'Logistics' (transporter)
 *
 *    INSTITUTIONAL DISCIPLINE: When founder confirms canonical wrong → D-NEW-CN reverse migration pattern.
 *    When founder confirms canonical intentional → D-NEW-CM display preservation pattern (with locked comments).
 *    All 'with space' display names below follow D-NEW-CM (locked) UNLESS explicitly migrated to D-NEW-CN.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * Last reconciled: HEAD 66351ad0 (Card 3b 3b-pre-3 close · Phase 1.3 ERP cards complete)
 * ──────────────────────────────────────────────────────────────────────────
 */

export type AppStatus = 'coming_soon' | 'wip' | 'active';

export type AppCategory =
  | 'Ops Hub'
  | 'Sales Hub'
  | 'Fin Hub'
  | 'Pay Hub'
  | 'FrontDesk Hub'
  | 'Support Hub'
  | 'InsightX'
  | 'International Trade'
  | 'Dispatch Hub';

export interface AppDefinition {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  route: string;
  icon: string;
  status?: AppStatus;
}

export const CATEGORY_COLORS: Record<AppCategory, string> = {
  'Ops Hub':            'bg-cyan-500/15 text-cyan-400',
  'Sales Hub':          'bg-amber-500/15 text-amber-400',
  'Fin Hub':            'bg-indigo-500/15 text-indigo-400',
  'Pay Hub':            'bg-violet-500/15 text-violet-400',
  'FrontDesk Hub':      'bg-purple-500/15 text-purple-400',
  'Support Hub':        'bg-teal-500/15 text-teal-400',
  'InsightX':           'bg-sky-500/15 text-sky-400',
  'International Trade':'bg-rose-500/15 text-rose-400',
  'Dispatch Hub':       'bg-orange-500/15 text-orange-500',
};

export const ALL_CATEGORIES: AppCategory[] = [
  'Ops Hub',
  'Sales Hub',
  'Fin Hub',
  'Pay Hub',
  'FrontDesk Hub',
  'Support Hub',
  'InsightX',
  'International Trade',
  'Dispatch Hub',
];

export const applications: AppDefinition[] = [
  {
    id: 'command-center',
    name: 'Command Center',
    description: 'Master SSOT hub · platform-wide masters (org structure, geography, taxes, voucher types, period locks). Single source of truth for every department. Other cards render replicas of CC data.',
    category: 'Ops Hub',
    route: '/erp/command-center',
    icon: 'LayoutDashboard',
    status: 'active',
  },
  {
    id: 'procure360',
    name: 'Procure360',
    description: 'Procurement-to-Pay arc · vendor enquiry → 3-mode vendor selection → RFQ → quotation comparison → award → PO management. Feeds RequestX indents and Bill Passing.',
    category: 'Ops Hub',
    route: '/erp/procure-hub',
    icon: 'ShoppingCart',
    status: 'active',  // T-Phase-1.A.8.α-a-T1 · Q-LOCK-T1-NEW · Master Plan §51.2 rows 3+4 (Sprint 1.A.3 + 1.A.4 CLOSED) · D-NEW-BB pattern
  },
  // ⚠️ Display name 'Inventory Hub' (with space) intentional · keep as-is
  // D-NEW-CM-fincore-naming-canonical pattern (display preservation · parallel to 'Fin Core')
  // Heavy 22k+ LOC platform inventory backbone · NOT to be confused with store-hub (Department Stores · lightweight console)
  // T-Phase-1.H.3 · Q-LOCK-4a + Q-LOCK-5a · lock strengthened (was: 2-line comment · now: explicit ⚠️ + D-NEW-CM cite)
  {
    id: 'inventory-hub',
    name: 'Inventory Hub',
    description: 'Heavy inventory module · platform-level backbone. GRN, MIN, RTV, Cycle Count, Item Master, Storage Matrix, Batch/Serial tracking, ABC classification, Hazmat profiles, Reorder management.',
    category: 'Ops Hub',
    route: '/erp/inventory-hub',
    icon: 'Package',
    status: 'active',
  },
  {
    id: 'qualicheck',
    name: 'QualiCheck',
    description: 'Quality control module · incoming/in-process/final inspection · NCR, CAPA, MTC, FAI, welder qualification. ISO 9001 + IEC 17025 compliance.',
    category: 'Ops Hub',
    route: '/erp/qualicheck',
    icon: 'CheckSquare',
    status: 'active',
  },
  {
    id: 'gateflow',
    name: 'GateFlow',
    description: 'Gate management · vehicle in/out, gate passes, weighbridge integration. Interfaces with Procure360 GRN inward and Dispatch outward.',
    category: 'Ops Hub',
    route: '/erp/gateflow',
    icon: 'DoorOpen',
    status: 'active',  // T-Phase-1.A.8.α-a-T1 · Q-LOCK-T1-NEW · Master Plan §51.2 row 1 (Sprint 1.A.1 CLOSED) · D-NEW-BB pattern
  },
  {
    id: 'production',
    name: 'Production',
    description: 'Production planning + execution · Work Orders, routing, 8-stage shopfloor, capacity planning, OEE, wastage analysis, scheduling. Core manufacturing engine.',
    category: 'Ops Hub',
    route: '/erp/production',
    icon: 'Factory',
    status: 'active',  // T-Phase-1.A.8.α-a-T1 · Q-LOCK-T1-NEW · Master Plan §51.2 row 2 (Sprint 1.A.2 CLOSED) · D-NEW-BB pattern
  },
  {
    id: 'maintainpro',
    name: 'MaintainPro',
    description: 'Plant maintenance · machine breakdown logs, preventive maintenance schedules, AMC for own machines, spare parts consumption. Feeds Production capacity.',
    category: 'Ops Hub',
    route: '/erp/maintainpro',
    icon: 'Wrench',
    status: 'coming_soon',
  },
  {
    id: 'requestx',
    name: 'RequestX',
    description: 'Internal request hub · material indents, service requests, capital indents · 11 indent categories · 3-tier approval matrix. Feeds Procure360 PO creation.',
    category: 'Ops Hub',
    route: '/erp/requestx',
    icon: 'ClipboardList',
    status: 'active',
  },
  // 🆕 NEW Tier 1 #5 (Master Plan §51.2 April 30, 2026 LOCK)
  {
    id: 'engineeringx',
    name: 'EngineeringX',
    description: 'Engineering design control · drawing register, version control, BOM-from-drawing, Reference Project Library, AI similarity/change-impact prediction. (Critical for ETO/Fabrication clients.)',
    category: 'Ops Hub',
    route: '/erp/engineeringx',
    icon: 'FileText',
    status: 'active',  // ⭐ T-Phase-1.A.13 EngineeringX Closeout · Q-LOCK-10a STATUS FLIP · MOAT #21 candidate · matches A.9 DocVault Closeout precedent
  },
  // store-hub · LIGHTWEIGHT department-level Stores console (NOT Inventory Hub · see arch note 2)
  {
    id: 'store-hub',
    name: 'Department Stores',
    description: 'Department-level Stores console · stock issue to departments, receipt acknowledgments, cycle count status, reorder suggestions, demand forecast. Lightweight operator console (NOT Inventory Hub).',
    category: 'Ops Hub',
    route: '/erp/store-hub',
    icon: 'Warehouse',
    status: 'active',  // T-Phase-1.A.6.α-b · Q-LOCK-13a · D-NEW-BB pattern (parallel to qualicheck A.5)
  },
  {
    id: 'supplyx',
    name: 'SupplyX',
    description: 'Internal supply requisition · stock check before requisition, auto-PR trigger to Procure360. Lightweight requisition flow (early scaffold).',
    category: 'Ops Hub',
    route: '/erp/supplyx',
    icon: 'Truck',
    status: 'active',  // T-Phase-1.A.7.α-a · Q-LOCK-13a · D-NEW-BB pattern (parallel to qualicheck A.5 + store-hub A.6)
  },
  // 🆕 NEW Tier 1 #12 (Master Plan §51.2 April 30, 2026 LOCK)
  {
    id: 'sitex',
    name: 'SiteX',
    description: 'Site execution hub · install/commission + construction + CAPEX internal modes · DPR with geo-fenced photos · snag list (mobile-first) · safety suite (PTW · JSA · Toolbox Talks · Incidents) · site imprest treasury · customer signoff + commissioning + 4 closeout handoffs (ServiceDesk · MaintainPro · Asset Capitalization · Final Reconciliation). Site = Branch with project lifecycle architecture.',
    category: 'Ops Hub',
    route: '/erp/sitex',
    icon: 'MapPin',
    status: 'coming_soon',
  },
  {
    id: 'salesx',
    name: 'SalesX Hub',
    description: 'Sales lifecycle management · Enquiry → Quotation → Sales Order → Sample/Demo Outward · stock reservations · 6-role mobile suite (Salesman, Telecaller, Supervisor, Manager, Distributor, Customer) · 14 reports.',
    category: 'Sales Hub',
    route: '/erp/salesx',
    icon: 'TrendingUp',
    status: 'active',
  },
  {
    id: 'distributor-hub',
    name: 'Distributor Hub',
    description: 'B2B distributor portal + management · scheme management, secondary sales tracking, distributor hierarchy, primary/secondary order pipelines, distributor live tracker.',
    category: 'Sales Hub',
    route: '/erp/distributor-hub',
    icon: 'Store',
    status: 'active',
  },
  {
    id: 'customer-hub',
    name: 'Customer Hub',
    description: 'B2B/B2C customer portal + relationship management · customer master, opportunity pipeline, customer service requests, AMC visibility.',
    category: 'Sales Hub',
    route: '/erp/customer-hub',
    icon: 'Heart',
    status: 'active',
  },
  // ProjX · Project Management Hub · the orchestrator (see arch note 3)
  {
    id: 'projx',
    name: 'ProjX',
    description: 'Project Management Hub (orchestrator) · multi-line long-running orders with milestones, resource allocation, time entries, project P&L, project-level invoicing. Every other card tags transactions with project_centre_id (D-218).',
    category: 'Sales Hub',
    route: '/erp/projx',
    icon: 'ClipboardList',
    status: 'active',  // Sprint T-Phase-1.3-DashboardLanes-Fix · Q3=a · ALL 5 sub-sprints shipped (1.1.2-pre/a/b/b2/c/d verified in code) · D-219-D-223 retroactively logged
  },
  {
    id: 'webstorex',
    name: 'WebStoreX',
    description: 'B2B/B2C e-commerce shopfront · distributor and customer self-service. MOAT #11. Tier 3 stub now · Phase 1.1.3 / 1.1.4 full implementation.',
    category: 'Sales Hub',
    route: '/erp/webstorex',
    icon: 'ShoppingBag',
    status: 'coming_soon',
  },
  {
    id: 'unicomm',
    name: 'UniComm',
    description: 'Omni-channel communications · WhatsApp, email, SMS coordination. MOAT #12. Tier 3 stub now · Phase 2 deferred per D-174.',
    category: 'Sales Hub',
    route: '/erp/unicomm',
    icon: 'Network',
    status: 'coming_soon',
  },
  // ⚠️ Display name 'Fin Core' (with space) intentional · keep as-is
  {
    id: 'fincore',
    name: 'Fin Core',
    description: 'Accounting + inventory transactions · sales, purchase, payments, journals, voucher register. The financial heart of the ERP. India compliance baked in (GST/TDS/E-invoice).',
    category: 'Fin Hub',
    route: '/erp/fincore',
    icon: 'Calculator',
    status: 'active',
  },
  {
    id: 'comply360',
    name: 'Comply360',
    description: 'India + global statutory compliance · GST, TDS, TCS, E-invoice, E-way bill, ROC, MSME 43BH. Wraps existing FinCore compliance. Tier 4 deferred to Phase 1.4+.',
    category: 'Fin Hub',
    route: '/erp/comply360',
    icon: 'Shield',
    status: 'coming_soon',
  },
  {
    id: 'payout',
    name: 'PayOut',
    description: 'Vendor payment management · AP scheduling, payment runs, advance tracking, release approvals, vendor account reconciliation, MSME 43BH 45-day rule.',
    category: 'Fin Hub',
    route: '/erp/payout',
    icon: 'Wallet',
    status: 'active',
  },
  {
    id: 'receivx',
    name: 'ReceivX',
    description: 'Receivables management · customer outstanding, collections, dunning, dispute tracking, customer credit limits.',
    category: 'Fin Hub',
    route: '/erp/receivx',
    icon: 'TrendingUp',
    status: 'active',
  },
  // 🆕 NEW · bill-passing fully built (1,550 LOC) but was never registered as a card
  {
    id: 'bill-passing',
    name: 'Bill Passing',
    description: '3-way match invoice processing (PO + GRN + Vendor Invoice). For Procure360 + RequestX + Job Work Out. Feeds PayOut for payment scheduling.',
    category: 'Fin Hub',
    route: '/erp/bill-passing',
    icon: 'FileText',
    status: 'active',
  },
  {
    id: 'eximx',
    name: 'EximX',
    description: 'International trade · export/import documentation, DGFT integration, e-BRC, shipping bills, BL, FIRC, LUT/Bond, FEMA tracker, landed cost computation. Tier 1 #14.',
    category: 'International Trade',
    route: '/erp/eximx',
    icon: 'Globe',
    status: 'coming_soon',
  },
  {
    id: 'peoplepay',
    name: 'PeoplePay',
    description: 'Full HR + payroll · attendance, leaves, payroll, statutory compliance (PF/ESI/LWF/PT), employee master, contract manpower, shift master, learning & development, exit/F&F.',
    category: 'Pay Hub',
    route: '/erp/pay-hub',
    icon: 'Users',
    status: 'active',
  },
  // dispatch-hub · 'Logistics' · transporter panel (NOT operational dispatch · see arch note 1)
  // ⚠️ id='logistics' kept for backward-compat · scope is Logistics
  {
    id: 'logistics',
    name: 'Logistics',
    description: 'Transporter panel · LR tracking, POD, courier management, freight reconciliation, transporter scorecard, dispute queue. External-party coordination. (Distinct from Dispatch Hub which handles inward/outward stock operations.)',
    category: 'Ops Hub',
    route: '/erp/logistics',
    icon: 'Truck',
    status: 'active',  // Sprint T-Phase-1.3-DashboardLanes-Fix · Q1-Status · 1,360 unique LOC + 8,127 shared LOC · /erp/logistics functional since T-Phase-1.1.1p-v2
  },
  // dispatch-hub · 'Dispatch Hub' · internal operations (NOT transporter panel · see arch note 1)
  {
    id: 'dispatch-hub',
    name: 'Dispatch Hub',
    description: 'Internal department · inward & outward logistic operations · Delivery Memo, Packing Slip, GRN inward receipts, Sample/Demo outward issue, Outward Movement Report, Dispatch Exceptions. Works WITH stock. NOT transporter panel (see Logistics).',
    category: 'Dispatch Hub',
    route: '/erp/dispatch',
    icon: 'PackageCheck',
    status: 'active',
  },
  {
    id: 'frontdesk',
    name: 'FrontDesk',
    description: 'Reception + visitor management + gate inward UI. Tier 3 stub now · Phase 2 full implementation.',
    category: 'FrontDesk Hub',
    route: '/erp/frontdesk',
    icon: 'Building2',
    status: 'coming_soon',
  },
  {
    id: 'servicedesk',
    name: 'ServiceDesk',
    description: 'Post-handover AMC + service tickets · technician scheduling, mobile dispatch, spare parts, SLA tracking, CSAT. Primary revenue stream for AMC-heavy clients (Smartpower-type). Tier 1 #13.',
    category: 'Support Hub',
    route: '/erp/servicedesk',
    icon: 'Headphones',
    status: 'coming_soon',
  },
  {
    id: 'taskflow',
    name: 'TaskFlow',
    description: 'Generic task delegation + workflow · cross-department task assignment with approvals. Tier 3 stub now · Phase 2 full implementation.',
    category: 'Support Hub',
    route: '/erp/taskflow',
    icon: 'CheckSquare',
    status: 'coming_soon',
  },
  {
    id: 'docvault',
    name: 'DocVault',
    description: 'Versioned document storage · drawings, MOMs, certifications, ISO/IEC docs. Prerequisite for EngineeringX (drawing register lives here). Tier 1 #4.',
    category: 'Support Hub',
    route: '/erp/docvault',
    icon: 'FileText',
    status: 'active',  // T-Phase-1.A.9 BUNDLED · Q-LOCK-8a · D-NEW-BB pattern · 7th consumer · MOAT #20 · A.8+A.9 pair CLOSED
  },
  // ─── INSIGHTX ARCHITECTURAL RULE — LOCKED BEFORE BUILD ──────────────────────
  // InsightX is a read-only analytics layer for top management.
  // ALLOWED : read from any hook
  // FORBIDDEN: postVoucher(), cancelVoucher(), any localStorage.setItem(),
  //            any import of write functions from fincore-engine.ts
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'insightx',
    name: 'InsightX',
    description: 'Analytics + AI · Project Health, KPI engine, role dashboards (CEO/Production/Purchase/PM), rule-based AI alerts, action recommendations. Aggregates ALL Tier 1 cards data. Tier 1 #15 (LAST in chain).',
    category: 'InsightX',
    route: '/erp/insightx',
    icon: 'BarChart3',
    status: 'coming_soon',
  },
];
