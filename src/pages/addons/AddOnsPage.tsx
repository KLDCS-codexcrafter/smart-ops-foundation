import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, QrCode, Puzzle, MessageCircle, TrendingUp, Cpu, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

type AddonPhase = 'live' | 'phase2' | 'planned';

interface Addon {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  route: string;
  phase: AddonPhase;
}

const ADDONS: Addon[] = [
  {
    id: 'barcode',
    title: 'Barcode',
    icon: QrCode,
    description: 'Standalone barcode generation for Tally users — pull items, generate labels, print.',
    details: 'Works without the full ERP. Connects to Tally via the Bridge sync engine. Supports EAN-13, QR, Code 128, ITF-14. 4 label templates included.',
    route: '/add-ons/barcode',
    phase: 'phase2',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Integration',
    icon: MessageCircle,
    description: 'Send invoices, payment reminders, and order confirmations via WhatsApp Business API.',
    details: 'Planned: Connect WhatsApp Business API to trigger automated messages on voucher events — invoice shared, payment received, dispatch confirmed.',
    route: '/add-ons/whatsapp',
    phase: 'planned',
  },
  {
    id: 'ai-price',
    title: 'AI Price Forecasting',
    icon: TrendingUp,
    description: 'ML-based price movement prediction for raw materials and finished goods.',
    details: 'Planned: Analyses historical purchase rates, market trends, and seasonal patterns to suggest optimal buying windows and reorder prices.',
    route: '/add-ons/ai-price',
    phase: 'planned',
  },
  {
    id: 'hardware',
    title: 'Hardware Connectors',
    icon: Wifi,
    description: 'Connect weighing scales, barcode scanners, RFID readers, and thermal printers directly.',
    details: 'Planned: Drivers and middleware for common hardware used in Indian warehouses and factories — USB/Bluetooth/LAN device support.',
    route: '/add-ons/hardware',
    phase: 'planned',
  },
];

const PHASE_CONFIG: Record<AddonPhase, { label: string; color: string }> = {
  live:    { label: 'Live',       color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned',   color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export default function AddOnsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Puzzle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Add-ons</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Optional bolt-on extensions — integrations, plugins, AI tools and hardware connectors beyond the core ERP.
              These work standalone or alongside the full Operix ERP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{ADDONS.filter(a => a.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{ADDONS.filter(a => a.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{ADDONS.filter(a => a.phase === 'planned').length}</span> Planned</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {ADDONS.map(addon => {
            const phaseConf = PHASE_CONFIG[addon.phase];
            const isClickable = addon.phase !== 'planned';
            return (
              <button
                key={addon.id}
                onClick={() => isClickable && navigate(addon.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable
                    ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                    : "opacity-60 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <addon.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{addon.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                <p className="text-xs text-muted-foreground/70">{addon.details}</p>
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
          More add-ons are in development. Planned items are subject to change based on client demand.
        </p>
      </div>
    </div>
  );
}
