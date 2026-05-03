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
    description: 'Platform administration, foundation setup and security console',
    category: 'Ops Hub',
    route: '/erp/command-center',
    icon: 'LayoutDashboard',
    status: 'active',
  },
  {
    id: 'procure360',
    name: 'Procure360',
    description: 'Full procurement cycle — PR, RFQ, PO, GRN, invoice and vendor payments',
    category: 'Ops Hub',
    route: '/erp/procure-hub',
    icon: 'ShoppingCart',
    status: 'active',
  },
  {
    id: 'inventory-hub',
    name: 'Store Hub',
    description: 'Physical store operations — goods receipt, dispatch, bin management, stock movements and warehouse control',
    category: 'Ops Hub',
    route: '/erp/inventory-hub',
    icon: 'Package',
    status: 'active',
  },
  {
    id: 'qulicheak',
    name: 'Qulicheak',
    description: 'Quality control and QA — inspections, NCR logs and sample testing',
    category: 'Ops Hub',
    route: '/erp/qulicheak',
    icon: 'CheckSquare',
    status: 'active',
  },
  {
    id: 'gateflow',
    name: 'GateFlow',
    description: 'Gate management — inward, outward, gate passes and vehicle tracking',
    category: 'Ops Hub',
    route: '/erp/gateflow',
    icon: 'DoorOpen',
    status: 'active',
  },
  {
    id: 'production',
    name: 'Production',
    description: 'BOM, production orders, WIP tracking, MRP planning and job cards',
    category: 'Ops Hub',
    route: '/erp/production',
    icon: 'Factory',
    status: 'active',
  },
  {
    id: 'maintainpro',
    name: 'MaintainPro',
    description: 'Asset maintenance — work orders, PM schedules and downtime tracking',
    category: 'Ops Hub',
    route: '/erp/maintainpro',
    icon: 'Wrench',
    status: 'active',
  },
  {
    id: 'requestx',
    name: 'RequestX',
    description: 'Department material requisition and indent — raise and track internal requests that feed into Procure360 for vendor sourcing',
    category: 'Ops Hub',
    route: '/erp/requestx',
    icon: 'ClipboardList',
    status: 'active',
  },
  {
    id: 'supplyx',
    name: 'SupplyX',
    description: 'Vendor relationship hub — supplier onboarding, performance tracking, ratings, payments status, documents. Mirror of Distributor Hub for inbound.',
    category: 'Ops Hub',
    route: '/erp/supplyx',
    icon: 'Truck',
    status: 'active',
  },
  {
    id: 'salesx',
    name: 'SalesX Hub',
    description: 'Sales, CRM, telecaller and field force with geo-tracking',
    category: 'Sales Hub',
    route: '/erp/salesx',
    icon: 'TrendingUp',
    status: 'active',
  },
  {
    id: 'distributor-hub',
    name: 'Distributor Hub',
    description: 'Manage distributors · intimations · broadcasts · analytics',
    category: 'Sales Hub',
    route: '/erp/distributor-hub',
    icon: 'Store',
    status: 'active',
  },
  {
    id: 'customer-hub',
    name: 'Customer Hub',
    description: 'End-customer loyalty, CLV projection, and cross-sell — Sprint 13a',
    category: 'Sales Hub',
    route: '/erp/customer-hub',
    icon: 'Heart',
    status: 'active',
  },
  {
    id: 'projx',
    name: 'ProjX',
    description: 'Project management — plan, schedule, track, and deliver client-facing projects with milestones, resource allocation, and profitability tracking.',
    category: 'Sales Hub',
    route: '/erp/projx',
    icon: 'ClipboardList',
    status: 'active',
  },
  {
    id: 'webstorex',
    name: 'WebStoreX',
    description: 'Your own online storefront — catalog, cart, checkout, customer accounts, and payments. Orders flow into FineCore automatically.',
    category: 'Sales Hub',
    route: '/erp/webstorex',
    icon: 'ShoppingBag',
    status: 'active',
  },
  {
    id: 'unicomm',
    name: 'UniComm',
    description: 'Unified multi-channel commerce — aggregate orders from Amazon, Flipkart, Shopify, Meesho and your own website into one ERP queue. Channel-SKU mapping, unified picklists, manifests, returns.',
    category: 'Sales Hub',
    route: '/erp/unicomm',
    icon: 'Network',
    status: 'active',
  },
  {
    id: 'finecore',
    name: 'Fin Core',
    description: 'Accounting and inventory transactions — sales, purchase, payments, journals and voucher register',
    category: 'Fin Hub',
    route: '/erp/finecore',
    icon: 'Calculator',
    status: 'active',
  },
  {
    id: 'comply360',
    name: 'Comply360',
    description: 'Compliance & statutory management — GSTR (1/3B/9/2B), TDS, TCS, e-invoicing, e-way bill, MSME tracking, deadline automation',
    category: 'Fin Hub',
    route: '/erp/comply360',
    icon: 'Shield',
    status: 'active',
  },
  {
    id: 'payout',
    name: 'PayOut',
    description: 'Vendor payment management — AP scheduling, payment run, advance tracking, release approvals and vendor account reconciliation',
    category: 'Fin Hub',
    route: '/erp/payout',
    icon: 'Wallet',
    status: 'active',
  },
  {
    id: 'receivx',
    name: 'ReceivX',
    description: 'Collections hub — outstanding tasks, PTP tracking, reminder automation, aging by team, collection efficiency and credit risk',
    category: 'Fin Hub',
    route: '/erp/receivx',
    icon: 'TrendingUp',
    status: 'active',
  },
  {
    id: 'eximx',
    name: 'EximX',
    description: 'International trade management — export/import documentation, DGFT integration, e-BRC, shipping bills, landed cost, buyer/supplier risk scoring, FEMA tracker, Treasury.',
    category: 'International Trade',
    route: '/erp/eximx',
    icon: 'Globe',
    status: 'active',
  },
  {
    id: 'peoplepay',
    name: 'PeoplePay',
    description: 'Full HR and payroll — attendance, leaves, payroll and compliance',
    category: 'Pay Hub',
    route: '/erp/pay-hub',
    icon: 'Users',
    status: 'active',
  },
  {
    id: 'dispatch-hub',
    name: 'Logistics Hub',
    description: 'Transporter & courier management — LR tracking, freight reconciliation, transporter portal, POD, domestic & international logistics',
    category: 'Ops Hub',
    route: '/erp/logistics',
    icon: 'Truck',
    status: 'active',
  },
  {
    id: 'dispatch-ops',
    name: 'Dispatch Hub',
    description: 'Inward & outward operations — delivery memo, packing slip, sample/demo outward issue, movement report, dispatch exceptions',
    category: 'Dispatch Hub',
    route: '/erp/dispatch',
    icon: 'PackageCheck',
    status: 'active',
  },
  {
    id: 'frontdesk',
    name: 'FrontDesk',
    description: 'Front desk — visitor check-in, room booking and desk reservation',
    category: 'FrontDesk Hub',
    route: '/erp/frontdesk',
    icon: 'Building2',
    status: 'active',
  },
  {
    id: 'servicedesk',
    name: 'ServiceDesk',
    description: 'Support ticketing — SLA management, escalations and knowledge base',
    category: 'Support Hub',
    route: '/erp/servicedesk',
    icon: 'Headphones',
    status: 'active',
  },
  {
    id: 'taskflow',
    name: 'TaskFlow',
    description: 'Task management — assignments, approvals, SLAs, priority queues, department routing. Unified work management across teams.',
    category: 'Support Hub',
    route: '/erp/taskflow',
    icon: 'CheckSquare',
    status: 'active',
  },
  {
    id: 'docvault',
    name: 'DocVault',
    description: 'Document management — registry, upload, approvals, search, sharing, audit trail, compliance checks, retention policies.',
    category: 'Support Hub',
    route: '/erp/docvault',
    icon: 'FileText',
    status: 'active',
  },
  // ─── INSIGHTX ARCHITECTURAL RULE — LOCKED BEFORE BUILD ──────────────────────
  // InsightX is a read-only analytics layer for top management.
  // ALLOWED : read from any hook (useJournal, useVouchers, useGSTRegister,
  //         useOutstanding, usePayrollEngine, useOpeningBalances)
  // FORBIDDEN: postVoucher(), cancelVoucher(), any localStorage.setItem(),
  //            any import of write functions from finecore-engine.ts
  // Violation silently corrupts financial data. Enforced in every audit run.
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'insightx',
    name: 'InsightX',
    description: 'Top management analytics — cross-department KPIs, P&L trends, headcount, GST liability and cash flow. Read-only.',
    category: 'InsightX',
    route: '/erp/insightx',
    icon: 'BarChart3',
    status: 'active',
  },
];
