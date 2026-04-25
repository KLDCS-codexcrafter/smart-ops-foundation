/**
 * EPFESILWFMaster.tsx — Read-only Payroll Statutory Reference
 * 4 tabs: EPF, ESI, LWF, Income Tax (summary)
 * Maintained by 4DSmartOps. No CRUD.
 */
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowRight, Info } from 'lucide-react';
import {
  EPF_RATES, ESI_RATES, LWF_RATES,
  IT_SLABS_OLD_REGIME, IT_SLABS_NEW_REGIME, STANDARD_DEDUCTION, IT_EFFECTIVE_FY,
} from '@/data/payroll-statutory-seed-data';

const COMPONENT_COLORS: Record<string, string> = {
  epf: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  eps: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  edli: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  admin_epf: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  admin_edli: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
};

const FREQ_COLORS: Record<string, string> = {
  monthly: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  half_yearly: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  annual: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
};

const fmt = (n: number) => n.toLocaleString('en-IN');

export function EPFESILWFMasterPanel() {
  const epfEmpTotal = EPF_RATES.filter(r => r.contributionType === 'employee').reduce((s, r) => s + r.ratePercentage, 0);
  const epfErTotal = EPF_RATES.filter(r => r.contributionType === 'employer').reduce((s, r) => s + r.ratePercentage, 0);
  const esiEmpRate = ESI_RATES.find(r => r.contributionType === 'employee')?.ratePercentage ?? 0;
  const esiErRate = ESI_RATES.find(r => r.contributionType === 'employer')?.ratePercentage ?? 0;
  const lwfStates = new Set(LWF_RATES.map(r => r.stateCode)).size;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Payroll Statutory Reference</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          EPF, ESI and LWF contribution rates — maintained by 4DSmartOps per EPFO/ESIC notifications
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Apr 2024 · EPFO, ESIC and State Labour Dept notifications
        </p>
      </div>

      <Tabs defaultValue="epf" className="space-y-4">
        <TabsList>
          <TabsTrigger value="epf">EPF</TabsTrigger>
          <TabsTrigger value="esi">ESI</TabsTrigger>
          <TabsTrigger value="lwf">LWF</TabsTrigger>
          <TabsTrigger value="income-tax">Income Tax</TabsTrigger>
        </TabsList>

        {/* EPF Tab */}
        <TabsContent value="epf" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4"><p className="text-sm text-muted-foreground">Employee Total</p><p className="text-2xl font-bold">{epfEmpTotal}%</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Employer Total</p><p className="text-2xl font-bold">{epfErTotal.toFixed(2)}%</p></Card>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Contribution Type</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Wage Ceiling (₹)</TableHead>
                  <TableHead className="text-right">Max Amount (₹)</TableHead>
                  <TableHead className="text-right">Min Amount (₹)</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EPF_RATES.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge className={`text-[10px] ${COMPONENT_COLORS[r.component] ?? ''}`}>{r.component.toUpperCase().replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-xs capitalize">{r.contributionType}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{r.ratePercentage}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.wageCeiling ? `₹${fmt(r.wageCeiling)}` : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.maxAmount ? `₹${fmt(r.maxAmount)}` : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.minAmount ? `₹${fmt(r.minAmount)}` : '—'}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">EPF Calculation Note</p>
                <p>Employee contribution: 12% of Basic+DA. Employer split: 3.67% to PF account + 8.33% to Pension (capped at ₹1,250/month) + 0.50% EDLI. Admin charges: 0.50% EPF (min ₹500) + 0.01% EDLI (min ₹200).</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ESI Tab */}
        <TabsContent value="esi" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4"><p className="text-sm text-muted-foreground">Employee Rate</p><p className="text-2xl font-bold">{esiEmpRate}%</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Employer Rate</p><p className="text-2xl font-bold">{esiErRate}%</p></Card>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contribution Type</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Wage Ceiling (₹)</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ESI_RATES.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs capitalize">{r.contributionType}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{r.ratePercentage}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">₹{fmt(r.wageCeiling)}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell className="text-xs">{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-xs text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">ESI Applicability Note</p>
                <p>ESI applies only when gross monthly wages are ₹21,000 or below. Both employee and employer stop contributing when employee wages exceed this ceiling.</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* LWF Tab */}
        <TabsContent value="lwf" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4"><p className="text-sm text-muted-foreground">States Configured</p><p className="text-2xl font-bold">{lwfStates}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Monthly Frequency</p><p className="text-2xl font-bold">{LWF_RATES.filter(r => r.frequency === 'monthly').length}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Half-Yearly</p><p className="text-2xl font-bold">{LWF_RATES.filter(r => r.frequency === 'half_yearly').length}</p></Card>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Code</TableHead>
                  <TableHead>State Name</TableHead>
                  <TableHead className="text-right">Employee (₹)</TableHead>
                  <TableHead className="text-right">Employer (₹)</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Due Month</TableHead>
                  <TableHead>Effective From</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {LWF_RATES.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs font-mono">{r.stateCode}</TableCell>
                    <TableCell className="text-xs">{r.stateName}</TableCell>
                    <TableCell className="text-right font-mono text-xs">₹{r.employeeContribution}</TableCell>
                    <TableCell className="text-right font-mono text-xs">₹{r.employerContribution}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] ${FREQ_COLORS[r.frequency] ?? ''}`}>
                        {r.frequency.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{r.dueMonth ?? '—'}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Income Tax Tab */}
        <TabsContent value="income-tax" className="space-y-4">
          <Card className="p-4 border-indigo-200 bg-indigo-50/50 dark:bg-indigo-950/20 dark:border-indigo-800">
            <p className="text-sm font-semibold text-foreground mb-1">FY {IT_EFFECTIVE_FY} · New Tax Regime is default from this FY</p>
            <p className="text-xs text-muted-foreground">Quick summary — see full Income Tax Reference for deductions, surcharge, and gratuity.</p>
          </Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold mb-2">Old Regime</h3>
              <p className="text-xs text-muted-foreground mb-3">Standard Deduction: ₹{fmt(STANDARD_DEDUCTION.oldRegime)}</p>
              <div className="space-y-1">
                {IT_SLABS_OLD_REGIME.map(s => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span>{s.label}</span>
                    <span className="font-mono font-semibold">{s.ratePercent}%</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-4 border-indigo-500/30">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-semibold">New Regime</h3>
                <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[9px]">DEFAULT</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Standard Deduction: ₹{fmt(STANDARD_DEDUCTION.newRegime)}</p>
              <div className="space-y-1">
                {IT_SLABS_NEW_REGIME.map(s => (
                  <div key={s.label} className="flex justify-between text-xs">
                    <span>{s.label}</span>
                    <span className="font-mono font-semibold">{s.ratePercent}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              window.location.hash = 'finecore-income-tax';
              window.dispatchEvent(new HashChangeEvent('hashchange'));
            }}
          >
            View Full IT Slabs <ArrowRight className="h-4 w-4" />
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EPFESILWFMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Payroll Statutory Reference' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <EPFESILWFMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
