/**
 * @file        src/components/ask-dishani/dishani-context-resolver.ts
 * @sprint      AM.1 · T-AM1-AI-Everywhere · Pass 1 · NEW (allowlisted)
 * @purpose     Route → card context resolver for Ask Dishani. Deterministic
 *              intent-match so Dishani answers card-scoped questions without
 *              ever editing the 33 ERP card pages. NO LLM call here — the
 *              Wave-2 /nl-query seam is preserved as a [JWT] comment only.
 * @canon       Tier-L · NO fetch · NO LLM/ML · NO third-party AI vendor SDK.
 *              The resolver is a pure function over the static
 *              ROUTE_CARD_REGISTRY plus the caller's pathname;
 *              answerCardScoped is an intent-match.
 * @[JWT]       Wave-2: POST /api/ai/nl-query { context, question } — the
 *              resolver will pass the descriptor; the LLM call lives there.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Honest banner — surfaced by DishaniPanel / RoleHome — never silently AI-y.
// ─────────────────────────────────────────────────────────────────────────────
export const DISHANI_RESOLVER_HONESTY =
  'Ask Dishani is rule-based today; the LLM brain arrives with Wave-2.';

// ─────────────────────────────────────────────────────────────────────────────
// Card descriptor — what Dishani knows about each card without opening it.
// ─────────────────────────────────────────────────────────────────────────────
export interface CardContext {
  /** Slug used by the route, e.g. "fincore". Used for telemetry/asserts. */
  card: string;
  /** Human-readable name surfaced in the panel header. */
  cardName: string;
  /** Department/domain label ("Finance", "Sales", "Operations"...). */
  department: string;
  /** Key entities the user typically asks about on this card. */
  keyEntities: string[];
  /** Suggested questions a user could ask while on this card. */
  commonQuestions: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE_CARD_REGISTRY — single source of truth.
// Covers all 33 ERP cards plus /tower, /bridge, /partner, /customer panels.
// Resolver matches longest prefix first.
// ─────────────────────────────────────────────────────────────────────────────
const ENTRIES: Array<[string, CardContext]> = [
  ['/erp/command-center', { card: 'command-center', cardName: 'Command Center', department: 'Platform Admin',
    keyEntities: ['tenant', 'company', 'audit log'],
    commonQuestions: ['What is the platform status?', 'Where do I add a company?'] }],
  ['/erp/salesx', { card: 'salesx', cardName: 'SalesX Hub', department: 'Sales',
    keyEntities: ['lead', 'opportunity', 'quotation', 'order'],
    commonQuestions: ['What is overdue on the pipeline?', 'Summary of this card'] }],
  ['/erp/distributor-hub', { card: 'distributor-hub', cardName: 'Distributor Hub', department: 'Sales',
    keyEntities: ['distributor', 'secondary sale', 'claim'],
    commonQuestions: ['Open claims today?', 'Top distributors this month?'] }],
  ['/erp/customer-hub', { card: 'customer-hub', cardName: 'Customer Hub', department: 'Sales',
    keyEntities: ['customer', 'contact', 'segment'],
    commonQuestions: ['Customer summary', 'WhatsApp templates'] }],
  ['/erp/fincore', { card: 'fincore', cardName: 'FinCore', department: 'Finance',
    keyEntities: ['voucher', 'ledger', 'GST return', 'TDS section'],
    commonQuestions: ['What is overdue here?', 'Open vouchers awaiting approval'] }],
  ['/erp/receivx', { card: 'receivx', cardName: 'ReceivX', department: 'Finance',
    keyEntities: ['invoice', 'collection', 'aging bucket'],
    commonQuestions: ['Outstanding > 60 days?', 'PTPs due today?'] }],
  ['/erp/peoplepay', { card: 'peoplepay', cardName: 'PeoplePay', department: 'HR',
    keyEntities: ['employee', 'attendance', 'payroll', 'EPF', 'ESI'],
    commonQuestions: ['Payroll cycle status?', 'Statutory due dates?'] }],
  ['/erp/payout', { card: 'payout', cardName: 'PayOut', department: 'Finance',
    keyEntities: ['vendor payment', 'advance', 'bank file'],
    commonQuestions: ['Pending payment runs?', 'Unmatched advances?'] }],
  ['/erp/insightx', { card: 'insightx', cardName: 'InsightX', department: 'Analytics',
    keyEntities: ['dashboard', 'metric', 'lens'],
    commonQuestions: ['Top insights today?', 'Operix Score'] }],
  ['/erp/procure-hub', { card: 'procure360', cardName: 'Procure360', department: 'Operations',
    keyEntities: ['PR', 'RFQ', 'PO', 'GRN'],
    commonQuestions: ['Open PRs?', 'Pending approvals?'] }],
  ['/erp/inventory-hub', { card: 'inventory-hub', cardName: 'Inventory Hub', department: 'Operations',
    keyEntities: ['item', 'godown', 'bin', 'batch'],
    commonQuestions: ['Stockouts today?', 'ABC analysis'] }],
  ['/erp/qualicheck', { card: 'qualicheck', cardName: 'QualiCheck', department: 'Quality',
    keyEntities: ['inspection', 'NCR', 'CAPA'],
    commonQuestions: ['Open NCRs?', 'Failed inspections today?'] }],
  ['/erp/gateflow', { card: 'gateflow', cardName: 'GateFlow', department: 'Operations',
    keyEntities: ['gate pass', 'vehicle', 'weighbridge'],
    commonQuestions: ['Vehicles at gate?', 'Pending gate passes?'] }],
  ['/erp/production', { card: 'production', cardName: 'Production', department: 'Manufacturing',
    keyEntities: ['BOM', 'production order', 'job card'],
    commonQuestions: ['WIP today?', 'BOM shortages?'] }],
  ['/erp/maintainpro', { card: 'maintainpro', cardName: 'MaintainPro', department: 'Maintenance',
    keyEntities: ['asset', 'work order', 'PM schedule'],
    commonQuestions: ['Open work orders?', 'Overdue PMs?'] }],
  ['/erp/requestx', { card: 'requestx', cardName: 'RequestX', department: 'Operations',
    keyEntities: ['indent', 'request', 'approval'],
    commonQuestions: ['Pending approvals?', 'My open requests'] }],
  ['/erp/frontdesk', { card: 'frontdesk', cardName: 'FrontDesk', department: 'Reception',
    keyEntities: ['visitor', 'room booking', 'desk'],
    commonQuestions: ['Visitors today?', 'Room availability'] }],
  ['/erp/servicedesk', { card: 'servicedesk', cardName: 'ServiceDesk', department: 'Support',
    keyEntities: ['ticket', 'SLA', 'escalation'],
    commonQuestions: ['Open tickets?', 'SLA breaches today?'] }],
  ['/erp/logistics', { card: 'logistics', cardName: 'Logistics', department: 'Operations',
    keyEntities: ['LR', 'manifest', 'transporter'],
    commonQuestions: ['Open LRs?', 'Manifest queue'] }],
  ['/erp/dispatch-hub', { card: 'dispatch-hub', cardName: 'Dispatch Hub', department: 'Operations',
    keyEntities: ['dispatch', 'pick list', 'invoice'],
    commonQuestions: ['Today\'s dispatches?', 'Pending picks'] }],
  ['/erp/projx', { card: 'projx', cardName: 'ProjX', department: 'Projects',
    keyEntities: ['project', 'milestone', 'RA bill'],
    commonQuestions: ['Active projects?', 'Overdue milestones'] }],
  ['/erp/engineeringx', { card: 'engineeringx', cardName: 'EngineeringX', department: 'Engineering',
    keyEntities: ['drawing', 'design BOM', 'reference'],
    commonQuestions: ['Open drawing reviews?', 'BOM diff'] }],
  ['/erp/sitex', { card: 'sitex', cardName: 'SiteX', department: 'Site Management',
    keyEntities: ['site', 'DWR', 'imprest'],
    commonQuestions: ['Site DWRs pending?', 'Imprest balance'] }],
  ['/erp/store-hub', { card: 'store-hub', cardName: 'Store Hub', department: 'Stores',
    keyEntities: ['issue', 'receipt', 'bin'],
    commonQuestions: ['Pending issues?', 'Cycle count gaps'] }],
  ['/erp/bill-passing', { card: 'bill-passing', cardName: 'Bill Passing', department: 'Finance',
    keyEntities: ['bill', '3-way match', 'hold'],
    commonQuestions: ['Bills on hold?', 'Match exceptions'] }],
  ['/erp/supplyx', { card: 'supplyx', cardName: 'SupplyX', department: 'Supply Chain',
    keyEntities: ['plan', 'demand', 'replenishment'],
    commonQuestions: ['Replenishment alerts', 'Demand variance'] }],
  ['/erp/eximx', { card: 'eximx', cardName: 'EximX', department: 'International Trade',
    keyEntities: ['BoE', 'shipping bill', 'realisation'],
    commonQuestions: ['Open BoEs?', 'Realisation pending'] }],
  ['/erp/docvault', { card: 'docvault', cardName: 'DocVault', department: 'Documents',
    keyEntities: ['document', 'tag', 'retention'],
    commonQuestions: ['Recent uploads?', 'Retention review'] }],
  ['/erp/taskflow', { card: 'taskflow', cardName: 'TaskFlow', department: 'Productivity',
    keyEntities: ['task', 'assignee', 'due date'],
    commonQuestions: ['My open tasks?', 'Overdue this week'] }],
  ['/erp/ecomx', { card: 'ecomx', cardName: 'EcomX', department: 'Marketplace',
    keyEntities: ['marketplace', 'listing', 'reconciliation'],
    commonQuestions: ['Listings unsynced?', 'Marketplace reconciliation'] }],
  ['/erp/webstorex', { card: 'webstorex', cardName: 'WebStoreX', department: 'Catalog',
    keyEntities: ['product', 'catalog', 'PIM'],
    commonQuestions: ['Catalog completeness', 'Recent product edits'] }],
  ['/erp/comply360', { card: 'comply360', cardName: 'Comply360', department: 'Compliance',
    keyEntities: ['filing', 'register', 'CARO'],
    commonQuestions: ['Filings due this month?', 'Audit-ready score'] }],
  ['/erp/fpa-planning', { card: 'fpa-planning', cardName: 'FP&A Planning', department: 'Finance Planning',
    keyEntities: ['AOP', 'budget', 'scenario'],
    commonQuestions: ['Budget variance', 'AOP cascade status'] }],
  ['/erp/vendor-portal', { card: 'vendor-portal', cardName: 'Vendor Portal', department: 'Procurement',
    keyEntities: ['vendor', 'first quote', 'onboarding'],
    commonQuestions: ['Pending onboarding', 'Vendor comms log'] }],
  // Non-card panels
  ['/tower', { card: 'tower', cardName: 'Control Tower', department: 'Super-Admin',
    keyEntities: ['tenant', 'variant', 'provisioning'],
    commonQuestions: ['Provisioning queue', 'Tenant health'] }],
  ['/bridge', { card: 'bridge', cardName: 'Bridge Console', department: 'Platform',
    keyEntities: ['sync', 'audit', 'reconciliation'],
    commonQuestions: ['Tally sync status', 'Audit chain'] }],
  ['/partner', { card: 'partner', cardName: 'Partner Panel', department: 'Channel',
    keyEntities: ['deal', 'commission', 'renewal'],
    commonQuestions: ['My open deals', 'Commission due'] }],
  ['/customer', { card: 'customer', cardName: 'Customer Panel', department: 'Customer',
    keyEntities: ['invoice', 'order', 'support'],
    commonQuestions: ['Open invoices', 'My orders'] }],
  ['/operix-go', { card: 'operix-go', cardName: 'Operix Go (Mobile)', department: 'Mobile',
    keyEntities: ['persona', 'mobile app'],
    commonQuestions: ['Which app should I install?', 'What needs me now'] }],
  ['/welcome', { card: 'welcome', cardName: 'Welcome Workspace', department: 'KLDCS Internal',
    keyEntities: ['workspace', 'role-home'],
    commonQuestions: ['What needs me now?', 'Open dev tools'] }],
];

export const ROUTE_CARD_REGISTRY: ReadonlyArray<readonly [string, CardContext]> =
  Object.freeze(ENTRIES.map(([k, v]) => Object.freeze([k, Object.freeze(v)] as const)));

const DEFAULT_CONTEXT: CardContext = Object.freeze({
  card: 'operix-core',
  cardName: 'Operix Core',
  department: 'Platform',
  keyEntities: ['module', 'card', 'panel'],
  commonQuestions: ['What modules are available?', 'Where do I login?'],
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveCardContext — pure, longest-prefix match. NO fetch · NO LLM.
// ─────────────────────────────────────────────────────────────────────────────
export function resolveCardContext(pathname: string): CardContext {
  if (typeof pathname !== 'string' || pathname.length === 0) return DEFAULT_CONTEXT;
  let best: CardContext | null = null;
  let bestLen = -1;
  for (const [prefix, ctx] of ROUTE_CARD_REGISTRY) {
    if ((pathname === prefix || pathname.startsWith(prefix + '/')) && prefix.length > bestLen) {
      best = ctx;
      bestLen = prefix.length;
    }
  }
  return best ?? DEFAULT_CONTEXT;
}

// ─────────────────────────────────────────────────────────────────────────────
// Intent-match — deterministic card-scoped answers. NO fetch · NO LLM/ML.
// Returns a short string; UI may surface the honest banner alongside.
// ─────────────────────────────────────────────────────────────────────────────
export type CardIntent =
  | 'overdue'
  | 'summary'
  | 'pending_approvals'
  | 'today'
  | 'help'
  | 'unknown';

export function classifyIntent(question: string): CardIntent {
  const q = (question || '').toLowerCase();
  if (!q) return 'unknown';
  if (/(overdue|late|breach)/.test(q)) return 'overdue';
  if (/(summary|overview|what.*here|status)/.test(q)) return 'summary';
  if (/(approv|pending|awaiting)/.test(q)) return 'pending_approvals';
  if (/(today|now|right now)/.test(q)) return 'today';
  if (/(help|how|where|explain)/.test(q)) return 'help';
  return 'unknown';
}

export function answerCardScoped(question: string, ctx: CardContext): string {
  const intent = classifyIntent(question);
  switch (intent) {
    case 'overdue':
      return `Overdue items on ${ctx.cardName} are derived from the card's registers (${ctx.keyEntities.join(', ')}). Open the card's overdue register to see live counts. (rule-based · LLM at Wave-2)`;
    case 'summary':
      return `${ctx.cardName} (${ctx.department}) handles ${ctx.keyEntities.join(', ')}. Open the dashboard for live metrics. (rule-based · LLM at Wave-2)`;
    case 'pending_approvals':
      return `Pending approvals on ${ctx.cardName} are listed in the approvals queue for ${ctx.department}. (rule-based · LLM at Wave-2)`;
    case 'today':
      return `Today's activity on ${ctx.cardName} is visible on the card's home tab (${ctx.keyEntities[0] ?? 'entries'}). (rule-based · LLM at Wave-2)`;
    case 'help':
      return `I can help with ${ctx.cardName}. Try: ${ctx.commonQuestions.slice(0, 2).join(' · ')}. (rule-based · LLM at Wave-2)`;
    default:
      return `You are on ${ctx.cardName}. Try one of: ${ctx.commonQuestions.join(' · ')}. (rule-based · LLM at Wave-2)`;
  }
}
