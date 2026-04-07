/**
 * EPFESILWFMaster.tsx — Zone 3 Session 2
 * Three-tab master for EPF, ESI, and LWF statutory rates.
 * [JWT] Replace with GET/POST/PATCH /api/payroll-statutory/epf, /esi, /lwf
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trash2, Download, Info } from 'lucide-react';
import { toast } from 'sonner';
import {
  EPF_RATES, ESI_RATES, LWF_RATES,
  type EPFRate, type ESIRate, type LWFRate,
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
  const [epfRecords, setEpfRecords] = useState<EPFRate[]>([]);
  const [esiRecords, setEsiRecords] = useState<ESIRate[]>([]);
  const [lwfRecords, setLwfRecords] = useState<LWFRate[]>([]);

  const epfEmpTotal = epfRecords.filter(r => r.contributionType === 'employee').reduce((s, r) => s + r.ratePercentage, 0);
  const epfErTotal = epfRecords.filter(r => r.contributionType === 'employer').reduce((s, r) => s + r.ratePercentage, 0);
  const esiEmpRate = esiRecords.find(r => r.contributionType === 'employee')?.ratePercentage ?? 0;
  const esiErRate = esiRecords.find(r => r.contributionType === 'employer')?.ratePercentage ?? 0;
  const lwfStates = new Set(lwfRecords.map(r => r.stateCode)).size;
  const lwfMonthly = lwfRecords.filter(r => r.frequency === 'monthly').length;
  const lwfHalfYearly = lwfRecords.filter(r => r.frequency === 'half_yearly').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payroll Statutory Rates</h1>
        <p className="text-sm text-muted-foreground">EPF, ESI and Labour Welfare Fund configuration</p>
      </div>

      <Tabs defaultValue="epf" className="space-y-4">
        <TabsList>
          <TabsTrigger value="epf">EPF</TabsTrigger>
          <TabsTrigger value="esi">ESI</TabsTrigger>
          <TabsTrigger value="lwf">LWF</TabsTrigger>
        </TabsList>

        {/* EPF Tab */}
        <TabsContent value="epf" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4"><p className="text-sm text-muted-foreground">Employee Total</p><p className="text-2xl font-bold">{epfEmpTotal}%</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Employer Total</p><p className="text-2xl font-bold">{epfErTotal.toFixed(2)}%</p></Card>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { setEpfRecords(EPF_RATES); toast.success(`Loaded ${EPF_RATES.length} EPF rates`); }}>
              <Download className="h-4 w-4 mr-1" /> Load Official Rates
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead>Contribution Type</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Wage Ceiling (Rs)</TableHead>
                  <TableHead className="text-right">Max Amount (Rs)</TableHead>
                  <TableHead className="text-right">Min Amount (Rs)</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epfRecords.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-12 text-muted-foreground">Click "Load Official Rates" to seed EPF data.</TableCell></TableRow>
                )}
                {epfRecords.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge className={`text-[10px] ${COMPONENT_COLORS[r.component] ?? ''}`}>{r.component.toUpperCase().replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-xs capitalize">{r.contributionType}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{r.ratePercentage}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.wageCeiling ? `₹${fmt(r.wageCeiling)}` : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.maxAmount ? `₹${fmt(r.maxAmount)}` : '—'}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{r.minAmount ? `₹${fmt(r.minAmount)}` : '—'}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell className="text-xs max-w-[200px] truncate">{r.notes}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setEpfRecords(prev => prev.filter((_, j) => j !== i)); toast.success('Deleted'); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
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
                <p>Employee contribution: 12% of Basic+DA. Employer split: 3.67% to PF account + 8.33% to Pension (capped at Rs 1,250/month) + 0.50% EDLI. Admin charges: 0.50% EPF (min Rs 500) + 0.01% EDLI (min Rs 200).</p>
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
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { setEsiRecords(ESI_RATES); toast.success(`Loaded ${ESI_RATES.length} ESI rates`); }}>
              <Download className="h-4 w-4 mr-1" /> Load Official Rates
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contribution Type</TableHead>
                  <TableHead className="text-right">Rate %</TableHead>
                  <TableHead className="text-right">Wage Ceiling (Rs)</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {esiRecords.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Click "Load Official Rates" to seed ESI data.</TableCell></TableRow>
                )}
                {esiRecords.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-xs capitalize">{r.contributionType}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{r.ratePercentage}%</TableCell>
                    <TableCell className="text-right font-mono text-xs">₹{fmt(r.wageCeiling)}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell className="text-xs">{r.notes}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setEsiRecords(prev => prev.filter((_, j) => j !== i)); toast.success('Deleted'); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
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
                <p>ESI applies only when gross monthly wages are Rs 21,000 or below. Both employee and employer stop contributing when employee wages exceed this ceiling.</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* LWF Tab */}
        <TabsContent value="lwf" className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4"><p className="text-sm text-muted-foreground">States Configured</p><p className="text-2xl font-bold">{lwfStates}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Monthly Frequency</p><p className="text-2xl font-bold">{lwfMonthly}</p></Card>
            <Card className="p-4"><p className="text-sm text-muted-foreground">Half-Yearly</p><p className="text-2xl font-bold">{lwfHalfYearly}</p></Card>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => { setLwfRecords(LWF_RATES); toast.success(`Loaded ${LWF_RATES.length} LWF states`); }}>
              <Download className="h-4 w-4 mr-1" /> Load 10 States
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State Code</TableHead>
                  <TableHead>State Name</TableHead>
                  <TableHead className="text-right">Employee (Rs)</TableHead>
                  <TableHead className="text-right">Employer (Rs)</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Due Month</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lwfRecords.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Click "Load 10 States" to seed LWF data.</TableCell></TableRow>
                )}
                {lwfRecords.map((r, i) => (
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
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setLwfRecords(prev => prev.filter((_, j) => j !== i)); toast.success('Deleted'); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function EPFESILWFMaster() {
  const navigate = useNavigate();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Payroll Statutory Rates' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <EPFESILWFMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}