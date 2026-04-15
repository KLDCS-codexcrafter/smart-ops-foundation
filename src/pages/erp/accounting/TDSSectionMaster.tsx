/**
 * TDSSectionMaster.tsx — Read-only TDS/TCS Section Reference
 * Maintained by 4DSmartOps. No CRUD.
 */
import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Search, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TDS_SECTIONS, type TDSSection } from '@/data/compliance-seed-data';
import { TCS_SECTIONS, type TCSSection } from '@/data/compliance-seed-data';
import { onEnterNext } from '@/lib/keyboard';

function formatAmount(val: number | null): string {
  if (val === null) return '—';
  if (val >= 10000000) return `₹${val / 10000000}Cr`;
  if (val >= 100000) return `₹${val / 100000}L`;
  if (val >= 1000) return `₹${val / 1000}K`;
  return `₹${val}`;
}

export function TDSSectionMasterPanel() {
  const [tdsSearch, setTdsSearch] = useState('');
  const [tcsSearch, setTcsSearch] = useState('');

  const tdsFiltered = useMemo(() =>
    TDS_SECTIONS.filter(r =>
      `${r.sectionCode} ${r.natureOfPayment} ${r.sectionName}`.toLowerCase().includes(tdsSearch.toLowerCase())
    ), [tdsSearch]);

  const tcsFiltered = useMemo(() =>
    TCS_SECTIONS.filter(r =>
      `${r.sectionCode} ${r.natureOfGoods} ${r.sectionName}`.toLowerCase().includes(tcsSearch.toLowerCase())
    ), [tcsSearch]);

  const tdsStats = useMemo(() => ({
    total: TDS_SECTIONS.length,
    above1: TDS_SECTIONS.filter(r => r.rateIndividual > 1).length,
    senior: TDS_SECTIONS.filter(r => r.sectionCode === '194A' || r.sectionCode === '192').length,
    s206ab: TDS_SECTIONS.filter(r => r.section206ABApplicable).length,
  }), []);

  return (
    <div data-keyboard-form className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">TDS / TCS Section Reference</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          All Tax Deducted at Source and Tax Collected at Source sections under the Income Tax Act 1961
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Apr 2024 · Income Tax Act + Finance Act 2024 — CBDT Circular
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total TDS Sections', count: tdsStats.total },
          { label: 'Sections > 1%', count: tdsStats.above1 },
          { label: 'TCS Sections', count: TCS_SECTIONS.length },
          { label: 'Special (206AB)', count: tdsStats.s206ab },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="tds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tds">TDS Sections ({TDS_SECTIONS.length})</TabsTrigger>
          <TabsTrigger value="tcs">TCS Sections ({TCS_SECTIONS.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tds" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search TDS sections..." value={tdsSearch} onChange={e => setTdsSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Nature of Payment</TableHead>
                  <TableHead>Individual %</TableHead>
                  <TableHead>Company %</TableHead>
                  <TableHead>No PAN %</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tdsFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No results.</TableCell>
                  </TableRow>
                ) : tdsFiltered.map(r => {
                  const is192 = r.sectionCode === '192';
                  const is194Q = r.sectionCode === '194Q';
                  return (
                    <TableRow key={r.sectionCode} className={cn(is194Q && 'bg-amber-500/5')}>
                      <TableCell className={cn('font-mono font-medium', is192 && 'text-blue-600')}>{r.sectionCode}</TableCell>
                      <TableCell className="max-w-[250px]">{r.natureOfPayment}</TableCell>
                      <TableCell>{is192 ? <span className="text-blue-600 text-xs">As per slab</span> : `${r.rateIndividual}%`}</TableCell>
                      <TableCell>{is192 ? <span className="text-blue-600 text-xs">As per slab</span> : `${r.rateCompany}%`}</TableCell>
                      <TableCell>{r.rateNoPAN}%</TableCell>
                      <TableCell>
                        {is194Q ? (
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                                ₹50L/FY <Info className="h-3 w-3" />
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              TDS deductible only after cumulative purchases exceed ₹50 lakhs in FY. Buyer turnover {'>'} ₹10 Cr.
                            </TooltipContent>
                          </Tooltip>
                        ) : formatAmount(r.thresholdAggregateAnnual)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{r.notes}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="tcs" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search TCS sections..." value={tcsSearch} onChange={e => setTcsSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead>Nature of Goods/Services</TableHead>
                  <TableHead>Rate %</TableHead>
                  <TableHead>Threshold</TableHead>
                  <TableHead>Buyer Type</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tcsFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No results.</TableCell>
                  </TableRow>
                ) : tcsFiltered.map(r => (
                  <TableRow key={r.sectionCode}>
                    <TableCell className="font-mono font-medium">{r.sectionCode}</TableCell>
                    <TableCell className="max-w-[250px]">{r.natureOfGoods}</TableCell>
                    <TableCell>{r.ratePercentage}%</TableCell>
                    <TableCell>{formatAmount(r.thresholdLimit)}</TableCell>
                    <TableCell className="capitalize">{r.buyerType === 'all' ? 'All' : 'Specified'}</TableCell>
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

export default function TDSSectionMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'TDS / TCS Sections' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <TDSSectionMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
