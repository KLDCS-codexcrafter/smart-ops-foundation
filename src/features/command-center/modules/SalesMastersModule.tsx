import { useMemo } from 'react';
import { Network, Users, Compass, Megaphone, MapPin, Route, Target, ArrowRight, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CommandCenterModule } from '../pages/CommandCenterPage';
import { getPrimaryEntity } from '@/data/mock-entities';
import { schemesKey } from '@/types/scheme';

interface Props { onNavigate: (m: CommandCenterModule) => void; }

interface MasterCard {
  title: string;
  desc: string;
  icon: React.ElementType;
  module: CommandCenterModule;
  storageKey: string;
  section: 'sales-org' | 'sales-ops';
}

function getMasterStatus(key: string): 'live' | 'empty' {
  try {
    // [JWT] GET /api/sales/master-status/:key
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return 'live';
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return 'live';
    }
  } catch { /* ignore */ }
  return 'empty';
}

const SECTION_META = {
  'sales-org': 'Sales Organisation',
  'sales-ops': 'Sales Operations',
} as const;

export function SalesMastersModule({ onNavigate }: Props) {
  // T-H1.5-C-S1 (CC-029) — Resolve entity code dynamically; replaces _SMRT literal.
  const MASTER_CARDS = useMemo<MasterCard[]>(() => {
    const entityCode = getPrimaryEntity().shortCode;
    return [
      { title: 'Sales Hierarchy',  desc: 'Reporting structure of sales team — CEO > Sales Head > RM > ASM > Salesman.', icon: Network, module: 'sales-hierarchy', storageKey: 'erp_salesx_hierarchy_nodes', section: 'sales-org' },
      { title: 'SAM Persons',      desc: 'Salesman / Agent / Broker / Receiver / Reference persons. Core for commission and ownership.', icon: Users, module: 'sales-sam-person', storageKey: 'erp_sam_persons', section: 'sales-org' },
      { title: 'Enquiry Source',   desc: 'Lead origination channels — website, referral, cold-call, campaign.', icon: Compass, module: 'sales-enquiry-source', storageKey: 'erp_enquiry_sources', section: 'sales-ops' },
      { title: 'Campaign',         desc: 'Marketing campaigns — digital, offline, events. Lead attribution.', icon: Megaphone, module: 'sales-campaign', storageKey: 'erp_campaigns', section: 'sales-ops' },
      { title: 'Territory',        desc: 'Geo territories for field sales. Nested hierarchies supported.', icon: MapPin, module: 'sales-territory', storageKey: 'erp_territories', section: 'sales-ops' },
      { title: 'Beat Routes',      desc: 'Daily field-visit routes — which salesman covers which customers on which day.', icon: Route, module: 'sales-beat-route', storageKey: 'erp_beat_routes', section: 'sales-ops' },
      { title: 'Targets',          desc: 'Monthly / quarterly targets per salesman — revenue, volume, visits, conversion.', icon: Target, module: 'sales-target', storageKey: 'erp_sales_targets', section: 'sales-ops' },
      { title: 'Sales Schemes',    desc: 'Promotional schemes — slab discount, BNGM, QPS, bundle. Audience: distributor / customer / both.', icon: Sparkles, module: 'sales-schemes', storageKey: schemesKey(entityCode), section: 'sales-ops' },
    ];
  }, []);

  const sections: ('sales-org' | 'sales-ops')[] = ['sales-org', 'sales-ops'];
  const liveCount = MASTER_CARDS.filter(c => getMasterStatus(c.storageKey) === 'live').length;

  return (
    <div className="space-y-6 relative">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">Sales Masters</h1>
          <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">SalesX</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Sales organisation and operations masters — drives ownership, attribution, territory and target cascade.
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-amber-500/5 to-transparent rounded-2xl" />
                    <div className="relative z-10 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-amber-500" />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-[10px] ${status === 'live' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-muted text-muted-foreground'}`}>
                            {status === 'live' ? 'Live' : 'Empty'}
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

export default SalesMastersModule;
