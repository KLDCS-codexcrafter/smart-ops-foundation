/**
 * ProfitLoss.tsx — P&L Statement (fc-rpt-pl)
 * Trading Account → Gross Profit → P&L → Net Profit
 * Uses L1/L2/L3 hierarchy from finframe-seed-data
 * [JWT] All data via hooks
 */
import { useState, useMemo, useContext } from 'react';
import { PieChart, Download, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useJournal } from '@/hooks/useJournal';
import { useDrillDown } from '@/hooks/useDrillDown';
import { GlobalDateRangeContext } from '@/hooks/GlobalDateRangeContext';
import { L2_PARENT_GROUPS } from '@/data/finframe-seed-data';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fyStart, today, groupByL2, exportCSV } from './reportUtils';
// RPT-1b · chart-wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';


interface ProfitLossPanelProps { entityCode: string; }

export function ProfitLossPanel({ entityCode }: ProfitLossPanelProps) {
  const { entries } = useJournal(entityCode);
  const [dateFrom, setDateFrom] = useState(fyStart());
  const [dateTo, setDateTo] = useState(today());

  const filtered = useMemo(() => entries.filter(e => e.date >= dateFrom && e.date <= dateTo && !e.is_cancelled), [entries, dateFrom, dateTo]);
  const byL2 = useMemo(() => groupByL2(filtered), [filtered]);

  const getL2Net = (l2Code: string, nature: 'Dr' | 'Cr') => {
    const g = byL2[l2Code];
    if (!g) return { total: 0, ledgers: [] as Array<{ name: string; net: number }> };
    const ledgers = Object.values(g.ledgers).map(l => ({
      name: l.name,
      net: nature === 'Cr' ? l.cr - l.dr : l.dr - l.cr,
    }));
    return { total: ledgers.reduce((s, l) => s + l.net, 0), ledgers };
  };

  const revenue = getL2Net('I-OR', 'Cr');
  const cogs = getL2Net('E-COG', 'Dr');
  const grossProfit = revenue.total - cogs.total;
  const otherIncome = getL2Net('I-OI', 'Cr');
  const opex = getL2Net('E-OE', 'Dr');
  const finance = getL2Net('E-FC', 'Dr');
  const depreciation = getL2Net('E-DEP', 'Dr');
  const netProfit = grossProfit + otherIncome.total - opex.total - finance.total - depreciation.total;

  const renderSection = (title: string, data: ReturnType<typeof getL2Net>, _isExpense = false) => {
    const l2 = L2_PARENT_GROUPS.find(g => g.code === title);
    const label = l2?.name ?? title;
    return (
      <>
        <TableRow className="bg-muted/20">
          <TableCell className="text-xs font-semibold" colSpan={2}>{label}</TableCell>
        </TableRow>
        {data.ledgers.filter(l => Math.abs(l.net) > 0.01).map(l => (
          <TableRow key={`${title}-${l.name}`}>
            <TableCell className="text-xs pl-8">{l.name}</TableCell>
            <TableCell className="text-xs text-right font-mono">{inr(l.net)}</TableCell>
          </TableRow>
        ))}
        <TableRow>
          <TableCell className="text-xs font-medium pl-4">Total {label}</TableCell>
          <TableCell className="text-xs text-right font-mono font-medium">{inr(data.total)}</TableCell>
        </TableRow>
      </>
    );
  };

  const handleExport = () => {
    const rows: string[][] = [
      ['Revenue from Operations', String(revenue.total)],
      ['Cost of Goods Sold', String(cogs.total)],
      ['Gross Profit', String(grossProfit)],
      ['Other Income', String(otherIncome.total)],
      ['Operating Expenses', String(opex.total)],
      ['Finance Costs', String(finance.total)],
      ['Depreciation', String(depreciation.total)],
      ['Net Profit', String(netProfit)],
    ];
    exportCSV('profit-loss.csv', ['Particulars', 'Amount'], rows);
  };

  // RPT-1b additive — chart wrap
  const drill = useDrillDown();
  const gdr = useContext(GlobalDateRangeContext);
  const periodLabel = gdr ? `${gdr.range.from} → ${gdr.range.to}` : `${dateFrom} → ${dateTo}`;
  const totalRevenue = revenue.total + otherIncome.total;
  const totalExpense = cogs.total + opex.total + finance.total + depreciation.total;
  const chartRows = useMemo(() => ([
    { period: 'Period', revenue: totalRevenue, expense: totalExpense, margin: netProfit },
  ]), [totalRevenue, totalExpense, netProfit]);
  const kpi = getKpi('fc-pnl-margin');
  const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
    chartType: 'combo', xKey: 'period',
    series: [
      { key: 'revenue', label: 'Revenue', renderAs: 'bar' },
      { key: 'expense', label: 'Expense', renderAs: 'bar' },
      { key: 'margin',  label: 'Margin',  renderAs: 'line' },
    ],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div data-keyboard-form className="p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Profit & Loss Statement</h2>
          <Badge variant="outline" className="text-[10px]" data-testid="pl-period-chip">{periodLabel}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="pl-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* RPT-1b · TableChartToggle wrap · defaults to Table */}
      <Card><CardContent className="p-3" data-testid="pl-toggle-host">
        <TableChartToggle
          rows={chartRows}
          chartRows={chartRows}
          columns={[
            { key: 'period', label: 'Period' },
            { key: 'revenue', label: 'Revenue', align: 'right', render: (r) => inr(Number(r.revenue) || 0) },
            { key: 'expense', label: 'Expense', align: 'right', render: (r) => inr(Number(r.expense) || 0) },
            { key: 'margin', label: 'Margin', align: 'right', render: (r) => inr(Number(r.margin) || 0) },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No data"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </CardContent></Card>


      <Card><CardContent className="p-3 flex gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Particulars</TableHead>
              <TableHead className="text-xs text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {renderSection('I-OR', revenue)}
            {renderSection('E-COG', cogs, true)}
            <TableRow className="bg-primary/5 border-t-2">
              <TableCell className="text-xs font-bold">Gross Profit</TableCell>
              <TableCell className={`text-xs text-right font-mono font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{inr(grossProfit)}</TableCell>
            </TableRow>
            {renderSection('I-OI', otherIncome)}
            {renderSection('E-OE', opex, true)}
            {renderSection('E-FC', finance, true)}
            {renderSection('E-DEP', depreciation, true)}
            <TableRow className="bg-primary/10 border-t-2">
              <TableCell className="text-sm font-bold">Net Profit</TableCell>
              <TableCell className={`text-sm text-right font-mono font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{netProfit >= 0 ? inr(netProfit) : `(${inr(netProfit)})`}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default function ProfitLoss() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/fincore' }, { label: 'Profit & Loss' }]} showDatePicker={false} />
        <main>
          {entityCode
            ? <ProfitLossPanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to view Profit & Loss" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
