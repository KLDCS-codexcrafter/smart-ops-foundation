export type AppStatus = 'coming_soon' | 'wip';

export type AppCategory =
  | 'Ops Hub'
  | 'RequestX'
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
  'RequestX':       'bg-emerald-500/15 text-emerald-400',
  'Sales Hub':      'bg-amber-500/15 text-amber-400',
  'Fin Hub':        'bg-indigo-500/15 text-indigo-400',
  'Pay Hub':        'bg-violet-500/15 text-violet-400',
  'BackOffice Hub': 'bg-purple-500/15 text-purple-400',
  'Support Hub':    'bg-teal-500/15 text-teal-400',
  'InsightX':       'bg-sky-500/15 text-sky-400',
};

export const ALL_CATEGORIES: AppCategory[] = [
  'Ops Hub',
  'RequestX',
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
    status: 'wip',
  },
  {
    id: 'accounting-masters',
    name: 'Accounting Masters',
    description: 'Tax rates, TDS/TCS sections, HSN/SAC codes and compliance setup',
    category: 'Fin Hub',
    route: '/erp/accounting',
    icon: 'Landmark',
    status: 'wip',
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
    name: 'Inventory Hub',
    description: 'Stock control, batch tracking, serial numbers and parametric setup',
    category: 'Ops Hub',
    route: '/erp/inventory-hub',
    icon: 'Package',
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
    description: 'Internal purchase requests and indent management',
    category: 'RequestX',
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
    name: 'FineCore',
    description: 'Financial operations — bank reconciliation, payables and receivables',
    category: 'Fin Hub',
    route: '/erp/finecore',
    icon: 'Landmark',
    status: 'coming_soon',
  },
  {
    id: 'peoplepay',
    name: 'PeoplePay',
    description: 'Full HR and payroll — attendance, leaves, payroll and compliance',
    category: 'Pay Hub',
    route: '/erp/pay-hub',
    icon: 'Users',
    status: 'wip',
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
  {
    id: 'insightx',
    name: 'InsightX',
    description: 'Business analytics — DataViz Pro, ReportGen and Trend Analyzer',
    category: 'InsightX',
    route: '/erp/insightx',
    icon: 'BarChart3',
    status: 'coming_soon',
  },
];
