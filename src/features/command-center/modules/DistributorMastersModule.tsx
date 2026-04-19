import { Network, TrendingDown, Wallet, AlertOctagon, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

interface Props { onNavigate: (m: CommandCenterModule) => void; }

interface MasterCard {
  title: string;
  desc: string;
  icon: React.ElementType;
  module: CommandCenterModule;
  storageKey: string | null; // null = reference-only, no CRUD
  section: 'distributor-structure' | 'distributor-pricing' | 'distributor-reference';
}

function getMasterStatus(key: string | null): 'live' | 'empty' | 'reference' {
  if (key === null) return 'reference';
  try {
    // [JWT] GET /api/distributor/master-status/:key
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return 'live';
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return 'live';
    }
  } catch { /* ignore */ }
  return 'empty';
}

const MASTER_CARDS: MasterCard[] = [
  { title: 'Distributor Hierarchy', desc: 'Super Stockist > Distributor > Sub-Dealer > Retailer tree. Drives downstream view and target cascade.', icon: Network, module: 'distributor-hierarchy', storageKey: 'erp_hierarchy_nodes', section: 'distributor-structure' },
  { title: 'Price Lists',           desc: 'Tier-based price lists with visible-to-tier filters. Gold / Silver / Bronze catalogs.', icon: TrendingDown, module: 'distributor-price-list', storageKey: 'erp_price_lists', section: 'distributor-pricing' },
  { title: 'Credit Request Types',  desc: 'Reference data — urgency levels (normal, festival, emergency) and request statuses.', icon: Wallet, module: 'distributor-credit-refs', storageKey: null, section: 'distributor-reference' },
  { title: 'Dispute Reasons',       desc: 'Reference data — 6 reasons (short supply, damaged, wrong item, rate mismatch, quality, other).', icon: AlertOctagon, module: 'distributor-dispute-refs', storageKey: null, section: 'distributor-reference' },
];

const SECTION_META = {
  'distributor-structure': 'Distributor Structure',
  'distributor-pricing': 'Distributor Pricing',
  'distributor-reference': 'Reference Data',
} as const;

export function DistributorMastersModule({ onNavigate }: Props) {
  const sections: ('distributor-structure' | 'distributor-pricing' | 'distributor-reference')[] = ['distributor-structure', 'distributor-pricing', 'distributor-reference'];
  const liveCount = MASTER_CARDS.filter(c => getMasterStatus(c.storageKey) === 'live').length;

  return (
    <div className="space-y-6 relative">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Distributor Masters</h1>
          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Distributor Hub</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Distributor channel structure, tier pricing and reference data for credit and dispute workflows.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Masters', value: MASTER_CARDS.length },
          { label: 'Live / Configured', value: liveCount },
          { label: 'Sections', value: sections.length },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {sections.map(sectionKey => {
        const cards = MASTER_CARDS.filter(c => c.section === sectionKey);
        return (
          <div key={sectionKey} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{SECTION_META[sectionKey]}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map((card, i) => {
                const Icon = card.icon;
                const status = getMasterStatus(card.storageKey);
                return (
                  <button
                    key={card.title}
                    onClick={() => onNavigate(card.module)}
                    className="group relative overflow-hidden rounded-2xl p-6 text-left w-full transition-all duration-500 focus:outline-none hover:scale-[1.02] animate-slide-up"
                    style={{ animationDelay: `${0.05 + i * 0.04}s`, animationFillMode: 'backwards' }}
                  >
                    <div className="absolute inset-0 backdrop-blur-xl border rounded-2xl bg-card/60 border-border" />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl" />
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${
                            status === 'live' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            status === 'reference' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {status === 'live' ? 'Live' : status === 'reference' ? 'Reference' : 'Empty'}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/80 group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{card.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DistributorMastersModule;
