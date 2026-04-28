import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  FlaskConical,
  Database,
  Clock,
  RefreshCw,
  ToggleLeft,
  Upload,
  Terminal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ToolPhase = 'live' | 'phase2' | 'planned';

interface EngineeringTool {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  route: string;
  phase: ToolPhase;
}

const ENGINEERING_TOOLS: EngineeringTool[] = [
  {
    id: 'seed-lab',
    title: 'Seed & Mock Data Lab',
    icon: Database,
    description:
      'One-click load of any of 7 client scenarios into demo tenant. Six stakeholder modes (Founder/Dev/QA/Demo/Client/Financer). Pre-planted leaks surface in Leak Register.',
    details:
      'Phase 1 ships: live Fixture Coverage Heatmap + scenario library wireframe + mode selector wireframe. Phase 3 ships: full deterministic seed generator with time-travel + reset-to-layer + leak injector.',
    route: '/welcome/dev-tools/seed-lab',
    phase: 'live',
  },
  {
    id: 'time-travel',
    title: 'Time-Travel Engine',
    icon: Clock,
    description:
      'Set "fake now" to any date for demoing year-end close, GSTR deadlines, AMC renewals, compliance calendar.',
    details:
      'Critical for demoing any time-gated workflow. Without this, compliance calendar and leak sensors cannot be demoed meaningfully. Ships H1.5-SEED Phase 3.',
    route: '/welcome/dev-tools/time-travel',
    phase: 'planned',
  },
  {
    id: 'reset-layers',
    title: 'Reset-to-Layer Controls',
    icon: RefreshCw,
    description:
      'Wipe-and-reload demo tenant to any of 17 layers (platform → masters → opening → 14 voucher-months → close → compliance → anomalies).',
    details:
      'Supports iterative testing of month-end close, compliance flows, year-end without full rebuild. Ships H1.5-SEED Phase 3.',
    route: '/welcome/dev-tools/reset',
    phase: 'planned',
  },
  {
    id: 'leak-injector',
    title: 'Leak Injector',
    icon: ToggleLeft,
    description:
      'Toggle specific planted leaks ON/OFF for Leak Register testing. QA isolation tool.',
    details:
      'Each scenario carries 3-5 pre-planted leaks. Injector allows testing Leak Register detection independently of scenario load. Ships H1.5-SEED Phase 3.',
    route: '/welcome/dev-tools/leak-injector',
    phase: 'planned',
  },
  {
    id: 'migration-preview',
    title: 'Tally Migration Preview',
    icon: Upload,
    description:
      'Client uploads their Tally XML → Operix generates demo tenant with their real data pattern. Sales lever.',
    details:
      'Prospective client sees their own business in Operix before signing. Ships Phase 2 after Bridge Console lands.',
    route: '/welcome/dev-tools/migration-preview',
    phase: 'planned',
  },
  {
    id: 'api-playground',
    title: 'API Playground',
    icon: Terminal,
    description:
      'Interactive console for exploring Operix APIs, testing payloads, inspecting responses.',
    details:
      'Developer utility. Lives under Engineering Console. Ships in Phase 2 alongside API documentation.',
    route: '/welcome/dev-tools/api-playground',
    phase: 'planned',
  },
];

const PHASE_CONFIG: Record<ToolPhase, { label: string; color: string }> = {
  live:    { label: 'Live',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function EngineeringConsolePagePanel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Engineering Console</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Developer &amp; QA utilities — seed data, fixtures, time-travel, reset controls, migration tooling, API playground.
              Internal tool for engineering team only — never exposed to end users.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{ENGINEERING_TOOLS.filter(t => t.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{ENGINEERING_TOOLS.filter(t => t.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{ENGINEERING_TOOLS.filter(t => t.phase === 'planned').length}</span> Planned</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {ENGINEERING_TOOLS.map(t => {
            const phaseConf = PHASE_CONFIG[t.phase];
            const isClickable = t.phase === 'live' || t.phase === 'phase2';
            return (
              <button
                key={t.id}
                onClick={() => isClickable && navigate(t.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable
                    ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                    : "opacity-70 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <t.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{t.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{t.description}</p>
                <p className="text-xs text-muted-foreground/70">{t.details}</p>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Most tools ship in H1.5-SEED Phase 3 after core cards stabilize.
          Seed Lab placeholder is live from Phase 1 with functional Fixture Coverage Heatmap.
        </p>
      </div>
    </div>
  );
}

export default EngineeringConsolePagePanel;
