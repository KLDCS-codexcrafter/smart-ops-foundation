export type AppStatus = 'coming_soon' | 'wip';

export type AppCategory =
  | 'Ops Hub'
  | 'Sales Hub'
  | 'Fin Hub'
  | 'Pay Hub'
  | 'BackOffice Hub'
  | 'Support Hub'
  | 'InsightX';

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
  'Ops Hub':        'bg-cyan-500/15 text-cyan-400',
  'Sales Hub':      'bg-amber-500/15 text-amber-400',
  'Fin Hub':        'bg-indigo-500/15 text-indigo-400',
  'Pay Hub':        'bg-violet-500/15 text-violet-400',
  'BackOffice Hub': 'bg-purple-500/15 text-purple-400',
  'Support Hub':    'bg-teal-500/15 text-teal-400',
  'InsightX':       'bg-sky-500/15 text-sky-400',
};

export const ALL_CATEGORIES: AppCategory[] = [
  'Ops Hub',
  'Sales Hub',
  'Fin Hub',
  'Pay Hub',
  'BackOffice Hub',
  'Support Hub',
  'InsightX',
];

export const applications: AppDefinition[] = [
  {
    id: 'command-center',
    name: 'Command Center',
    description: 'Platform administration, foundation setup and security console',
    category: 'Ops Hub',
    route: '/erp/command-center',
    icon: 'LayoutDashboard',
  },
  {
    id: 'procure360',
    name: 'Procure360',
    description: 'Full procurement cycle — PR, RFQ, PO, GRN, invoice and vendor payments',
    category: 'Ops Hub',
    route: '/erp/procure-hub',
    icon: 'ShoppingCart',
    status: 'coming_soon',
  },
  {
    id: 'inventory-hub',
    name: 'Store Hub',
    description: 'Physical store operations — goods receipt, dispatch, bin management, stock movements and warehouse control',
    category: 'Ops Hub',
    route: '/erp/inventory-hub',
    icon: 'Package',
    status: 'coming_soon',
  },
  {
    id: 'qulicheak',
    name: 'Qulicheak',
    description: 'Quality control and QA — inspections, NCR logs and sample testing',
    category: 'Ops Hub',
    route: '/erp/qulicheak',
    icon: 'CheckSquare',
    status: 'coming_soon',
  },
  {
    id: 'gateflow',
    name: 'GateFlow',
    description: 'Gate management — inward, outward, gate passes and vehicle tracking',
    category: 'Ops Hub',
    route: '/erp/gateflow',
    icon: 'DoorOpen',
    status: 'coming_soon',
  },
  {
    id: 'production',
    name: 'Production',
    description: 'BOM, production orders, WIP tracking, MRP planning and job cards',
    category: 'Ops Hub',
    route: '/erp/production',
    icon: 'Factory',
    status: 'coming_soon',
  },
  {
    id: 'maintainpro',
    name: 'MaintainPro',
    description: 'Asset maintenance — work orders, PM schedules and downtime tracking',
    category: 'Ops Hub',
    route: '/erp/maintainpro',
    icon: 'Wrench',
    status: 'coming_soon',
  },
  {
    id: 'requestx',
    name: 'RequestX',
    description: 'Department material requisition and indent — raise and track internal requests that feed into Procure360 for vendor sourcing',
    category: 'Ops Hub',
    route: '/erp/requestx',
    icon: 'ClipboardList',
    status: 'coming_soon',
  },
  {
    id: 'salesx',
    name: 'SalesX Hub',
    description: 'Sales, CRM, telecaller and field force with geo-tracking',
    category: 'Sales Hub',
    route: '/erp/salesx',
    icon: 'TrendingUp',
    status: 'coming_soon',
  },
  {
    id: 'finecore',
    name: 'Fin Core',
    description: 'Accounting and inventory transactions — sales, purchase, payments, journals and voucher register',
    category: 'Fin Hub',
    route: '/erp/finecore',
    icon: 'Calculator',
  },
  {
    id: 'payout',
    name: 'PayOut',
    description: 'Vendor payment management — AP scheduling, payment run, advance tracking, release approvals and vendor account reconciliation',
    category: 'Fin Hub',
    route: '/erp/payout',
    icon: 'Wallet',
    status: 'coming_soon',
  },
  {
    id: 'receivx',
    name: 'ReceivX',
    description: 'Customer outstanding management — AR tracking, collection follow-up, aging analysis, receipt reconciliation and credit limit monitoring',
    category: 'Fin Hub',
    route: '/erp/receivx',
    icon: 'TrendingUp',
    status: 'coming_soon',
  },
  {
    id: 'peoplepay',
    name: 'PeoplePay',
    description: 'Full HR and payroll — attendance, leaves, payroll and compliance',
    category: 'Pay Hub',
    route: '/erp/pay-hub',
    icon: 'Users',
  },
  {
    id: 'backoffice',
    name: 'Back Office Pro',
    description: 'Front desk — visitor check-in, room booking and desk reservation',
    category: 'BackOffice Hub',
    route: '/erp/backoffice',
    icon: 'Building2',
    status: 'coming_soon',
  },
  {
    id: 'servicedesk',
    name: 'ServiceDesk',
    description: 'Support ticketing — SLA management, escalations and knowledge base',
    category: 'Support Hub',
    route: '/erp/servicedesk',
    icon: 'Headphones',
    status: 'coming_soon',
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
    status: 'coming_soon',
  },
];
