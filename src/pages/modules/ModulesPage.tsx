/**
 * @file     src/pages/modules/ModulesPage.tsx
 * @sprint   CATALOG-1 · T-CAT1-Modules-AddOns
 * @purpose  Catalog of 28 standalone modules. Catalog-entries-ONLY this
 *           sprint — every phase2 entry LINKS to an EXISTING card route
 *           (no fabricated landing pages). Standalone deployment of any
 *           single module is a Wave-2 packaging concern.
 * @canon    NO new landing-page files. NO new engine. Only AI-Price /
 *           Hardware (in /add-ons) are 'planned'; here every entry is
 *           phase2 because the underlying capability is BANKED.
 */
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, DoorOpen, FileText, Users, Headphones, Wrench, Package,
  Calculator, BookOpen, Building2, TrendingUp, HandCoins, ShoppingCart, Warehouse,
  ShieldCheck, Layers, ListChecks, FolderArchive, PiggyBank, Factory,
  Banknote, Store, Globe2, Boxes, Briefcase, Truck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ModulePhase = 'live' | 'phase2' | 'planned';

type ModuleSection =
  | 'Accounts'
  | 'Sales'
  | 'Procure & Store'
  | 'Bundles'
  | 'Workflow & Docs'
  | 'Operations'
  | 'Flagship';

interface StandaloneModule {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  route: string;
  phase: ModulePhase;
  section: ModuleSection;
  capability: string;
}

const MODULES: StandaloneModule[] = [
  // ── Accounts ──────────────────────────────────────────────────────────────
  { id: 'accounts-basic', title: 'Accounts Basic', icon: Calculator, section: 'Accounts',
    description: 'Core books — masters, vouchers, ledgers, day book, trial balance.',
    details: 'FinCore base capability packaged for SMEs that need only the books and statutory ledgers without inventory or production.',
    route: '/erp/fincore', phase: 'phase2', capability: 'FinCore (banked)' },
  { id: 'accounts-standard', title: 'Accounts Standard', icon: BookOpen, section: 'Accounts',
    description: 'Books + inventory + payroll posting + statutory ledgers + GST returns linkage.',
    details: 'FinCore + InventoryHub posting + Comply360 statutory ledgers in one package — covers the standard Tally-replacement scope.',
    route: '/erp/fincore', phase: 'phase2', capability: 'FinCore + InventoryHub + Comply360 (banked)' },
  { id: 'consolidation', title: 'Multi-Entity Consolidation', icon: Building2, section: 'Accounts',
    description: 'Ind AS consolidation — full / proportional / equity methods, NCI & goodwill, FX translation.',
    details: 'Comply360 consolidation engine — eliminations, intercompany reciprocals, multi-currency translation per Ind AS 21/110/111.',
    route: '/erp/comply360', phase: 'phase2', capability: 'Comply360 consolidation engine (banked)' },
  { id: 'far', title: 'FAR — Fixed Assets Register', icon: Briefcase, section: 'Accounts',
    description: 'Fixed asset register — physical verification, calibration, AMC pipeline, vehicle register.',
    details: 'Standalone FAR pack — block depreciation, FA-ledger pack, CARO 2020, Ind AS 116 ROU.',
    route: '/erp/fa-physical-verification', phase: 'phase2', capability: 'FA pack + Comply360 fixed-assets (banked)' },

  // ── Sales ────────────────────────────────────────────────────────────────
  { id: 'salesx-basic', title: 'Sales CRM Basic', icon: TrendingUp, section: 'Sales',
    description: 'Leads, enquiries, quotations, orders, salesman targets.',
    details: 'SalesX pipeline + masters packaged without distribution or commission complexity.',
    route: '/erp/salesx', phase: 'phase2', capability: 'SalesX (banked)' },
  { id: 'salesx-advanced', title: 'Sales CRM Advanced', icon: TrendingUp, section: 'Sales',
    description: 'SalesX + commission engine + distributor hub + campaigns.',
    details: 'Full SalesX with commission templates, distributor management, and territory campaigns.',
    route: '/erp/salesx', phase: 'phase2', capability: 'SalesX + commission-engine + distributor-hub (banked)' },
  { id: 'receivx', title: 'ReceivX Collections', icon: HandCoins, section: 'Sales',
    description: 'Receivables, dunning, ageing, collection followups, customer KPIs.',
    details: 'ReceivX collections suite — works standalone for finance teams that bill out of Tally and want a proper collections workbench.',
    route: '/erp/receivx', phase: 'phase2', capability: 'ReceivX (banked)' },

  // ── Procure & Store ──────────────────────────────────────────────────────
  { id: 'purchase', title: 'Purchase Management', icon: ShoppingCart, section: 'Procure & Store',
    description: 'RFQ, vendor quotes, purchase orders, GRN, bill passing.',
    details: 'Procure360 indent-to-PO flow + bill-passing 3-way match. Standalone for procurement teams.',
    route: '/erp/procure-hub', phase: 'phase2', capability: 'Procure360 + bill-passing (banked)' },
  { id: 'store', title: 'Store Management', icon: Warehouse, section: 'Procure & Store',
    description: 'Bins, godowns, stock issue/receipt, transfers, physical verification.',
    details: 'StoreHub for plant stores — works standalone alongside any ERP/Tally for bin-level inventory.',
    route: '/erp/store-hub', phase: 'phase2', capability: 'StoreHub (banked)' },
  { id: 'quality-check', title: 'Quality Check', icon: ShieldCheck, section: 'Procure & Store',
    description: 'Incoming, in-process, final inspection plans, NCR, supplier QC scoring.',
    details: 'QualiCheck inspection plans + parameters + NCR workflow. Standalone QC for factories.',
    route: '/erp/qualicheck', phase: 'phase2', capability: 'QualiCheck (banked)' },

  // ── Bundles ──────────────────────────────────────────────────────────────
  { id: 'bundle-purchase-store', title: 'Purchase + Store Bundle', icon: Boxes, section: 'Bundles',
    description: 'Procure360 + StoreHub combined — indent to stock-on-shelf in one bundle.',
    details: 'Bundle for plants that want sourcing and stores together without finance.',
    route: '/erp/procure-hub', phase: 'phase2', capability: 'Procure360 + StoreHub (banked)' },
  { id: 'bundle-store-qc', title: 'Store + QC Bundle', icon: Layers, section: 'Bundles',
    description: 'StoreHub + QualiCheck — inward QC gating on every GRN.',
    details: 'Bundle for QC-sensitive plants that want stores and inspection wired together.',
    route: '/erp/store-hub', phase: 'phase2', capability: 'StoreHub + QualiCheck (banked)' },
  { id: 'bundle-p2p', title: 'Procure-to-Pay Bundle', icon: Banknote, section: 'Bundles',
    description: 'Procure360 + StoreHub + bill-passing + Payout — full P2P loop.',
    details: 'Indent → PO → GRN → bill-pass → payment file in one bundle.',
    route: '/erp/procure-hub', phase: 'phase2', capability: 'Procure360 + StoreHub + bill-passing + Payout (banked)' },
  { id: 'bundle-crm-accounts', title: 'CRM Advanced + Accounts Bundle', icon: Users, section: 'Bundles',
    description: 'SalesX Advanced + Accounts Standard — sell-to-collect in one bundle.',
    details: 'Lead-to-cash bundle for distribution-led SMEs.',
    route: '/erp/salesx', phase: 'phase2', capability: 'SalesX + FinCore + ReceivX (banked)' },

  // ── Workflow & Docs ──────────────────────────────────────────────────────
  { id: 'taskflow', title: 'TaskFlow', icon: ListChecks, section: 'Workflow & Docs',
    description: 'Universal tasks, rooms, assignments, SLAs across every card.',
    details: 'TaskFlow standalone — works across departments without the full ERP.',
    route: '/erp/taskflow', phase: 'phase2', capability: 'TaskFlow (banked)' },
  { id: 'dms', title: 'Document Management', icon: FolderArchive, section: 'Workflow & Docs',
    description: 'DocVault — centralised document storage, version control, retention.',
    details: 'DocVault standalone for compliance and contract teams.',
    route: '/erp/docvault', phase: 'phase2', capability: 'DocVault (banked)' },
  { id: 'dms-full', title: 'DMS — Approvals + e-Sign Wrap', icon: FileText, section: 'Workflow & Docs',
    description: 'DocVault + approval workflows + e-sign hook — full document lifecycle.',
    details: 'DocVault wrapped with approval routing and audit trail for regulated workflows.',
    route: '/erp/docvault', phase: 'phase2', capability: 'DocVault + approval workflow (banked)' },
  { id: 'budget', title: 'Budget Management', icon: PiggyBank, section: 'Workflow & Docs',
    description: 'AOP, operating/capital budgets, scenarios, variance, forecasts.',
    details: 'FP&A Planning standalone — Arc D.0 + D.1 budgeting and forecasting.',
    route: '/erp/fpa-planning', phase: 'phase2', capability: 'FP&A Planning engines (banked)' },

  // ── Operations ───────────────────────────────────────────────────────────
  { id: 'production', title: 'Production / MRP', icon: Factory, section: 'Operations',
    description: 'BOM, work orders, job cards, shop-floor lanes, capacity.',
    details: 'Production card standalone for discrete/process plants.',
    route: '/erp/production', phase: 'phase2', capability: 'Production (banked)' },
  { id: 'cmms', title: 'Maintenance CMMS', icon: Wrench, section: 'Operations',
    description: 'Asset register, PM schedules, breakdowns, spares consumption.',
    details: 'MaintainPro CMMS for plant maintenance teams.',
    route: '/erp/maintainpro', phase: 'phase2', capability: 'MaintainPro (banked)' },
  { id: 'payout', title: 'Payments / Payout', icon: Banknote, section: 'Operations',
    description: 'Payment files, bank-format export, approval workflow, payout register.',
    details: 'Payout hub standalone — vendor and salary payment file generation.',
    route: '/erp/payout', phase: 'phase2', capability: 'PayOut (banked)' },
  { id: 'warehouse', title: 'Warehouse WMS', icon: Warehouse, section: 'Operations',
    description: 'Rack/bin locations, FIFO/FEFO, pick-pack-ship, multi-location stock.',
    details: 'InventoryHub WMS surface packaged standalone.',
    route: '/erp/inventory-hub', phase: 'phase2', capability: 'InventoryHub WMS (banked)' },
  { id: 'servicedesk', title: 'ServiceDesk', icon: Headphones, section: 'Operations',
    description: 'Tickets, SLAs, escalations, multi-channel intake, CSAT.',
    details: 'ServiceDesk standalone for internal IT or customer support.',
    route: '/erp/servicedesk', phase: 'phase2', capability: 'ServiceDesk (banked)' },
  { id: 'gateflow', title: 'GateFlow — Gate Management', icon: DoorOpen, section: 'Operations',
    description: 'Gate-in/out register, vehicle tracking, visitor log, weighbridge.',
    details: 'GateFlow standalone for factories and warehouses.',
    route: '/erp/gateflow', phase: 'phase2', capability: 'GateFlow (banked)' },

  // ── Flagship ─────────────────────────────────────────────────────────────
  { id: 'webstorex', title: 'WebStoreX Storefront', icon: Store, section: 'Flagship',
    description: 'PIM, catalog, storefront publishing — direct-to-customer.',
    details: 'WebStoreX standalone for D2C brands and B2B catalogs.',
    route: '/erp/webstorex', phase: 'phase2', capability: 'WebStoreX (banked)' },
  { id: 'ecomx', title: 'EcomX Marketplace Settlement', icon: Globe2, section: 'Flagship',
    description: 'Marketplace channel ingestion, payouts, returns, reconciliation.',
    details: 'EcomX standalone for sellers on Amazon/Flipkart/Meesho needing settlement reconciliation.',
    route: '/erp/ecomx', phase: 'phase2', capability: 'EcomX (banked)' },
  { id: 'comply360', title: 'Comply360', icon: ShieldCheck, section: 'Flagship',
    description: 'Statutory compliance command — GST, TDS, payroll, MCA, EXIM, internal audit.',
    details: 'Comply360 standalone — 161 statutory obligations across tax/payroll/MCA/EXIM.',
    route: '/erp/comply360', phase: 'phase2', capability: 'Comply360 (banked)' },
  { id: 'eximx', title: 'EximX', icon: Truck, section: 'Flagship',
    description: 'Import/export, BOE/SB, EPCG, CAROTAR, AEO, Form 3CEB.',
    details: 'EximX standalone for exporters and importers needing dedicated trade compliance.',
    route: '/erp/eximx', phase: 'phase2', capability: 'EximX (banked)' },
  { id: 'vetan-nidhi', title: 'Vetan Nidhi — वेतन निधि', icon: Users, section: 'Flagship',
    description: 'HR + Payroll SaaS — PF ECR, ESI, PT, TDS, Form 24Q, Form 16, attendance, ESS.',
    details: 'Vetan Nidhi standalone — 5 pricing tiers from ₹499/month including an HR-only tier for Tally payroll users.',
    route: '/modules/vetan-nidhi', phase: 'phase2', capability: 'PeoplePay + PayOut + Comply360 payroll (banked)' },
];

const SECTION_ORDER: ModuleSection[] = [
  'Accounts', 'Sales', 'Procure & Store', 'Bundles', 'Workflow & Docs', 'Operations', 'Flagship',
];

const PHASE_CONFIG: Record<ModulePhase, { label: string; color: string }> = {
  live:    { label: 'Live',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function ModulesPagePanel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Modules</h1>
            <p className="text-sm text-muted-foreground mt-1">
              28 standalone modules — each packages a banked capability for sale on its own or as a bolt-on
              to any existing ERP / Tally setup. Phase 2 = capability is built, standalone packaging arrives
              with the Wave-2 deploy. Tapping a tile opens the live capability inside the full Operix shell.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{MODULES.filter(m => m.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{MODULES.filter(m => m.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{MODULES.filter(m => m.phase === 'planned').length}</span> Planned</span>
          <span className="ml-auto"><span className="font-semibold text-foreground">{MODULES.length}</span> total</span>
        </div>

        {SECTION_ORDER.map(section => {
          const items = MODULES.filter(m => m.section === section);
          if (items.length === 0) return null;
          return (
            <section key={section} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{section}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map(mod => {
                  const phaseConf = PHASE_CONFIG[mod.phase];
                  const isClickable = mod.phase !== 'planned';
                  return (
                    <button
                      key={mod.id}
                      onClick={() => isClickable && navigate(mod.route)}
                      className={cn(
                        "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-5 text-left w-full transition-all duration-300",
                        isClickable
                          ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                          : "opacity-70 cursor-default"
                      )}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <mod.icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{mod.title}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{mod.description}</p>
                      <p className="text-xs text-muted-foreground/70">{mod.details}</p>
                      {isClickable && (
                        <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Open capability <ArrowRight className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="text-xs text-muted-foreground text-center pt-4">
          Standalone licensing arrives with the Wave-2 packaging deploy. Tapping a Phase 2 tile opens the
          underlying capability inside the full Operix shell today.
        </p>
      </div>
    </div>
  );
}
export default function ModulesPage() { return <ModulesPagePanel />; }

// Test surface — exported only for the CATALOG-1 behavioral test
export { MODULES as __CAT1_MODULES__ };
