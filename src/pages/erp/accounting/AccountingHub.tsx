/**
 * AccountingHub.tsx — Zone 3 navigation landing page
 * [JWT] All counts are local state. Real: GET /api/accounting/stats
 */
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, ArrowRight, Calculator, FileText, Shield, BookOpen,
  BarChart3, Landmark, FileSpreadsheet, Briefcase, Coins, PiggyBank,
  MapPin, Users, Settings, Building2, FolderTree,
} from 'lucide-react';

const COMPLIANCE_CARDS = [
  { title: 'Tax Rates', desc: 'GST, VAT, Cess and international tax rate library', icon: Calculator, href: '/erp/accounting/tax-rates' },
  { title: 'TDS Sections', desc: 'Tax Deducted at Source — all 30 sections with thresholds', icon: Shield, href: '/erp/accounting/tds-sections' },
  { title: 'TCS Sections', desc: 'Tax Collected at Source — goods and services rates', icon: FileText, href: '/erp/accounting/tcs-sections' },
  { title: 'HSN / SAC Codes', desc: 'Harmonised System and Service Accounting codes with GST rates', icon: BookOpen, href: '/erp/accounting/hsn-sac' },
];

const PAYROLL_CARDS = [
  { title: 'Professional Tax', desc: 'State-wise professional tax slabs for all employees', icon: MapPin, href: '/erp/accounting/professional-tax' },
  { title: 'EPF / ESI / LWF', desc: 'Provident fund, state insurance and welfare fund rates', icon: Users, href: '/erp/accounting/epf-esi-lwf' },
  { title: 'Statutory Registrations', desc: 'GSTIN, TAN, PAN, EPF, ESI registration numbers per entity', icon: FileText, href: '/erp/accounting/statutory-registrations' },
  { title: 'GST Entity Config', desc: 'Registration type, e-invoice, QRMP and turnover slab per entity', icon: Settings, href: '/erp/accounting/gst-config' },
  { title: 'Comply360 Configuration', desc: 'Enable GST automation, Auto RCM, Auto TDS — mirrors Tally Alt+F8', icon: Shield, href: '/erp/accounting/comply360-config' },
];

const PAYROLL_COMING_SOON = [
  { title: 'Capital Assets', desc: 'Asset register, depreciation, disposal and transfer', icon: Building2 },
];

const ACCOUNT_STRUCTURE_CARDS = [
  { title: 'FinFrame — Account Groups', desc: '4-level account hierarchy — configure L4 user-defined groups', icon: FolderTree, href: '/erp/accounting/finframe' },
  { title: 'Ledger Master', desc: 'Cash, bank and all financial accounts per entity', icon: Landmark, href: '/erp/accounting/ledger-master' },
  { title: 'Currency Master', desc: 'Foreign currencies, rate of exchange — date-wise selling/buying/standard', icon: Coins, href: '/erp/accounting/currency-master' },
  { title: 'Voucher Types', desc: 'Behaviour matrix — 24 Tally-aligned types with embedded rules', icon: FileSpreadsheet, href: '/erp/accounting/voucher-types' },
];

const COMING_SOON_CARDS = [
  { title: 'Chart of Accounts', desc: 'Multi-level account tree with grouping', icon: BarChart3 },
  { title: 'Cost Centres', desc: 'Departmental and project cost tracking', icon: Briefcase },
  { title: 'Budget Master', desc: 'Annual budget allocation and tracking', icon: PiggyBank },
];

export function FineCoreHubPanel() {
  const navigate = useNavigate();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Accounting Masters</h1>
        <p className="text-sm text-muted-foreground">Zone 3 — Chart of Accounts, Compliance Masters, Capital Assets</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tax Rates', count: 0 },
          { label: 'TDS Sections', count: 0 },
          { label: 'TCS Sections', count: 0 },
          { label: 'HSN/SAC Codes', count: 0 },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
          </div>
        ))}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Compliance Masters</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COMPLIANCE_CARDS.map(c => (
            <button key={c.title} onClick={() => navigate(c.href)} className="group flex flex-col gap-3 p-5 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all text-left">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><c.icon className="h-5 w-5 text-primary" /></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div><h3 className="text-sm font-semibold text-foreground">{c.title}</h3><p className="text-xs text-muted-foreground mt-1">{c.desc}</p></div>
            </button>
          ))}
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Account Structure</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACCOUNT_STRUCTURE_CARDS.map(c => (
            <button key={c.title} onClick={() => navigate(c.href)} className="group flex flex-col gap-3 p-5 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all text-left">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><c.icon className="h-5 w-5 text-primary" /></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div><h3 className="text-sm font-semibold text-foreground">{c.title}</h3><p className="text-xs text-muted-foreground mt-1">{c.desc}</p></div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AccountingHub() {
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting Masters' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/dashboard')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Accounting Masters</h1>
              <p className="text-sm text-muted-foreground">Zone 3 — Chart of Accounts, Compliance Masters, Capital Assets</p>
            </div>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tax Rates', count: 0 },
              { label: 'TDS Sections', count: 0 },
              { label: 'TCS Sections', count: 0 },
              { label: 'HSN/SAC Codes', count: 0 },
            ].map(s => (
              <div key={s.label} className="rounded-lg border bg-card p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.count}</p>
              </div>
            ))}
          </div>

          {/* Compliance Masters */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Compliance Masters</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {COMPLIANCE_CARDS.map(c => (
                <button
                  key={c.title}
                  onClick={() => navigate(c.href)}
                  className="group flex flex-col gap-3 p-5 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <c.icon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payroll Statutory & Compliance */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Payroll Statutory & Compliance</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PAYROLL_CARDS.map(c => (
                <button
                  key={c.title}
                  onClick={() => navigate(c.href)}
                  className="group flex flex-col gap-3 p-5 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all text-left"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <c.icon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  </div>
                </button>
              ))}
              {PAYROLL_COMING_SOON.map(c => (
                <div
                  key={c.title}
                  className="flex flex-col gap-3 p-5 rounded-xl border bg-card opacity-50 cursor-default"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <c.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Coming Soon</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Account Structure — Active */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Account Structure</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {ACCOUNT_STRUCTURE_CARDS.map(c => (
                <button key={c.title} onClick={() => navigate(c.href)} className="group flex flex-col gap-3 p-5 rounded-xl border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all text-left">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><c.icon className="h-5 w-5 text-primary" /></div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div><h3 className="text-sm font-semibold text-foreground">{c.title}</h3><p className="text-xs text-muted-foreground mt-1">{c.desc}</p></div>
                </button>
              ))}
            </div>
          </div>

          {/* Coming Soon */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Coming Soon</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {COMING_SOON_CARDS.map(c => (
                <div
                  key={c.title}
                  className="flex flex-col gap-3 p-5 rounded-xl border bg-card opacity-50 cursor-default"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <c.icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">Coming Soon</Badge>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
