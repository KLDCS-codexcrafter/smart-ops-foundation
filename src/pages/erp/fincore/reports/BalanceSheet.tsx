/**
 * BalanceSheet.tsx — Balance Sheet (fc-rpt-bs)
 * Assets = Liabilities + Capital + Net Profit
 * [JWT] All data via hooks
 */
import { useState, useMemo, useContext } from 'react';
import { BarChart3, Download, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { SelectCompanyGate } from '@/components/layout/SelectCompanyGate';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useJournal } from '@/hooks/useJournal';
import { useDrillDown } from '@/hooks/useDrillDown';
import { GlobalDateRangeContext } from '@/hooks/GlobalDateRangeContext';
import { L2_PARENT_GROUPS } from '@/data/finframe-seed-data';
import { onEnterNext } from '@/lib/keyboard';
import { inr, today, groupByL2, getL1Code, exportCSV } from './reportUtils';
// RPT-1b · chart-wrap
import { TableChartToggle } from '@/components/operix-core/report-framework';
import { signReport, getKpi, defaultChartConfig } from '@/lib/report-framework';


interface BalanceSheetPanelProps { entityCode: string; }

export function BalanceSheetPanel({ entityCode }: BalanceSheetPanelProps) {
  const { entries } = useJournal(entityCode);
  const [asOfDate, setAsOfDate] = useState(today());

  const filtered = useMemo(() => entries.filter(e => e.date <= asOfDate && !e.is_cancelled), [entries, asOfDate]);
  const byL2 = useMemo(() => groupByL2(filtered), [filtered]);

  const getL2Net = (l2Code: string, nature: 'Dr' | 'Cr') => {
    const g = byL2[l2Code];
    if (!g) return { total: 0, ledgers: [] as Array<{ name: string; net: number }> };
    const ledgers = Object.values(g.ledgers).map(l => ({
      name: l.name,
      net: nature === 'Dr' ? l.dr - l.cr : l.cr - l.dr,
    }));
    return { total: ledgers.reduce((s, l) => s + l.net, 0), ledgers };
  };

  // Assets
  const nca = getL2Net('A-NCA', 'Dr');
  const ca = getL2Net('A-CA', 'Dr');
  const totalAssets = nca.total + ca.total;

  // Liabilities
  const ncl = getL2Net('L-NCL', 'Cr');
  const cl = getL2Net('L-CL', 'Cr');
  const totalLiabilities = ncl.total + cl.total;

  // Capital & Equity
  const sf = getL2Net('CE-SF', 'Cr');
  const pp = getL2Net('CE-PP', 'Cr');

  // Net Profit (Income - Expense for all time up to asOfDate)
  const incomeEntries = filtered.filter(e => { const l1 = getL1Code(e.ledger_group_code); return l1 === 'I'; });
  const expenseEntries = filtered.filter(e => { const l1 = getL1Code(e.ledger_group_code); return l1 === 'E'; });
  const totalIncome = incomeEntries.reduce((s, e) => s + e.cr_amount - e.dr_amount, 0);
  const totalExpense = expenseEntries.reduce((s, e) => s + e.dr_amount - e.cr_amount, 0);
  const netProfit = totalIncome - totalExpense;

  const totalCapital = sf.total + pp.total + netProfit;
  const totalLiabCap = totalLiabilities + totalCapital;
  const balanced = Math.abs(totalAssets - totalLiabCap) < 0.01;

  const renderSide = (title: string, data: ReturnType<typeof getL2Net>) => {
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
    exportCSV('balance-sheet.csv', ['Particulars', 'Amount'], [
      ['Non-Current Assets', String(nca.total)], ['Current Assets', String(ca.total)],
      ['Total Assets', String(totalAssets)], ['Non-Current Liabilities', String(ncl.total)],
      ['Current Liabilities', String(cl.total)], ['Capital', String(totalCapital)],
      ['Net Profit', String(netProfit)], ['Total Liabilities + Capital', String(totalLiabCap)],
    ]);
  };

  // RPT-1b additive — chart wrap (existing UI preserved)
  const drill = useDrillDown();
  const gdr = useContext(GlobalDateRangeContext);
  const periodLabel = gdr ? `${gdr.range.from} → ${gdr.range.to}` : `As-on ${asOfDate}`;
  const chartRows = useMemo(() => ([
    { group: 'Non-Current', assets: nca.total, liabilities: ncl.total },
    { group: 'Current', assets: ca.total, liabilities: cl.total },
    { group: 'Capital/Equity', assets: 0, liabilities: totalCapital },
  ]), [nca.total, ncl.total, ca.total, cl.total, totalCapital]);
  const kpi = getKpi('fc-bs-composition');
  const chartConfig = kpi?.defaultChart ?? defaultChartConfig({
    chartType: 'stacked-column', xKey: 'group',
    series: [
      { key: 'assets', label: 'Assets' },
      { key: 'liabilities', label: 'Liabilities + Capital' },
    ],
  });
  const integrityHash = useMemo(() => signReport(chartRows), [chartRows]);
  const shortHash = integrityHash.replace('fnv1a:', '').slice(0, 10);

  return (
    <div data-keyboard-form className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Balance Sheet</h2>
          <Badge variant="outline" className="text-[10px]" data-testid="bs-period-chip">{periodLabel}</Badge>
          <Badge variant="outline" className="text-[10px] font-mono" data-testid="bs-integrity-badge" title={integrityHash}>
            <ShieldCheck className="h-3 w-3 mr-1" />{shortHash}
          </Badge>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      {/* RPT-1b · TableChartToggle wrap · defaults to Table */}
      <Card><CardContent className="p-3" data-testid="bs-toggle-host">
        <TableChartToggle
          rows={chartRows}
          chartRows={chartRows}
          columns={[
            { key: 'group', label: 'Group' },
            { key: 'assets', label: 'Assets', align: 'right', render: (r) => inr(Number(r.assets) || 0) },
            { key: 'liabilities', label: 'Liab + Capital', align: 'right', render: (r) => inr(Number(r.liabilities) || 0) },
          ]}
          chartConfig={chartConfig}
          defaultView="table"
          emptyLabel="No balances"
        />
        {drill.trail.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1">drill depth: {drill.trail.length}</p>
        )}
      </CardContent></Card>

      <Card><CardContent className="p-3 flex gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">As On</label>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="h-8 text-xs w-40" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>




      {balanced ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-xs">Balanced: Assets ({inr(totalAssets)}) = Liabilities + Capital ({inr(totalLiabCap)})</AlertDescription>
        </Alert>
      ) : (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-xs">Unbalanced by {inr(Math.abs(totalAssets - totalLiabCap))} — Net Profit not yet transferred.</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {/* Assets side */}
        <Card><CardContent className="p-0">
          <div className="p-3 bg-muted/30 border-b"><p className="text-xs font-bold">ASSETS</p></div>
          <Table>
            <TableBody>
              {renderSide('A-NCA', nca)}
              {renderSide('A-CA', ca)}
              <TableRow className="bg-primary/5 border-t-2">
                <TableCell className="text-xs font-bold">Total Assets</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">{inr(totalAssets)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent></Card>

        {/* Liabilities + Capital side */}
        <Card><CardContent className="p-0">
          <div className="p-3 bg-muted/30 border-b"><p className="text-xs font-bold">LIABILITIES & CAPITAL</p></div>
          <Table>
            <TableBody>
              {renderSide('L-NCL', ncl)}
              {renderSide('L-CL', cl)}
              {renderSide('CE-SF', sf)}
              {renderSide('CE-PP', pp)}
              <TableRow>
                <TableCell className="text-xs pl-8 italic">Net Profit for the Period</TableCell>
                <TableCell className={`text-xs text-right font-mono ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{inr(netProfit)}</TableCell>
              </TableRow>
              <TableRow className="bg-primary/5 border-t-2">
                <TableCell className="text-xs font-bold">Total Liabilities + Capital</TableCell>
                <TableCell className="text-xs text-right font-mono font-bold">{inr(totalLiabCap)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </div>
  );
}

export default function BalanceSheet() {
  const { entityCode } = useEntityCode();
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/fincore' }, { label: 'Balance Sheet' }]} showDatePicker={false} />
        <main>
          {entityCode
            ? <BalanceSheetPanel entityCode={entityCode} />
            : <SelectCompanyGate title="Select a company to view Balance Sheet" />
          }
        </main>
      </div>
    </SidebarProvider>
  );
}
