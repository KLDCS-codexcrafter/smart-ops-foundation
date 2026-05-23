/**
 * @file        BankReconciliationAdvancedPanel.tsx
 * @purpose     Engine-backed bank reconciliation panel · 26th SIBLING consumer
 * @sprint      T-Phase-2.HK-6 · Theme 1
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Landmark, Zap, X, Check } from 'lucide-react';
import {
  listBankStatements, autoMatchStatement, applyMatch, ignoreLine,
  type BankStatement, type MatchSuggestion,
} from '@/lib/bank-reconciliation-engine';
import { inr, fmtDate } from './reports/reportUtils';

interface Props { entityCode: string }

export function BankReconciliationAdvancedPanel({ entityCode }: Props) {
  const [statements, setStatements] = useState<BankStatement[]>(() => listBankStatements(entityCode));
  const [activeId, setActiveId] = useState<string>(statements[0]?.id ?? '');
  const [suggestions, setSuggestions] = useState<MatchSuggestion[]>([]);

  const active = useMemo(() => statements.find(s => s.id === activeId) ?? null, [statements, activeId]);

  const refresh = () => setStatements(listBankStatements(entityCode));

  const handleAuto = () => {
    if (!active) return;
    const s = autoMatchStatement(entityCode, active.id);
    setSuggestions(s);
    toast.success(`${s.length} match suggestions generated`);
  };

  const handleApply = (s: MatchSuggestion) => {
    applyMatch(entityCode, s.bank_line_id, s.voucher_id, 'auto', `score ${s.match_score}`);
    setSuggestions(prev => prev.filter(x => x.bank_line_id !== s.bank_line_id));
    refresh();
    toast.success(`Matched ${s.voucher_no}`);
  };

  const handleIgnore = (lineId: string) => {
    ignoreLine(entityCode, lineId);
    refresh();
  };

  const kpi = useMemo(() => {
    if (!active) return { matched: 0, unmatched: 0, ignored: 0 };
    const m = active.lines.filter(l => l.match_status === 'auto_matched' || l.match_status === 'manual_matched').length;
    const u = active.lines.filter(l => l.match_status === 'unmatched').length;
    const i = active.lines.filter(l => l.match_status === 'ignored').length;
    return { matched: m, unmatched: u, ignored: i };
  }, [active]);

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          Bank Reconciliation (Engine v2)
        </h2>
        <div className="flex items-center gap-2">
          <Select value={activeId} onValueChange={setActiveId}>
            <SelectTrigger className="w-72"><SelectValue placeholder="Choose statement" /></SelectTrigger>
            <SelectContent>
              {statements.map(s => (
                <SelectItem key={s.id} value={s.id}>
                  {s.bank_name} · {s.account_number} · {fmtDate(s.statement_period_from)}–{fmtDate(s.statement_period_to)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAuto} disabled={!active}>
            <Zap className="h-4 w-4 mr-1" /> Auto-Match
          </Button>
        </div>
      </div>

      {!active ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No bank statements loaded. Use demo seed to load mock statements.
        </CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Lines</CardTitle></CardHeader>
              <CardContent className="font-mono text-2xl">{active.lines.length}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Matched</CardTitle></CardHeader>
              <CardContent className="font-mono text-2xl text-success">{kpi.matched}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Unmatched</CardTitle></CardHeader>
              <CardContent className="font-mono text-2xl text-warning">{kpi.unmatched}</CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ignored</CardTitle></CardHeader>
              <CardContent className="font-mono text-2xl text-muted-foreground">{kpi.ignored}</CardContent></Card>
          </div>

          {suggestions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Match Suggestions</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Bank Line</TableHead>
                    <TableHead>Voucher</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reasons</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {suggestions.map((s, i) => (
                      <TableRow key={`${s.bank_line_id}-${i}`}>
                        <TableCell className="font-mono text-xs">{s.bank_line_id.slice(-6)}</TableCell>
                        <TableCell className="font-mono">{s.voucher_no}</TableCell>
                        <TableCell><Badge variant={s.match_score >= 70 ? 'default' : 'outline'}>{s.match_score}</Badge></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{s.match_reasons.join(', ')}</TableCell>
                        <TableCell><Button size="sm" onClick={() => handleApply(s)}><Check className="h-3 w-3" /></Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Statement Lines</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {active.lines.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-mono text-xs">{fmtDate(l.date)}</TableCell>
                      <TableCell className="text-xs">{l.description}</TableCell>
                      <TableCell className="font-mono text-xs">{l.reference || '—'}</TableCell>
                      <TableCell className="text-right font-mono">{l.debit_amount > 0 ? inr(l.debit_amount) : '—'}</TableCell>
                      <TableCell className="text-right font-mono">{l.credit_amount > 0 ? inr(l.credit_amount) : '—'}</TableCell>
                      <TableCell>
                        <Badge variant={
                          l.match_status === 'unmatched' ? 'outline'
                          : l.match_status === 'ignored' ? 'secondary'
                          : 'default'
                        }>{l.match_status}</Badge>
                      </TableCell>
                      <TableCell>
                        {l.match_status === 'unmatched' && (
                          <Button size="sm" variant="ghost" onClick={() => handleIgnore(l.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default BankReconciliationAdvancedPanel;
