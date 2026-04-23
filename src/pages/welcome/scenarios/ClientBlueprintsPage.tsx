import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Building,
  Factory,
  Coffee,
  Landmark,
  Cpu,
  Home,
  FlaskConical,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ScenarioPhase = 'live' | 'phase2' | 'planned';

interface ClientBlueprint {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  description: string;
  details: string;
  pattern: string;
  phase: ScenarioPhase;
  fixtureCoverage: number;
  founderAnchor?: boolean;
}

const CLIENT_BLUEPRINTS: ClientBlueprint[] = [
  {
    id: 'abdos',
    title: 'Abdos India',
    subtitle: 'Multi-BU Conglomerate',
    icon: Factory,
    description:
      'Diversified 5-BU group: Life Sciences, Contract Manufacturing, Packaging, Distribution, Hygiene & Homecare. Validates multi-BU, contract mfg, export, multi-channel.',
    details:
      '1967 · 2500+ employees · 10 mfg facilities · 90+ countries served. Clients include Unilever, P&G, Serum Institute, Novartis, Dr Reddy\u2019s. Pattern: large diversified conglomerate.',
    pattern: 'Multi-BU Conglomerate + Contract Mfg + Export + FMCG',
    phase: 'planned',
    fixtureCoverage: 0,
  },
  {
    id: 'cherise',
    title: 'Cherise India',
    subtitle: 'IoT + D2C + Quick-Commerce',
    icon: Coffee,
    description:
      'IoT-enabled smart vending (Cherise Tapri/Kettle/Buddy) + 7 beverage sub-brands. Multi-channel: own D2C, Amazon, Flipkart, Blinkit, B2B vending AMC, bulk export.',
    details:
      'Pune factory · Mumbai HQ · ~150 vending devices · razor-blade pod consumables model · Live on Blinkit quick-commerce. Pattern: next-gen IoT+D2C business model.',
    pattern: 'IoT-Connected Device + D2C + Quick-Commerce + Export',
    phase: 'planned',
    fixtureCoverage: 0,
  },
  {
    id: 'bcpl',
    title: 'Bengal Chemicals (BCPL)',
    subtitle: 'PSU + Pharma + Chemical',
    icon: Landmark,
    description:
      'Government PSU under Ministry of Chemicals & Fertilizers. India\u2019s first pharma company (1901, Acharya P.C. Ray). 3 divisions: Industrial Chemicals, Pharmaceuticals, Home Products.',
    details:
      'Kolkata HQ · Central PSU · Privatisation ongoing. Validates PSU procurement (GeM), CAG audit, tender lifecycle, parliamentary scrutiny. Needs PSU Pack.',
    pattern: 'PSU / Regulated Entity + Pharma + Heavy Chemicals + FMCG',
    phase: 'planned',
    fixtureCoverage: 0,
  },
  {
    id: 'smartpower',
    title: 'Smartpower Automation',
    subtitle: 'Mfg + AMC + Dealer',
    icon: Cpu,
    description:
      'Eastern India UPS brand (since 1992). Diversified in 2006 into Door/Gate Automation + Security Solutions. Manufacturing + installation + AMC revenue mix.',
    details:
      'Kolkata · Regional leader · B2B + institutional. Clients include Garden Reach Shipbuilders (GRSE). AMC is primary revenue. Validates post-sale model for capital-equipment mfrs.',
    pattern: 'Manufacturer + Installation Project + AMC (primary) + Dealer Network',
    phase: 'planned',
    fixtureCoverage: 0,
  },
  {
    id: 'amith',
    title: 'Amith Group',
    subtitle: 'Import + Retail + Franchise',
    icon: Home,
    description:
      'Marble/Granite/Tile/Sanitaryware trading. Multi-category retail: stone, tiles, faucets, wellness, kitchen. Two showrooms + expanding Amith Mart franchise.',
    details:
      'Since 2001 · Howrah/Kolkata · Franchise expansion. Kajaria partnership. Validates distribution-heavy retail pattern common in building-materials, furniture, luxury.',
    pattern: 'Import Trader + Showroom Retail + Franchise Network + B2B Interior',
    phase: 'planned',
    fixtureCoverage: 0,
  },
  {
    id: 'shankar-pharma',
    title: 'Shankar Pharma Industries',
    subtitle: 'Complex Multi-Entity (D-082)',
    icon: FlaskConical,
    description:
      'Pre-existing complex scenario per D-082. Fictional 3-company pharma group with 6-tier hierarchy. Used for stress-testing complex multi-entity scenarios.',
    details:
      '3 companies (parent + 2 subsidiaries + SEZ branch) · 6-tier hierarchy · ~200 customers · ~400 items · 18 months of transactions.',
    pattern: 'Complex 3-Company Group + 6-Tier Hierarchy + Pharma Focus',
    phase: 'planned',
    fixtureCoverage: 0,
  },
  {
    id: 'sinha',
    title: 'Sinha Industries',
    subtitle: 'ETO + Turnkey Projects ★',
    icon: Wrench,
    description:
      'Material handling systems (belt/bucket/screw/chain conveyors) + mechanical fabrication + spare parts. Engineer-to-Order turnkey projects for core-sector industries. CAD/CAM-driven, ISO + IEC certified, domestic + export.',
    details:
      'Proprietor Mr. Prosenjit Sinha · Kolkata · 81 skilled workmen + 18 staff · SSI + NSIC registered. ★ Founder Motivation anchor — the person who motivated Operix to exist. Validates Engineer-to-Order pattern distinct from make-to-stock manufacturing.',
    pattern: 'Engineer-to-Order + Turnkey Projects + Spares + Export',
    phase: 'planned',
    fixtureCoverage: 0,
    founderAnchor: true,
  },
];

const PHASE_CONFIG: Record<ScenarioPhase, { label: string; color: string }> = {
  live:    { label: 'Live',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function ClientBlueprintsPagePanel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Blueprints</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Seven design-partner client scenarios that anchor Operix\u2019s universal ERP architecture.
              If Operix serves all seven cleanly, it serves 80%+ of the Indian mid-market.
              These are reference templates — not delivery targets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{CLIENT_BLUEPRINTS.filter(b => b.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{CLIENT_BLUEPRINTS.filter(b => b.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{CLIENT_BLUEPRINTS.filter(b => b.phase === 'planned').length}</span> Planned</span>
          <span className="ml-auto text-amber-600 dark:text-amber-400">★ Founder Motivation anchor</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {CLIENT_BLUEPRINTS.map(b => {
            const phaseConf = PHASE_CONFIG[b.phase];
            const isClickable = b.phase === 'live';
            return (
              <button
                key={b.id}
                onClick={() => isClickable && navigate(`/welcome/scenarios/${b.id}`)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable
                    ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                    : "opacity-70 cursor-default",
                  b.founderAnchor && "ring-1 ring-amber-300/60 dark:ring-amber-500/40"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <b.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">
                  {b.title}
                  {b.founderAnchor && <span className="ml-2 text-amber-500">★</span>}
                </h3>
                <p className="text-xs text-muted-foreground mb-2">{b.subtitle}</p>
                <p className="text-sm text-muted-foreground mb-2">{b.description}</p>
                <p className="text-xs text-muted-foreground/70 mb-3">{b.details}</p>

                <div className="pt-3 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fixture coverage</span>
                    <span className="font-medium text-foreground">{b.fixtureCoverage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 transition-all"
                      style={{ width: `${b.fixtureCoverage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 italic">{b.pattern}</p>
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Scenario seed generators + stakeholder modes + pre-planted leaks ship in H1.5-SEED Phase 3.
          Fixtures grow with every sprint per D-081 Seed Framework Contract.
        </p>
      </div>
    </div>
  );
}

export default ClientBlueprintsPagePanel;
