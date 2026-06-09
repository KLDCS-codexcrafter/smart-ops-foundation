/**
 * @file     src/pages/addons/AddOnsPage.tsx
 * @sprint   CATALOG-1 · T-CAT1-Modules-AddOns
 * @purpose  Catalog of 12 add-ons. Catalog-entries-ONLY this sprint — every
 *           phase2 entry LINKS to an EXISTING surface (no fabricated landing
 *           pages). Only AI-Price and Hardware are 'planned' (non-clickable)
 *           because the capability is not yet built.
 */
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ArrowRight, QrCode, Puzzle, MessageCircle, TrendingUp, Wifi,
  CheckSquare, FileCheck2, RefreshCw, Sparkles, ShieldCheck, MessagesSquare,
  BarChart3, DoorOpen,
} from 'lucide-react';
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
  capability: string;
}

const ADDONS: Addon[] = [
  {
    id: 'barcode', title: 'Barcode', icon: QrCode,
    description: 'Standalone barcode generation for Tally users — pull items, generate labels, print.',
    details: 'EAN-13, QR, Code 128, ITF-14 with 4 label templates. Connects to Tally via the Bridge sync engine.',
    route: '/add-ons/barcode', phase: 'phase2',
    capability: 'Barcode add-on page (banked) + InventoryHub labels',
  },
  {
    id: 'whatsapp', title: 'WhatsApp Integration', icon: MessageCircle,
    description: 'Send invoices, payment reminders, order confirmations via WhatsApp Business API.',
    details: 'Templates and routing are wired through Customer Hub today; live WA Business API connector arrives with the Wave-2 deploy.',
    route: '/erp/customer-hub', phase: 'phase2',
    capability: 'Customer Hub comm templates (banked) + useWaTemplates',
  },
  {
    id: 'ai-price', title: 'AI Price Forecasting', icon: TrendingUp,
    description: 'ML-based price movement prediction for raw materials and finished goods.',
    details: 'Planned. Analyses historical purchase rates, market trends, and seasonal patterns to suggest optimal buying windows. Capability not yet built.',
    route: '/add-ons/ai-price', phase: 'planned',
    capability: 'Not built — planned',
  },
  {
    id: 'hardware', title: 'Hardware Connectors', icon: Wifi,
    description: 'Weighing scales, barcode scanners, RFID readers, thermal printers — directly connected.',
    details: 'Planned. Drivers and middleware for common warehouse/factory hardware. Capability not yet built.',
    route: '/add-ons/hardware', phase: 'planned',
    capability: 'Not built — planned',
  },
  {
    id: 'approvals', title: 'Approval Workflows', icon: CheckSquare,
    description: 'Multi-stage approval routing for vouchers, POs, payments, masters.',
    details: 'Approvals-pending register + bridge approvals queue — bolt onto any voucher class with role-based escalation.',
    route: '/erp/fincore/registers/approvals-pending', phase: 'phase2',
    capability: 'Approvals register + bridge/approvals (banked)',
  },
  {
    id: 'einv-ewb', title: 'E-Invoice & E-Way Bill', icon: FileCheck2,
    description: 'IRN generation, QR print, EWB auto-generate with NIC sandbox/live toggle.',
    details: 'Comply360 tax-GST surfaces handle IRN/EWB locks, RCM detection, GSTR reconciliation.',
    route: '/erp/comply360', phase: 'phase2',
    capability: 'Comply360 tax-GST + IRN locks (banked)',
  },
  {
    id: 'tally-sync', title: 'Tally Sync', icon: RefreshCw,
    description: 'Two-way Tally sync — masters, vouchers, day book, with conflict resolution.',
    details: 'Bridge console handles agents, sync profiles, exceptions, reconciliation, and audit trail end-to-end.',
    route: '/bridge', phase: 'phase2',
    capability: 'Bridge console + sync engine (banked)',
  },
  {
    id: 'master-cleanup', title: 'Master Cleanup', icon: Sparkles,
    description: 'Dedupe parties, items, ledgers across companies — merge, classify, attach GSTIN/PAN.',
    details: 'Bridge reconciliation surface with classification and dedupe — run before any Tally import.',
    route: '/bridge/reconciliation', phase: 'phase2',
    capability: 'Bridge reconciliation (banked)',
  },
  {
    id: 'tamper-audit', title: 'Tamper-Proof Audit', icon: ShieldCheck,
    description: 'FNV-1a hash chain on every voucher — tamper detection per MCA Rule 3(1).',
    details: 'Bridge audit surface surfaces hash-chain integrity + MCA audit-trail compliance evidence.',
    route: '/bridge/audit', phase: 'phase2',
    capability: 'Voucher integrity hashing + MCA audit-trail (banked)',
  },
  {
    id: 'omni-comms', title: 'Omni-Channel Comms', icon: MessagesSquare,
    description: 'Email + WhatsApp + SMS + portal — one inbox with SLA tracking.',
    details: 'ServiceDesk multi-channel intake handles the unified inbox and routing today.',
    route: '/erp/servicedesk', phase: 'phase2',
    capability: 'ServiceDesk multi-channel (banked)',
  },
  {
    id: 'analytics-insightx', title: 'Analytics — InsightX', icon: BarChart3,
    description: 'Cockpit dashboards, drill-downs, scheduled exports across every card.',
    details: 'InsightX cockpit with cross-card KPIs, drill-down and scheduled reports.',
    route: '/erp/insightx', phase: 'phase2',
    capability: 'InsightX cockpit (banked)',
  },
  {
    id: 'gate-weighbridge', title: 'Gate + Weighbridge', icon: DoorOpen,
    description: 'Gate-in/out register tied to weighbridge ticket, photo capture, e-gate pass.',
    details: 'GateFlow handles vehicles, visitors, weighbridge tickets and e-gate-pass generation today.',
    route: '/erp/gateflow', phase: 'phase2',
    capability: 'GateFlow + weighbridge (banked)',
  },
];

const PHASE_CONFIG: Record<AddonPhase, { label: string; color: string }> = {
  live:    { label: 'Live',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export function AddOnsPagePanel() {
  const navigate = useNavigate();

  return (
    <div data-keyboard-form className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6 space-y-6">

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
              12 optional bolt-on extensions — integrations, plugins, AI tools and hardware connectors
              beyond the core ERP. Phase 2 add-ons link straight into the live capability inside the
              Operix shell; standalone packaging arrives with the Wave-2 deploy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{ADDONS.filter(a => a.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{ADDONS.filter(a => a.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{ADDONS.filter(a => a.phase === 'planned').length}</span> Planned</span>
          <span className="ml-auto"><span className="font-semibold text-foreground">{ADDONS.length}</span> total</span>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ADDONS.map(addon => {
            const phaseConf = PHASE_CONFIG[addon.phase];
            const isClickable = addon.phase !== 'planned';
            return (
              <button
                key={addon.id}
                onClick={() => isClickable && navigate(addon.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-5 text-left w-full transition-all duration-300",
                  isClickable
                    ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                    : "opacity-60 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <addon.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{addon.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                <p className="text-xs text-muted-foreground/70">{addon.details}</p>
                {isClickable && (
                  <div className="flex items-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Open capability <ArrowRight className="h-3 w-3" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          More add-ons in development. Planned items (AI-Price, Hardware) are non-clickable until the capability lands.
        </p>
      </div>
    </div>
  );
}
export default function AddOnsPage() { return <AddOnsPagePanel />; }

// Test surface — exported only for the CATALOG-1 behavioral test
export { ADDONS as __CAT1_ADDONS__ };
