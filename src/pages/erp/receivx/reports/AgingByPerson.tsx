/**
 * AgingByPerson.tsx — Aging grouped by salesman/agent/broker/telecaller
 * [JWT] GET /api/receivx/aging-by-person
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Download, ChevronRight, ChevronDown, MessageCircle, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import {
  type OutstandingTask, type PTP,
  receivxTasksKey, receivxPTPsKey,
} from '@/types/receivx';
import { computeDSO, computePTPKeptRatio } from '@/lib/receivx-engine';

interface Props {
  entityCode: string;
  personType: 'salesman' | 'agent' | 'broker' | 'telecaller';
  onNavigate?: (m: string) => void;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const monthsAgo = (n: number) => { const d = new Date(); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };

interface PersonRow {
  id: string;
  name: string;
  total: number;
  buckets: Record<'0-30' | '31-60' | '61-90' | '91-180' | '180+', number>;
  taskCount: number;
  dso: number;
  pctKept: number;
  tasks: OutstandingTask[];
}

export function AgingByPersonPanel({ entityCode, personType, onNavigate: _onNavigate }: Props) {
  const [tasks, setTasks] = useState<OutstandingTask[]>([]);
  const [ptps, setPtps] = useState<PTP[]>([]);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      // [JWT] GET /api/receivx/tasks
      setTasks(JSON.parse(localStorage.getItem(receivxTasksKey(entityCode)) || '[]'));
      // [JWT] GET /api/receivx/ptps
      setPtps(JSON.parse(localStorage.getItem(receivxPTPsKey(entityCode)) || '[]'));
    } catch { /* noop */ }
  }, [entityCode]);

  useCtrlS(() => { handleExport(); });

  const idKey = `assigned_${personType}_id` as const;
  const nameKey = `assigned_${personType}_name` as const;

  const rows: PersonRow[] = useMemo(() => {
    const groups = new Map<string, PersonRow>();
    for (const t of tasks) {
      const id = (t[idKey] as string | null) ?? '__unassigned__';
      const name = (t[nameKey] as string | null) ?? 'Unassigned';
      if (!groups.has(id)) {
        groups.set(id, {
          id, name, total: 0,
          buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '91-180': 0, '180+': 0 },
          taskCount: 0, dso: 0, pctKept: 0, tasks: [],
        });
      }
      const g = groups.get(id)!;
      g.total += t.pending_amount;
      g.buckets[t.age_bucket] += t.pending_amount;
      g.taskCount += 1;
      g.tasks.push(t);
    }
    for (const g of groups.values()) {
      const invoices = g.tasks.map(t => ({ date: t.voucher_date, amount: t.original_amount }));
      const receipts = g.tasks.map(t => ({ date: today(), amount: t.original_amount - t.pending_amount }));
      g.dso = computeDSO(invoices, receipts, 30);
      const personPtps = ptps.filter(p => g.tasks.some(t => t.party_id === p.party_id));
      g.pctKept = computePTPKeptRatio(personPtps, monthsAgo(6), today()).pctKept;
    }
    return Array.from(groups.values())
      .filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [tasks, ptps, idKey, nameKey, search]);

  const summary = useMemo(() => {
    const totalOutstanding = rows.reduce((s, r) => s + r.total, 0);
    const totalOverdue = rows.reduce((s, r) => s + r.buckets['31-60'] + r.buckets['61-90'] + r.buckets['91-180'] + r.buckets['180+'], 0);
    const allTasks = rows.flatMap(r => r.tasks);
    const avgAge = allTasks.length > 0 ? Math.round(allTasks.reduce((s, t) => s + t.age_days, 0) / allTasks.length) : 0;
    const sorted = [...rows].filter(r => r.taskCount > 0).sort((a, b) => a.dso - b.dso);
    return {
      totalOutstanding, totalOverdue, avgAge,
      best: sorted[0]?.name ?? '—',
      worst: sorted[sorted.length - 1]?.name ?? '—',
    };
  }, [rows]);

  const toggleExpand = (id: string) => setExpanded(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n;
  });

  const handleExport = useCallback(() => {
    const header = ['Name', 'Total', '0-30', '31-60', '61-90', '91-180', '180+', 'Tasks', 'DSO', 'Kept%'];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push([r.name, r.total, r.buckets['0-30'], r.buckets['31-60'], r.buckets['61-90'], r.buckets['91-180'], r.buckets['180+'], r.taskCount, r.dso, r.pctKept].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `aging-${personType}-${today()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  }, [rows, personType]);

  return (
    <div data-keyboard-form className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold capitalize">Aging by {personType}</h1>
          <p className="text-xs text-muted-foreground">Receivables grouped by {personType}</p>
        </div>
        <Button data-primary onClick={handleExport} className="bg-amber-500 hover:bg-amber-600 text-white">
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Outstanding</p><p className="text-lg font-bold font-mono">{fmt(summary.totalOutstanding)}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Overdue</p><p className="text-lg font-bold font-mono text-red-600">{fmt(summary.totalOverdue)}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Avg age</p><p className="text-lg font-bold font-mono">{summary.avgAge}d</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Top performer</p><p className="text-sm font-semibold text-green-600">{summary.best}</p></Card>
        <Card className="p-3"><p className="text-[10px] uppercase text-muted-foreground">Weakest</p><p className="text-sm font-semibold text-red-600">{summary.worst}</p></Card>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder={`Search ${personType}...`} value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={onEnterNext} className="w-60 h-8 text-xs" />
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="text-xs">Name</TableHead>
              <TableHead className="text-xs text-right">Total</TableHead>
              <TableHead className="text-xs text-right">0-30</TableHead>
              <TableHead className="text-xs text-right">31-60</TableHead>
              <TableHead className="text-xs text-right">61-90</TableHead>
              <TableHead className="text-xs text-right">91-180</TableHead>
              <TableHead className="text-xs text-right">180+</TableHead>
              <TableHead className="text-xs text-right">Tasks</TableHead>
              <TableHead className="text-xs text-right">DSO</TableHead>
              <TableHead className="text-xs text-right">Kept %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-6">No tasks.</TableCell></TableRow>
            ) : rows.map(r => (
              <>
                <TableRow key={r.id} className="cursor-pointer" onClick={() => toggleExpand(r.id)}>
                  <TableCell>{expanded.has(r.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}</TableCell>
                  <TableCell className="text-xs font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs font-mono text-right font-bold">{fmt(r.total)}</TableCell>
                  <TableCell className="text-xs font-mono text-right text-green-600">{fmt(r.buckets['0-30'])}</TableCell>
                  <TableCell className="text-xs font-mono text-right text-amber-600">{fmt(r.buckets['31-60'])}</TableCell>
                  <TableCell className="text-xs font-mono text-right text-amber-700">{fmt(r.buckets['61-90'])}</TableCell>
                  <TableCell className="text-xs font-mono text-right text-red-600">{fmt(r.buckets['91-180'])}</TableCell>
                  <TableCell className="text-xs font-mono text-right text-red-700">{fmt(r.buckets['180+'])}</TableCell>
                  <TableCell className="text-xs text-right">{r.taskCount}</TableCell>
                  <TableCell className="text-xs text-right">{r.dso}</TableCell>
                  <TableCell className="text-xs text-right">{r.pctKept}%</TableCell>
                </TableRow>
                {expanded.has(r.id) && (
                  <TableRow key={`${r.id}-detail`}>
                    <TableCell colSpan={11} className="bg-muted/20 p-2">
                      <div className="space-y-1">
                        {r.tasks.map(t => (
                          <div key={t.id} className="flex items-center gap-2 text-xs py-1 border-b border-border/30">
                            <span className="w-40 truncate">{t.party_name}</span>
                            <span className="font-mono text-[10px] w-32">{t.voucher_no}</span>
                            <Badge variant="outline" className="text-[9px]">{t.age_bucket}</Badge>
                            <span className="font-mono text-amber-600 flex-1 text-right">{fmt(t.pending_amount)}</span>
                            <Button size="icon" variant="ghost" className="h-6 w-6"><MessageCircle className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6"><Mail className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-6 w-6"><CheckCircle2 className="h-3 w-3" /></Button>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function AgingByPerson() {
  return (
    <SidebarProvider>
      <AgingByPersonPanel entityCode="SMRT" personType="salesman" />
    </SidebarProvider>
  );
}
