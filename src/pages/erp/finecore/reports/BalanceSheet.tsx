/**
 * BalanceSheet.tsx — Balance Sheet (fc-rpt-bs)
 * Assets = Liabilities + Capital + Net Profit
 * [JWT] All data via hooks
 */
import { useState, useMemo } from 'react';
import { BarChart3, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useJournal } from '@/hooks/useJournal';
import { L2_PARENT_GROUPS } from '@/data/finframe-seed-data';
import { onEnterNext } from '@/lib/keyboard';
import { inr, today, groupByL2, getL1Code, exportCSV } from './reportUtils';

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

  return (
    <div data-keyboard-form className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Balance Sheet</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

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
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Balance Sheet' }]} showDatePicker={false} showCompany={false} />
        <main><BalanceSheetPanel entityCode="SMRT" /></main>
      </div>
    </SidebarProvider>
  );
}
