import { useMemo } from 'react';
import { Users, Truck, Tag, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CommandCenterModule } from '../pages/CommandCenterPage';
import { useEntityCode } from '@/hooks/useEntityCode';
import { customerSegmentsKey } from '@/types/customer-loyalty';

interface Props { onNavigate: (m: CommandCenterModule) => void; }

interface MasterCard {
  title: string;
  desc: string;
  icon: React.ElementType;
  module: CommandCenterModule;
  storageKey: string;
  section: 'customer-vendor';
}

function getMasterStatus(key: string): 'live' | 'empty' {
  try {
    // [JWT] GET /api/crm/master-status/:key
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return 'live';
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return 'live';
    }
  } catch { /* ignore */ }
  return 'empty';
}

export function CRMMastersModule({ onNavigate }: Props) {
  // T-H1.5-C-S1-patch (F2) — Use reactive hook so status updates when user switches company in ERP header.
  const { entityCode } = useEntityCode();
  const MASTER_CARDS = useMemo<MasterCard[]>(() => {
    return [
      {
        title: 'Customer Master',
        desc: 'All tenant customers — ledger, contacts, addresses, credit limits. Used by FineCore, SalesX, ReceivX, Distributor Hub, Customer Hub.',
        icon: Users,
        module: 'crm-customer',
        storageKey: 'erp_group_customer_master',
        section: 'customer-vendor',
      },
      {
        title: 'Vendor Master',
        desc: 'All tenant vendors — ledger, GSTIN, TDS, bank details, payment terms. Used by FineCore, Procure360, PayOut.',
        icon: Truck,
        module: 'crm-vendor',
        storageKey: 'erp_group_vendor_master',
        section: 'customer-vendor',
      },
      {
        title: 'Customer Segments',
        desc: 'Audience groupings for scheme targeting — VIP, festival buyers, new, at-risk.',
        icon: Tag,
        module: 'crm-customer-segments',
        storageKey: customerSegmentsKey(entityCode),
        section: 'customer-vendor',
      },
    ];
  }, [entityCode]);

  const liveCount = MASTER_CARDS.filter(c => getMasterStatus(c.storageKey) === 'live').length;

  return (
    <div className="space-y-6 relative">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">CRM Masters</h1>
          <Badge className="text-[10px] bg-sky-500/10 text-sky-600 border-sky-500/20">Cross-Card</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Customer and Vendor relationship masters — single source of truth used by every transaction card.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Masters', value: MASTER_CARDS.length },
          { label: 'Live / Configured', value: liveCount },
          { label: 'Sections', value: 1 },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Customer & Vendor Relationship Masters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {MASTER_CARDS.map((card, i) => {
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
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-sky-500/5 to-transparent rounded-2xl" />
                <div className="relative z-10 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-sky-500" />
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
    </div>
  );
}

export default CRMMastersModule;
