/**
 * BankReconciliation.tsx — Bank Reconciliation (fc-bnk-reconciliation)
 * Match book entries against bank statement. Auto-match by amount+date.
 * Storage: erp_bank_recon_{entityCode}
 * [JWT] All data via hooks + new storage key
 */
import { useState, useMemo, useCallback } from 'react';
import { Landmark, Download, Zap, CheckCircle, Save } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { useJournal } from '@/hooks/useJournal';
import { L3_FINANCIAL_GROUPS } from '@/data/finframe-seed-data';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { inr, fmtDate, today } from './reportUtils';

interface BankReconciliationPanelProps { entityCode: string; }

interface StatementLine { id: string; date: string; description: string; debit: number; credit: number; }
interface MatchEntry { id: string; bookEntryId: string; statementLineId: string; matchDate: string; matchedBy: string; amount: number; }

function loadBankLedgers(entityCode: string): Array<{ id: string; name: string }> {
  try {
    // [JWT] GET /api/accounting/ledger-definitions?group=BANK
    const raw = localStorage.getItem(`erp_group_ledger_definitions_${entityCode}`);
    const all: Array<{ id: string; name: string; groupCode: string }> = raw ? JSON.parse(raw) : [];
    return all.filter(l => {
      const l3 = L3_FINANCIAL_GROUPS.find(g => g.code === l.groupCode);
      return l3?.isBank;
    });
  } catch { return []; }
}

function loadMatches(entityCode: string): MatchEntry[] {
  try {
    // [JWT] GET /api/accounting/bank-recon
    const raw = localStorage.getItem(`erp_bank_recon_${entityCode}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function BankReconciliationPanel({ entityCode }: BankReconciliationPanelProps) {
  const { entries: journalEntries } = useJournal(entityCode);
  const bankLedgers = useMemo(() => loadBankLedgers(entityCode), [entityCode]);
  const [selectedBank, setSelectedBank] = useState('');
  const [periodMonth, setPeriodMonth] = useState(today().slice(0, 7));
  const [statementText, setStatementText] = useState('');
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [matches, setMatches] = useState<MatchEntry[]>(() => loadMatches(entityCode));

  const monthStart = `${periodMonth}-01`;
  const monthEnd = (() => { const d = new Date(`${periodMonth}-01`); d.setMonth(d.getMonth() + 1); d.setDate(0); return d.toISOString().slice(0, 10); })();

  const bookEntries = useMemo(() => {
    if (!selectedBank) return [];
    return journalEntries.filter(e => e.ledger_id === selectedBank && !e.is_cancelled && e.date >= monthStart && e.date <= monthEnd);
  }, [journalEntries, selectedBank, monthStart, monthEnd]);

  const matchedBookIds = new Set(matches.map(m => m.bookEntryId));
  const matchedStmtIds = new Set(matches.map(m => m.statementLineId));

  const parseStatement = useCallback(() => {
    const lines = statementText.split('\n').filter(l => l.trim());
    const parsed: StatementLine[] = lines.map((line, i) => {
      const parts = line.split(',').map(p => p.trim());
      return {
        id: `stmt-${i}-${Date.now()}`,
        date: parts[0] ?? '',
        description: parts[1] ?? '',
        debit: parseFloat(parts[2] ?? '0') || 0,
        credit: parseFloat(parts[3] ?? '0') || 0,
      };
    });
    setStatementLines(parsed);
    toast.success(`Parsed ${parsed.length} statement lines`);
  }, [statementText]);

  const autoMatch = useCallback(() => {
    const newMatches: MatchEntry[] = [...matches];
    let matched = 0;
    for (const book of bookEntries) {
      if (matchedBookIds.has(book.id)) continue;
      const bookAmt = book.dr_amount || book.cr_amount;
      for (const stmt of statementLines) {
        if (matchedStmtIds.has(stmt.id)) continue;
        const stmtAmt = stmt.debit || stmt.credit;
        if (Math.abs(bookAmt - stmtAmt) < 0.01) {
          const bookDate = new Date(book.date).getTime();
          const stmtDate = new Date(stmt.date).getTime();
          if (Math.abs(bookDate - stmtDate) <= 3 * 86400000) {
            newMatches.push({
              id: `match-${Date.now()}-${matched}`,
              bookEntryId: book.id,
              statementLineId: stmt.id,
              matchDate: today(),
              matchedBy: 'auto',
              amount: bookAmt,
            });
            matchedBookIds.add(book.id);
            matchedStmtIds.add(stmt.id);
            matched++;
          }
        }
      }
    }
    setMatches(newMatches);
    toast.success(`Auto-matched ${matched} entries`);
  }, [bookEntries, statementLines, matches, matchedBookIds, matchedStmtIds]);

  const saveRecon = useCallback(() => {
    // [JWT] POST /api/accounting/bank-recon
    localStorage.setItem(`erp_bank_recon_${entityCode}`, JSON.stringify(matches));
    toast.success('Reconciliation saved');
  }, [entityCode, matches]);

  const unmatchedBooks = bookEntries.filter(e => !matchedBookIds.has(e.id));
  const unmatchedStmts = statementLines.filter(s => !matchedStmtIds.has(s.id));

  return (
    <div data-keyboard-form className="p-5 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-teal-500" />
          <h2 className="text-lg font-bold">Bank Reconciliation</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={autoMatch} disabled={!selectedBank || statementLines.length === 0}>
            <Zap className="h-3.5 w-3.5 mr-1" /> Auto Match
          </Button>
          <Button data-primary size="sm" onClick={saveRecon}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save BRS
          </Button>
        </div>
      </div>

      <Card><CardContent className="p-3 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Bank Account</label>
          <select className="h-8 text-xs border rounded px-2 bg-background" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}>
            <option value="">Select bank ledger...</option>
            {bankLedgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Period</label>
          <Input type="month" value={periodMonth} onChange={e => setPeriodMonth(e.target.value)} className="h-8 text-xs w-40" onKeyDown={onEnterNext} />
        </div>
      </CardContent></Card>

      {/* Bank statement import */}
      <Card><CardContent className="p-3 space-y-2">
        <label className="text-xs font-medium">Paste Bank Statement (CSV: date, description, debit, credit)</label>
        <Textarea value={statementText} onChange={e => setStatementText(e.target.value)} rows={4} className="text-xs font-mono" placeholder="2026-04-01, NEFT from Alpha, 0, 50000&#10;2026-04-05, Cheque 001234, 25000, 0" />
        <Button variant="outline" size="sm" onClick={parseStatement}><Download className="h-3.5 w-3.5 mr-1" /> Parse Statement</Button>
      </CardContent></Card>

      {/* BRS Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Matched</p>
          <p className="text-sm font-bold text-emerald-600">{matches.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Unmatched (Books)</p>
          <p className="text-sm font-bold text-amber-600">{unmatchedBooks.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-[10px] text-muted-foreground">Unmatched (Statement)</p>
          <p className="text-sm font-bold text-amber-600">{unmatchedStmts.length}</p>
        </CardContent></Card>
      </div>

      {/* Matched entries */}
      {matches.length > 0 && (
        <Card><CardContent className="p-0">
          <div className="p-3 border-b bg-muted/30"><p className="text-xs font-bold">Matched Entries</p></div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Book Entry</TableHead>
                <TableHead className="text-xs text-right">Amount</TableHead>
                <TableHead className="text-xs text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="text-xs">{m.bookEntryId}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{inr(m.amount)}</TableCell>
                  <TableCell className="text-xs text-center"><Badge className="bg-emerald-500/15 text-emerald-700 text-[10px]"><CheckCircle className="h-3 w-3 mr-1" />Reconciled</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Unmatched books */}
      {unmatchedBooks.length > 0 && (
        <Card><CardContent className="p-0">
          <div className="p-3 border-b bg-amber-500/5"><p className="text-xs font-bold">In Books — Not in Statement</p></div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Voucher</TableHead>
              <TableHead className="text-xs text-right">Dr</TableHead><TableHead className="text-xs text-right">Cr</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {unmatchedBooks.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{fmtDate(e.date)}</TableCell>
                  <TableCell className="text-xs font-mono">{e.voucher_no}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{e.dr_amount > 0 ? inr(e.dr_amount) : ''}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{e.cr_amount > 0 ? inr(e.cr_amount) : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      {/* Unmatched statement */}
      {unmatchedStmts.length > 0 && (
        <Card><CardContent className="p-0">
          <div className="p-3 border-b bg-amber-500/5"><p className="text-xs font-bold">In Statement — Not in Books</p></div>
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Date</TableHead><TableHead className="text-xs">Description</TableHead>
              <TableHead className="text-xs text-right">Debit</TableHead><TableHead className="text-xs text-right">Credit</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {unmatchedStmts.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{s.date}</TableCell>
                  <TableCell className="text-xs">{s.description}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{s.debit > 0 ? inr(s.debit) : ''}</TableCell>
                  <TableCell className="text-xs text-right font-mono">{s.credit > 0 ? inr(s.credit) : ''}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}
    </div>
  );
}

export default function BankReconciliation() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader breadcrumbs={[{ label: 'Fin Core', href: '/erp/finecore' }, { label: 'Bank Reconciliation' }]} showDatePicker={false} showCompany={false} />
        <main><BankReconciliationPanel entityCode="SMRT" /></main>
      </div>
    </SidebarProvider>
  );
}
