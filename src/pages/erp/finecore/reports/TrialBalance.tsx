/**
 * TrialBalance.tsx — Trial Balance report (fc-rpt-trial-balance)
 * All ledgers with net Dr/Cr. Total Dr must = Total Cr.
 * [JWT] All data via hooks
 */
import { useState, useMemo } from 'react';
import { Scale, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useJournal } from '@/hooks/useJournal';
import { L3_FINANCIAL_GROUPS } from '@/data/finframe-seed-data';
import { onEnterNext } from '@/lib/keyboard';
import { inr, today, exportCSV } from './reportUtils';

interface TrialBalancePanelProps { entityCode: string; }

export function TrialBalancePanel({ entityCode }: TrialBalancePanelProps) {
  const { getTrialBalanceAsOf } = useJournal(entityCode);
  const [asOfDate, setAsOfDate] = useState(today());
  const [hideZero, setHideZero] = useState(true);
  const [condensed, setCondensed] = useState(true);

  const tb = useMemo(() => getTrialBalanceAsOf(asOfDate), [asOfDate, getTrialBalanceAsOf]);

  const rows = useMemo(() => {
    return tb.map(r => {
      const net = r.dr - r.cr;
      const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === r.ledgerGroupCode);
      return {
        ...r,
        groupName: l3?.name ?? r.ledgerGroupCode,
        drBal: net > 0 ? net : 0,
        crBal: net < 0 ? Math.abs(net) : 0,
      };
    }).filter(r => !hideZero || r.drBal > 0.01 || r.crBal > 0.01)
      .sort((a, b) => a.ledgerName.localeCompare(b.ledgerName));
  }, [tb, hideZero]);

  const totalDr = rows.reduce((s, r) => s + r.drBal, 0);
  const totalCr = rows.reduce((s, r) => s + r.crBal, 0);
  const balanced = Math.abs(totalDr - totalCr) < 0.01;

  // Condensed view: group by L3
  const condensedRows = useMemo(() => {
    if (!condensed) return null;
    const groups = new Map<string, { groupName: string; dr: number; cr: number }>();
    for (const r of rows) {
      const ex = groups.get(r.ledgerGroupCode) || { groupName: r.groupName, dr: 0, cr: 0 };
      ex.dr += r.drBal; ex.cr += r.crBal;
      groups.set(r.ledgerGroupCode, ex);
    }
    return Array.from(groups.entries()).sort((a, b) => a[1].groupName.localeCompare(b[1].groupName));
  }, [condensed, rows]);

  const handleExport = () => {
    exportCSV('trial-balance.csv',
      ['Ledger', 'Group', 'Dr Balance', 'Cr Balance'],
      rows.map(r => [r.ledgerName, r.groupName, String(r.drBal), String(r.crBal)])
    );
  };

  return (
    <div data-keyboard-form className="p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Trial Balance</h2>
        </div>
        <Button data-primary variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
        </Button>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">As On</label>
          <Input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="h-8 text-xs w-40" onKeyDown={onEnterNext} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={condensed} onCheckedChange={setCondensed} id="condensed" />
          <label htmlFor="condensed" className="text-xs">Condensed (by group)</label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={hideZero} onCheckedChange={setHideZero} id="hideZero" />
          <label htmlFor="hideZero" className="text-xs">Hide zero balances</label>
        </div>
      </CardContent></Card>

      {balanced ? (
        <Alert className="border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle className="h-4 w-4 text-emerald-500" />
          <AlertDescription className="text-xs">Trial Balance is balanced. Total Dr = Total Cr = {inr(totalDr)}</AlertDescription>
        </Alert>
      ) : (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">Imbalance detected: {inr(Math.abs(totalDr - totalCr))}. Check voucher engine.</AlertDescription>
        </Alert>
      )}

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">{condensed ? 'Group' : 'Ledger Name'}</TableHead>
              {!condensed && <TableHead className="text-xs">Group</TableHead>}
              <TableHead className="text-xs text-right">Dr Balance</TableHead>
              <TableHead className="text-xs text-right">Cr Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {condensed && condensedRows ? condensedRows.map(([code, g]) => (
              <TableRow key={code}>
                <TableCell className="text-xs font-medium">{g.groupName}</TableCell>
                <TableCell className="text-xs text-right font-mono">{g.dr > 0.01 ? inr(g.dr) : ''}</TableCell>
                <TableCell className="text-xs text-right font-mono">{g.cr > 0.01 ? inr(g.cr) : ''}</TableCell>
              </TableRow>
            )) : rows.map(r => (
              <TableRow key={r.ledgerId}>
                <TableCell className="text-xs">{r.ledgerName}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.groupName}</TableCell>
                <TableCell className="text-xs text-right font-mono">{r.drBal > 0.01 ? inr(r.drBal) : ''}</TableCell>
                <TableCell className="text-xs text-right font-mono">{r.crBal > 0.01 ? inr(r.crBal) : ''}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/30 font-bold">
              <TableCell className="text-xs font-bold" colSpan={condensed ? 1 : 2}>Total</TableCell>
              <TableCell className="text-xs text-right font-mono font-bold">{inr(totalDr)}</TableCell>
              <TableCell className="text-xs text-right font-mono font-bold">{inr(totalCr)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
}

export default function TrialBalance() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Trial Balance' }]} showDatePicker={false} showCompany={false} />
        <main><TrialBalancePanel entityCode="SMRT" /></main>
      </div>
    </SidebarProvider>
  );
}
