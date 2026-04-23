import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Database,
  User,
  Code,
  TestTube,
  Presentation,
  Users,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FixtureCoverageHeatmap } from '@/components/dev-tools/FixtureCoverageHeatmap';

type ModePhase = 'live' | 'phase2' | 'planned';

interface StakeholderMode {
  id: string;
  title: string;
  icon: React.ElementType;
  audience: string;
  seesDescription: string;
  canDescription: string;
  phase: ModePhase;
}

const STAKEHOLDER_MODES: StakeholderMode[] = [
  {
    id: 'founder',
    title: 'Founder',
    icon: User,
    audience: 'Founder, executive team',
    seesDescription:
      'Full ERP with realistic data · all dashboards populated · Leak Register with planted leaks visible · top-level MIS cubes · bird\u2019s-eye across all 12 departments.',
    canDescription:
      'Explore anywhere · time-travel to any date · switch scenarios · craft narratives for board meetings.',
    phase: 'planned',
  },
  {
    id: 'dev',
    title: 'Developer',
    icon: Code,
    audience: 'Engineers',
    seesDescription:
      'JSON viewer · raw data tables · schema version · tenant isolation indicator · feature flags · Fixture Coverage Heatmap (LIVE in Phase 1).',
    canDescription:
      'Reset to any layer (0-17) · time-travel · trigger specific leak events · dump state as JSON · reload fixtures incrementally.',
    phase: 'phase2',
  },
  {
    id: 'qa',
    title: 'QA',
    icon: TestTube,
    audience: 'Testers',
    seesDescription:
      'Scenario library with "happy" + "broken" variants · regression test runner · assertion diff viewer · edge-case toggles · audit log replay.',
    canDescription:
      'Run regression suite · toggle edge cases (duplicate party, TDS mismatch, etc.) · compare expected-vs-actual · mark fixtures passing/failing.',
    phase: 'planned',
  },
  {
    id: 'demo',
    title: 'Demo',
    icon: Presentation,
    audience: 'Sales, founder during client demos',
    seesDescription:
      'Polished UI · guided tour overlay · speaker notes · pre-recorded "wow moments" · Leak Register with dramatic planted leaks · no dev chrome.',
    canDescription:
      'Click-through guided demo · time-travel for "1-week preview" · present-mode fullscreen · scenario switching mid-demo.',
    phase: 'planned',
  },
  {
    id: 'client',
    title: 'Client Self-Service',
    icon: Users,
    audience: 'Prospective clients on free trial',
    seesDescription:
      '14-day demo tenant · industry scenario pre-loaded · banner "DEMO DATA" · inline "Try this feature" prompts.',
    canDescription:
      'Invite team · explore freely · NO data write to real tenants · one-click wipe and reload · migration preview from their Tally.',
    phase: 'planned',
  },
  {
    id: 'financer',
    title: 'Financer',
    icon: TrendingUp,
    audience: 'CFO, investors, lenders, CAs, auditors',
    seesDescription:
      'Financial health dashboard (DSCR, ratios, WC cycle, interest coverage) · Revenue trajectory · Leak Register summary · Audit pack one-click · NO operational clutter.',
    canDescription:
      'Download audit pack · download financing deck · export period-locked snapshot · one-click CA handover · share-able secure link.',
    phase: 'planned',
  },
];

const PHASE_CONFIG: Record<ModePhase, { label: string; color: string }> = {
  live:    { label: 'Live',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function SeedLabPagePanel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-8">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome/dev-tools')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Engineering Console
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Seed &amp; Mock Data Lab</h1>
            <p className="text-sm text-muted-foreground mt-1">
              One-click load of any of 7 client scenarios into a demo tenant.
              Six stakeholder modes. Pre-planted leaks surface in Leak Register automatically.
              Phase 1 ships the live Fixture Coverage Heatmap below — fixtures grow sprint-by-sprint per D-081.
            </p>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3">Fixture Coverage Heatmap</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Live view of which vouchers, masters, and reports have fixtures ready.
            Grows with every sprint per D-081 Seed Framework Contract.
          </p>
          <FixtureCoverageHeatmap />
        </section>

        <section>
          <h2 className="text-lg font-semibold text-foreground mb-1">Six Stakeholder Modes</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Same seed data, six lenses. Mode selector functional in Phase 3.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {STAKEHOLDER_MODES.map(m => {
              const phaseConf = PHASE_CONFIG[m.phase];
              return (
                <div
                  key={m.id}
                  className={cn(
                    "rounded-2xl border bg-card/60 backdrop-blur-xl p-5 transition-all",
                    "opacity-80"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <m.icon className="h-4 w-4 text-primary" />
                    </div>
                    <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{m.title}</h3>
                  <p className="text-[11px] text-muted-foreground/70 mb-2 italic">{m.audience}</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    <span className="font-medium text-foreground/80">Sees: </span>{m.seesDescription}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">Can: </span>{m.canDescription}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <p className="text-xs text-muted-foreground text-center pt-4 border-t">
          Full seed generator · scenario loaders · time-travel · reset controls · leak injector ship in H1.5-SEED Phase 3.
          See roadmap Sheet 0.4 Seed &amp; Mock Data Strategy for complete phasing.
        </p>
      </div>
    </div>
  );
}

export default SeedLabPagePanel;
