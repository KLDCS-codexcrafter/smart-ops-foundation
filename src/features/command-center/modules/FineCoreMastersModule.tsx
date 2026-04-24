import { useMemo } from 'react';
import {
  Calculator, Shield, BookOpen, Users, Settings, ArrowRight,
  Landmark, FolderTree, Wallet, FileText, Receipt, FileSpreadsheet, Coins, Zap, Calendar,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { fiscalYearStorageKey } from '@/types/fiscal-year';
import type { CommandCenterModule } from '../pages/CommandCenterPage';

interface FineCoreMastersModuleProps {
  onNavigate: (module: CommandCenterModule) => void;
}

interface MasterCard {
  title: string;
  desc: string;
  icon: React.ElementType;
  module: CommandCenterModule;
  storageKey: string; // localStorage key for live status check
  section: 'statutory' | 'entity-config' | 'account-structure' | 'transaction-defaults';
}

function getMasterStatus(key: string): 'seeded' | 'empty' | 'live' {
  try {
    // [JWT] GET /api/finecore/master-status/:key
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return 'live';
      if (typeof parsed === 'object' && parsed !== null && Object.keys(parsed).length > 0) return 'live';
    }
  } catch { /* ignore */ }
  return 'empty';
}

// MASTER_CARDS moved inside component to use reactive entityCode (T-H1.5-C-S3)

const SECTION_META: Record<string, { label: string; badgeLabel: string; badgeCls: string }> = {
  'statutory': { label: 'Statutory Reference', badgeLabel: 'Platform', badgeCls: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' },
  'entity-config': { label: 'Entity Configuration', badgeLabel: 'Configure', badgeCls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  'account-structure': { label: 'Account Structure', badgeLabel: '', badgeCls: '' },
  'transaction-defaults': { label: 'Transaction Defaults', badgeLabel: '', badgeCls: '' },
};

export function FineCoreMastersModule({ onNavigate }: FineCoreMastersModuleProps) {
  const { entityCode } = useEntityCode();
  const MASTER_CARDS = useMemo<MasterCard[]>(() => [
    // Statutory Reference
    { title: 'GST Rate Reference', desc: '24 GST rates + international — maintained by 4DSmartOps', icon: Calculator, module: 'finecore-tax-rates', storageKey: 'erp_tax_rates', section: 'statutory' },
    { title: 'TDS / TCS Sections', desc: 'Tax deducted and collected at source — all sections', icon: Shield, module: 'finecore-tds', storageKey: 'erp_tds_sections', section: 'statutory' },
    { title: 'HSN / SAC Directory', desc: '100+ codes with GST rates — searchable reference', icon: BookOpen, module: 'finecore-hsn-sac', storageKey: 'erp_hsn_sac_codes', section: 'statutory' },
    { title: 'Payroll Statutory', desc: 'EPF, ESI, LWF, Professional Tax — contribution rates', icon: Users, module: 'finecore-epf-esi-lwf', storageKey: 'erp_epf_esi_lwf', section: 'statutory' },
    { title: 'Income Tax Reference', desc: 'IT slabs, deductions, gratuity — FY 2024-25', icon: Receipt, module: 'finecore-income-tax', storageKey: 'erp_income_tax', section: 'statutory' },
    // Entity Configuration
    { title: 'Statutory Registrations', desc: 'GSTIN, TAN, PAN per entity', icon: FileText, module: 'finecore-statutory-reg', storageKey: 'erp_statutory_registrations', section: 'entity-config' },
    { title: 'GST Entity Config', desc: 'Registration type, e-Invoice, QRMP', icon: Settings, module: 'finecore-gst-config', storageKey: 'erp_gst_entity_config', section: 'entity-config' },
    { title: 'Comply360 Config', desc: 'Feature flags and ledger mappings', icon: Shield, module: 'finecore-comply360', storageKey: 'erp_comply360_config', section: 'entity-config' },
    // Account Structure
    { title: 'Currency Master', desc: 'Foreign currencies + date-wise rates of exchange (selling / buying / standard)', icon: Coins, module: 'finecore-currency', storageKey: 'erp_currencies', section: 'account-structure' },
    { title: 'FinFrame — Account Groups', desc: '4-level account hierarchy — L4 user-created', icon: FolderTree, module: 'finecore-finframe', storageKey: 'erp_finframe_groups', section: 'account-structure' },
    { title: 'Ledger Master', desc: 'Cash, Bank and all financial accounts per entity', icon: Wallet, module: 'finecore-ledgers', storageKey: 'erp_ledgers', section: 'account-structure' },
    { title: 'Voucher Types', desc: 'Behaviour matrix — 24 Tally-aligned types with embedded rules', icon: FileSpreadsheet, module: 'finecore-voucher-types', storageKey: 'erp_voucher_types', section: 'account-structure' },
    // Transaction Defaults
    { title: 'Transaction Templates', desc: 'Standard narrations, T&C and payment enforcement — 26 ready templates', icon: Zap, module: 'finecore-transaction-templates', storageKey: 'erp_transaction_templates', section: 'transaction-defaults' },
    { title: 'Mode of Payment', desc: '10 seeded modes — Cash, Cheque, NEFT, RTGS, UPI, IMPS, DD, LC, Bank Transfer, Advance Online', icon: Coins, module: 'finecore-mode-of-payment', storageKey: 'erp_group_mode_of_payment', section: 'transaction-defaults' },
    { title: 'Terms of Payment', desc: '10 seeded terms — Immediate, Net 7/15/30/45/60/90, 50% Adv, 100% Adv, LC', icon: Calculator, module: 'finecore-terms-of-payment', storageKey: 'erp_group_terms_of_payment', section: 'transaction-defaults' },
    { title: 'Terms of Delivery', desc: 'Incoterms + delivery-location standards', icon: FileText, module: 'finecore-terms-of-delivery', storageKey: 'erp_group_terms_of_delivery', section: 'transaction-defaults' },
    { title: 'Fiscal Year Calendar', desc: '12-period FY calendar with lock-period + close-FY governance', icon: Calendar, module: 'finecore-fiscal-year', storageKey: fiscalYearStorageKey(entityCode), section: 'transaction-defaults' },
  ], [entityCode]);

  const sections = ['statutory', 'entity-config', 'account-structure', 'transaction-defaults'] as const;

  const statutoryCount = MASTER_CARDS.filter(c => c.section === 'statutory').length;
  const entityCount = MASTER_CARDS.filter(c => c.section === 'entity-config').length;
  const accountCount = MASTER_CARDS.filter(c => c.section === 'account-structure').length;
  const liveCount = MASTER_CARDS.filter(c => getMasterStatus(c.storageKey) === 'live').length;

  return (
    <div className="space-y-6 relative">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-foreground">FineCore Masters</h1>
          <Badge className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Fin Hub</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Configure accounting, compliance and payroll masters. All changes here reflect across all FineCore transactions.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Statutory Reference', value: statutoryCount },
          { label: 'Entity Configuration', value: entityCount },
          { label: 'Account Structure', value: accountCount },
          { label: 'Total Masters', value: MASTER_CARDS.length },
          { label: 'Live / Configured', value: liveCount },
        ].map(s => (
          <div key={s.label} className="rounded-xl bg-card/60 backdrop-blur-xl border border-border p-4 text-center">
            <p className="text-2xl font-bold text-foreground font-mono">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {sections.map(sectionKey => {
        const meta = SECTION_META[sectionKey];
        const cards = MASTER_CARDS.filter(c => c.section === sectionKey);
        return (
          <div key={sectionKey} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">{meta.label}</h2>
              {meta.badgeLabel && (
                <Badge variant="outline" className={`text-[9px] ${meta.badgeCls}`}>{meta.badgeLabel}</Badge>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {cards.map((card, i) => {
                const Icon = card.icon;
                const status = card.section === 'statutory' ? 'seeded' : getMasterStatus(card.storageKey);
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
                          {sectionKey === 'statutory' && (
                            <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">Platform</Badge>
                          )}
                          {sectionKey === 'entity-config' && (
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">Configure</Badge>
                          )}
                          <Badge variant="outline" className={`text-[10px] ${
                            status === 'live' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            status === 'seeded' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            'bg-muted text-muted-foreground'
                          }`}>{status === 'live' ? 'Live' : status === 'seeded' ? 'Seeded' : 'Empty'}</Badge>
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
