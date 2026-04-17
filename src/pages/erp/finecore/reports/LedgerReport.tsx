/**
 * LedgerReport.tsx — Ledger Report panel (fc-rpt-ledger)
 * All debit/credit movements for a selected ledger with running balance.
 * [JWT] All data via hooks
 */
import { useState, useMemo } from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useJournal } from '@/hooks/useJournal';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fmtDate, fyStart, today, exportCSV } from './reportUtils';

interface LedgerReportPanelProps { entityCode: string; }

function loadLedgerDefs(entityCode: string): Array<{ id: string; name: string; groupCode: string }> {
  try {
    // [JWT] GET /api/accounting/ledger-definitions
    const raw = localStorage.getItem(`erp_group_ledger_definitions_${entityCode}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function LedgerReportPanel({ entityCode }: LedgerReportPanelProps) {
  const { getLedgerBalance, getLedgerHistory } = useJournal(entityCode);
  const ledgers = useMemo(() => loadLedgerDefs(entityCode), [entityCode]);
  const [selectedLedger, setSelectedLedger] = useState('');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [dateFrom, setDateFrom] = useState(fyStart());
  const [dateTo, setDateTo] = useState(today());
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredLedgers = useMemo(() => {
    if (!ledgerSearch) return ledgers.slice(0, 20);
    const s = ledgerSearch.toLowerCase();
    return ledgers.filter(l => l.name.toLowerCase().includes(s)).slice(0, 20);
  }, [ledgers, ledgerSearch]);

  const selectedLedgerObj = ledgers.find(l => l.id === selectedLedger);

  const prevDay = (d: string) => {
    const dt = new Date(d);
    dt.setDate(dt.getDate() - 1);
    return dt.toISOString().slice(0, 10);
  };

  const opening = useMemo(() => {
    if (!selectedLedger) return { dr: 0, cr: 0, balance: 0 };
    return getLedgerBalance(selectedLedger, prevDay(dateFrom));
  }, [selectedLedger, dateFrom, getLedgerBalance]);

  const periodEntries = useMemo(() => {
    if (!selectedLedger) return [];
    return getLedgerHistory(selectedLedger, dateFrom, dateTo);
  }, [selectedLedger, dateFrom, dateTo, getLedgerHistory]);

  const rows = useMemo(() => {
    let running = opening.balance;
    return periodEntries.map(e => {
      running += e.dr_amount - e.cr_amount;
      return { ...e, runningBalance: running };
    });
  }, [periodEntries, opening]);

  const closing = rows.length > 0 ? rows[rows.length - 1].runningBalance : opening.balance;
  const totalDr = periodEntries.reduce((s, e) => s + e.dr_amount, 0);
  const totalCr = periodEntries.reduce((s, e) => s + e.cr_amount, 0);

  const handleExport = () => {
    exportCSV('ledger-report.csv',
      ['Date', 'Voucher No', 'Type', 'Narration', 'Dr', 'Cr', 'Balance'],
      rows.map(r => [r.date, r.voucher_no, r.base_voucher_type, r.narration, String(r.dr_amount), String(r.cr_amount), String(r.runningBalance)])
    );
  };

  const balLabel = (b: number) => b >= 0 ? `${inr(b)} Dr` : `${inr(Math.abs(b))} Cr`;

  return (
    <div data-keyboard-form className="p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Ledger Report</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5 mr-1" /> Print
          </Button>
          <Button data-primary variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Ledger selector + date range */}
      <Card><CardContent className="p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1 relative flex-1 min-w-[200px]">
          <label className="text-[10px] text-muted-foreground">Ledger</label>
          <Input
            placeholder="Select ledger..."
            value={selectedLedgerObj ? selectedLedgerObj.name : ledgerSearch}
            onChange={e => { setLedgerSearch(e.target.value); setSelectedLedger(''); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="h-8 text-xs"
            onKeyDown={onEnterNext}
          />
          {showDropdown && filteredLedgers.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
              {filteredLedgers.map(l => (
                <button key={l.id} className="w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50" onMouseDown={() => { setSelectedLedger(l.id); setLedgerSearch(l.name); setShowDropdown(false); }}>
                  {l.name} <span className="text-muted-foreground ml-1">({l.groupCode})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">From</label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">To</label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      {!selectedLedger ? (
        <Card><CardContent className="p-10 text-center">
          <p className="text-sm text-muted-foreground">Select a ledger to view its movement history</p>
        </CardContent></Card>
      ) : (
        <>
          {/* Header stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Opening Balance', value: balLabel(opening.balance) },
              { label: 'Total Debit', value: inr(totalDr) },
              { label: 'Total Credit', value: inr(totalCr) },
              { label: 'Closing Balance', value: balLabel(closing) },
            ].map(c => (
              <Card key={c.label}><CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
                <p className="text-sm font-bold">{c.value}</p>
              </CardContent></Card>
            ))}
          </div>

          {/* Transaction table */}
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Voucher No</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Narration</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-muted/30">
                  <TableCell colSpan={4} className="text-xs font-medium">Opening Balance</TableCell>
                  <TableCell className="text-xs text-right font-mono">{opening.balance >= 0 ? inr(opening.balance) : ''}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{opening.balance < 0 ? inr(Math.abs(opening.balance)) : ''}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{balLabel(opening.balance)}</TableCell>
                </TableRow>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{fmtDate(r.date)}</TableCell>
                    <TableCell className="text-xs font-mono">{r.voucher_no}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.base_voucher_type}</Badge></TableCell>
                    <TableCell className="text-xs">{r.narration || '—'}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.dr_amount > 0 ? inr(r.dr_amount) : ''}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{r.cr_amount > 0 ? inr(r.cr_amount) : ''}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{balLabel(r.runningBalance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-bold">
                  <TableCell colSpan={4} className="text-xs font-bold">Closing Balance</TableCell>
                  <TableCell className="text-xs text-right font-mono">{closing >= 0 ? inr(closing) : ''}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{closing < 0 ? inr(Math.abs(closing)) : ''}</TableCell>
                  <TableCell className="text-xs text-right font-mono font-bold">{balLabel(closing)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}

export default function LedgerReport() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Ledger Report' }]} showDatePicker={false} showCompany={false} />
        <main><LedgerReportPanel entityCode="SMRT" /></main>
      </div>
    </SidebarProvider>
  );
}
