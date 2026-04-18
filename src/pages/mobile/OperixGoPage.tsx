import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Smartphone, DoorOpen, Landmark, Navigation, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppPhase = 'live' | 'phase2' | 'planned';

interface MobileProduct {
  id: string; title: string; icon: React.ElementType;
  description: string; details: string; route: string; phase: AppPhase;
}

const MOBILE_PRODUCTS: MobileProduct[] = [
  {
    id: 'vetan-nidhi',
    title: 'Vetan Nidhi Mobile — सहायक',
    icon: Smartphone,
    description: 'Employee ESS and Manager approvals for Vetan Nidhi payroll — payslips, leave, attendance, and approval inbox on any phone.',
    details: 'Two apps in one product: Sahayak Employee (payslips, leave, attendance, IT declaration) and Sahayak Manager (approval inbox, team view, leave calendar, payroll sign-off). PWA — no app install. Capacitor wrapper available for Play Store / App Store distribution.',
    route: '/operix-go/vetan-nidhi',
    phase: 'phase2',
  },
  {
    id: 'salesx-go',
    title: 'SalesX Go Sahayak — सहायक',
    icon: Navigation,
    description: "Field force mobile app — today's beat, geo check-in with 500m radius, visit logging with photos, secondary sales capture, live target + commission tracking.",
    details: 'Two apps in one product: Field App (salesman/agent/broker — check-in, visit log, secondary sales, my targets, my commission) and Supervisor App (manager — team coverage, beat productivity, target setting, visit correction approval). PWA — no app install. Capacitor wrapper available for Play Store / App Store distribution.',
    route: '/operix-go/salesx',
    phase: 'phase2',
  },
  {
    id: 'receivx-go',
    title: 'ReceivX Go Sahayak — सहायक',
    icon: IndianRupee,
    description: "Collection exec mobile app — today's route, receipt capture with UTR + photo, PTP logging, payment link sharing, offline queue for godown dead zones.",
    details: 'Two apps in one product: Collection Exec App (field team) and Supervisor App (manager). PWA — no install. Capacitor wrapper for Play Store / App Store.',
    route: '/operix-go/receivx',
    phase: 'phase2',
  },
  {
    id: 'gateflow',
    title: 'GateFlow Mobile',
    icon: DoorOpen,
    description: 'Gate guard app — scan vehicles, capture photos, issue e-gate passes, and log entries on a phone.',
    details: 'Planned: Guard-facing mobile interface for GateFlow gate management. Camera capture, vehicle lookup, e-pass generation, and shift handover — all from a ruggedised Android device or any phone.',
    route: '/operix-go/gateflow',
    phase: 'planned',
  },
  {
    id: 'finecore',
    title: 'FineCore Mobile',
    icon: Landmark,
    description: 'Accounts approvals on the move — payment voucher sign-off, outstanding alerts, and cash position.',
    details: 'Planned: Finance manager app for FineCore. Approve payment vouchers, view party outstanding, check bank balances, and get alerts on overdue receivables — without opening the full ERP.',
    route: '/operix-go/finecore',
    phase: 'planned',
  },
];

const PHASE_CONFIG: Record<AppPhase, { label: string; color: string }> = {
  live:    { label: 'Live',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function OperixGoPagePanel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">Operix Go Sahayak</h1>
              <span className="text-lg text-muted-foreground font-normal">— सहायक</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Mobile apps for every Operix product — employees, managers, guards, and finance teams.
              Built as Progressive Web Apps. No app store required.
              Capacitor wrapper available for Play Store and App Store distribution.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{MOBILE_PRODUCTS.filter(a => a.phase === "live").length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{MOBILE_PRODUCTS.filter(a => a.phase === "phase2").length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{MOBILE_PRODUCTS.filter(a => a.phase === "planned").length}</span> Planned</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MOBILE_PRODUCTS.map(product => {
            const phaseConf = PHASE_CONFIG[product.phase];
            const isClickable = product.phase !== 'planned';
            return (
              <button key={product.id}
                onClick={() => isClickable && navigate(product.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer" : "opacity-60 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <product.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{product.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                <p className="text-xs text-muted-foreground/70">{product.details}</p>
                {isClickable && (
                  <div className="flex items-center gap-1 mt-4 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    View details <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center pt-4">
          Mobile apps are Progressive Web Apps (PWA) — installable on any Android or iOS device from the browser.
          Capacitor wrappers for Play Store and App Store are available on request.
        </p>
      </div>
    </div>
  );
}
export default function OperixGoPage() { return <OperixGoPagePanel />; }
