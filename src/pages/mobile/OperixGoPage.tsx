import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Smartphone, Users, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type AppPhase = 'live' | 'phase2' | 'planned';

interface MobileApp {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  route: string;
  phase: AppPhase;
}

const MOBILE_APPS: MobileApp[] = [
  {
    id: 'employee',
    title: 'Sahayak — Employee',
    icon: Smartphone,
    description: 'Mobile ESS for employees — payslips, leave, attendance, IT declaration, announcements.',
    details: 'Everything an employee needs on their phone. Apply for leave, check payslip, mark attendance, submit IT declaration — all from a browser, no app install. Controlled by HR via ESS Config toggles.',
    route: '/operix-go/employee',
    phase: 'phase2',
  },
  {
    id: 'manager',
    title: 'Sahayak — Manager',
    icon: ShieldCheck,
    description: 'Mobile approval app for managers — leave, expense, loan approvals and team view.',
    details: 'Managers approve leave, expense claims, and loans from their phone. View team attendance, leave calendar, and headcount. Quick payroll sign-off. Role-based — shows only what the manager is permitted to see.',
    route: '/operix-go/manager',
    phase: 'phase2',
  },
];

const PHASE_CONFIG: Record<AppPhase, { label: string; color: string }> = {
  live:    { label: 'Live',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export default function OperixGoPage() {
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
              Mobile apps for employees and managers — HR approvals and self-service on any phone.
              No app install required. Works in any browser.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{MOBILE_APPS.filter(a => a.phase === "live").length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{MOBILE_APPS.filter(a => a.phase === "phase2").length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{MOBILE_APPS.filter(a => a.phase === "planned").length}</span> Planned</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {MOBILE_APPS.map(app => {
            const phaseConf = PHASE_CONFIG[app.phase];
            const isClickable = app.phase !== 'planned';
            return (
              <button
                key={app.id}
                onClick={() => isClickable && navigate(app.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer" : "opacity-60 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <app.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{app.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{app.description}</p>
                <p className="text-xs text-muted-foreground/70">{app.details}</p>
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
          Operix Go Sahayak is included in Vetan Nidhi HR+Payroll tier and above.
          Also available as a standalone add-on for Operix ERP PeoplePay customers.
        </p>
      </div>
    </div>
  );
}
