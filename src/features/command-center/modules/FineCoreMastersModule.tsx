import {
  Calculator, Shield, FileText, BookOpen, MapPin, Users,
  Settings, ArrowRight, Lock, Landmark, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

interface FineCoreMastersModuleProps {
  onNavigate: (module: CommandCenterModule) => void;
}

const MASTER_CARDS: {
  title: string; desc: string; icon: React.ElementType; module: CommandCenterModule;
  status: 'seeded' | 'empty' | 'coming_soon';
}[] = [
  { title: 'Tax Rate Master', desc: 'GST, VAT, Cess and international tax rate library', icon: Calculator, module: 'finecore-tax-rates', status: 'seeded' },
  { title: 'TDS Sections', desc: 'Tax Deducted at Source — all 30 sections with thresholds', icon: Shield, module: 'finecore-tds', status: 'seeded' },
  { title: 'TCS Sections', desc: 'Tax Collected at Source — goods and services rates', icon: FileText, module: 'finecore-tcs', status: 'seeded' },
  { title: 'HSN / SAC Codes', desc: 'Harmonised System and Service Accounting codes with GST rates', icon: BookOpen, module: 'finecore-hsn-sac', status: 'seeded' },
  { title: 'Professional Tax', desc: 'State-wise professional tax slabs for all employees', icon: MapPin, module: 'finecore-professional-tax', status: 'seeded' },
  { title: 'EPF / ESI / LWF', desc: 'Provident fund, state insurance and welfare fund rates', icon: Users, module: 'finecore-epf-esi-lwf', status: 'seeded' },
  { title: 'Statutory Registrations', desc: 'GSTIN, TAN, PAN, EPF, ESI registration numbers per entity', icon: FileText, module: 'finecore-statutory-reg', status: 'seeded' },
  { title: 'GST Entity Config', desc: 'Registration type, e-invoice, QRMP and turnover slab per entity', icon: Settings, module: 'finecore-gst-config', status: 'seeded' },
  { title: 'Comply360 Config', desc: 'Enable GST automation, Auto RCM, Auto TDS', icon: Shield, module: 'finecore-comply360', status: 'seeded' },
  { title: 'Chart of Accounts', desc: 'Multi-level account tree with grouping', icon: BarChart3, module: 'finecore-hub', status: 'coming_soon' },
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  seeded: { label: 'Seeded', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
  empty: { label: 'Empty', cls: 'bg-muted text-muted-foreground' },
  coming_soon: { label: 'Coming Soon', cls: 'bg-muted text-muted-foreground' },
};

export function FineCoreMastersModule({ onNavigate }: FineCoreMastersModuleProps) {
  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">FineCore Masters</h1>
          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Fin Hub</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure accounting, compliance and payroll masters. All changes here reflect across all FineCore transactions.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Compliance Masters', value: 4 },
          { label: 'Payroll Statutory', value: 3 },
          { label: 'Registrations & Config', value: 3 },
          { label: 'Coming Soon', value: 1 },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MASTER_CARDS.map((card, i) => {
          const Icon = card.icon;
          const isLocked = card.status === 'coming_soon';
          const badge = STATUS_BADGE[card.status];
          return (
            <button
              key={card.title}
              onClick={() => !isLocked && onNavigate(card.module)}
              disabled={isLocked}
              className={`group relative overflow-hidden rounded-2xl p-6 text-left w-full transition-all duration-500 focus:outline-none animate-slide-up ${
                isLocked ? 'opacity-50 cursor-default' : 'hover:scale-[1.02]'
              }`}
              style={{ animationDelay: `${0.05 + i * 0.04}s`, animationFillMode: 'backwards' }}
            >
              <div className="absolute inset-0 backdrop-blur-xl border rounded-2xl bg-card/60 border-border" />
              {!isLocked && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-2xl" />
              )}
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    {isLocked ? <Lock className="h-5 w-5 text-muted-foreground" /> : <Icon className="h-5 w-5 text-indigo-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${badge.cls}`}>{badge.label}</Badge>
                    {!isLocked && <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground/80 group-hover:translate-x-1 transition-all" />}
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
}