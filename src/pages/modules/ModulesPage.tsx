import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, DoorOpen, FileText, Users, Headphones, Wrench, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

type ModulePhase = 'live' | 'phase2' | 'planned';

interface StandaloneModule {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  route: string;
  phase: ModulePhase;
}

const MODULES: StandaloneModule[] = [
  {
    id: 'gateflow',
    title: 'GateFlow — Gate Management',
    icon: DoorOpen,
    description: 'Standalone gate management — inward/outward register, vehicle tracking, visitor log, gate passes.',
    details: 'Works as a standalone module for factories and warehouses. No full ERP needed. Supports weighbridge integration, photo capture, e-gate pass generation, and guard dashboard.',
    route: '/erp/gateflow',
    phase: 'phase2',
  },
  {
    id: 'vetan-nidhi',
    title: 'Vetan Nidhi — वेतन निधि',
    icon: Users,
    description: 'HR and Payroll SaaS for Indian SMEs — take payroll only, HR only, or both. No full ERP required.',
    details: 'Payroll: PF ECR, ESI, PT, TDS, Form 24Q, Form 16. HR: attendance, leave, appraisals, biometric sync, onboarding, ESS portal. Works standalone or integrates with Tally. 5 tiers from ₹499/month — including an HR-only tier for Tally payroll users.',
    route: '/modules/vetan-nidhi',
    phase: 'phase2',
  },
  {
    id: 'dms',
    title: 'Document Management',
    icon: FileText,
    description: 'Centralised document storage, version control, approval workflows, and e-signature.',
    details: 'Planned: Store contracts, compliance documents, QC certificates, and HR records. Full-text search, access controls, and audit trail. Integrates with existing ERP vouchers.',
    route: '/modules/dms',
    phase: 'planned',
  },
  {
    id: 'servicedesk',
    title: 'Service Desk',
    icon: Headphones,
    description: 'Customer support ticketing with SLA management, escalation rules, and knowledge base.',
    details: 'Planned: Multi-channel ticket intake (email, WhatsApp, portal), SLA calendar, escalation matrix, CSAT surveys, and canned responses. Works for both internal IT and customer support.',
    route: '/modules/servicedesk',
    phase: 'planned',
  },
  {
    id: 'amc',
    title: 'AMC & Service Management',
    icon: Wrench,
    description: 'Annual maintenance contract tracking, service calls, engineer dispatch, and parts billing.',
    details: 'Planned: Contract register with renewal alerts, call booking from customer portal, engineer job cards, spare parts consumption, and AMC profitability reports.',
    route: '/modules/amc',
    phase: 'planned',
  },
  {
    id: 'warehouse',
    title: 'Warehouse Management',
    icon: Package,
    description: 'Bin-level inventory tracking, pick-pack-ship workflows, and multi-location stock management.',
    details: 'Planned: Full WMS with rack/bin locations, FIFO/FEFO picking, packing slips, shipment manifests, and 3PL integration. Bolt-on to any ERP or standalone with manual GRN.',
    route: '/modules/warehouse',
    phase: 'planned',
  },
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
      <div className="max-w-5xl mx-auto p-6 space-y-6">

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
              Standalone modules that work independently or bolt-on to any vertical or existing ERP.
              Each module solves one specific operational problem without requiring the full 4DSmartOps suite.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{MODULES.filter(m => m.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{MODULES.filter(m => m.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{MODULES.filter(m => m.phase === 'planned').length}</span> Planned</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {MODULES.map(mod => {
            const phaseConf = PHASE_CONFIG[mod.phase];
            const isClickable = mod.phase !== 'planned';
            return (
              <button
                key={mod.id}
                onClick={() => isClickable && navigate(mod.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable
                    ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                    : "opacity-70 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <mod.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{mod.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{mod.description}</p>
                <p className="text-xs text-muted-foreground/70">{mod.details}</p>
                {isClickable && (
                  <div className="flex items-center gap-1 mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open module <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Standalone modules can be licensed independently. Contact sales for pricing and availability.
        </p>
      </div>
    </div>
  );
}
export default function ModulesPage() { return <ModulesPagePanel />; }
