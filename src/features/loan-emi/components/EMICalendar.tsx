/**
 * @file     EMICalendar.tsx
 * @purpose  30/60/90-day window list view of upcoming EMIs across all
 *           active Borrowing ledgers, grouped by month. List format
 *           (NOT a month-grid) — keeps D3 scope tight.
 * @sprint   T-H1.5-D-D3
 * @finding  CC-064
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useLedgerStore } from '@/features/ledger-master/hooks/useLedgerStore';
import type { EMIScheduleLiveRow } from '../lib/emi-lifecycle-engine';

interface BorrowingLike {
  id: string;
  ledgerType: 'borrowing';
  name: string;
  status?: string;
  emiScheduleLive?: EMIScheduleLiveRow[];
}

interface CalendarRow {
  ledgerId: string;
  ledgerName: string;
  emiNumber: number;
  dueDate: string;
  amount: number;
  daysUntil: number;
  status: EMIScheduleLiveRow['status'];
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function dueLabel(daysUntil: number): { text: string; tone: string } {
  if (daysUntil < 0) return { text: `${Math.abs(daysUntil)}d overdue`, tone: 'text-destructive' };
  if (daysUntil === 0) return { text: 'Due today', tone: 'text-destructive' };
  if (daysUntil === 1) return { text: 'Due tomorrow', tone: 'text-warning' };
  return { text: `Due in ${daysUntil}d`, tone: daysUntil <= 7 ? 'text-warning' : 'text-muted-foreground' };
}

export function EMICalendar() {
  const navigate = useNavigate();
  const { ledgers } = useLedgerStore<BorrowingLike>('borrowing');
  const [windowDays, setWindowDays] = useState<'30' | '60' | '90'>('30');

  const rows = useMemo<CalendarRow[]>(() => {
    const today = new Date();
    const todayMs = today.getTime();
    const horizon = todayMs + Number(windowDays) * 86_400_000;
    const out: CalendarRow[] = [];
    for (const l of ledgers) {
      if (l.status !== 'active') continue;
      for (const r of l.emiScheduleLive ?? []) {
        if (r.status === 'paid') continue;
        const dueMs = new Date(r.dueDate).getTime();
        if (dueMs > horizon) continue;
        out.push({
          ledgerId: l.id, ledgerName: l.name,
          emiNumber: r.emiNumber, dueDate: r.dueDate,
          amount: r.totalEMI,
          daysUntil: Math.round((dueMs - todayMs) / 86_400_000),
          status: r.status,
        });
      }
    }
    return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [ledgers, windowDays]);

  const grouped = useMemo(() => {
    const map = new Map<string, CalendarRow[]>();
    for (const r of rows) {
      const monthKey = r.dueDate.slice(0, 7);
      const bucket = map.get(monthKey) ?? [];
      bucket.push(r);
      map.set(monthKey, bucket);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-primary" />
            EMI Calendar
          </CardTitle>
          <Tabs value={windowDays} onValueChange={(v) => setWindowDays(v as '30' | '60' | '90')}>
            <TabsList className="h-8">
              <TabsTrigger value="30" className="text-xs h-6 px-2">30d</TabsTrigger>
              <TabsTrigger value="60" className="text-xs h-6 px-2">60d</TabsTrigger>
              <TabsTrigger value="90" className="text-xs h-6 px-2">90d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {grouped.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 border border-dashed border-border rounded-lg">
            No EMIs scheduled in the next {windowDays} days.
          </p>
        ) : grouped.map(([monthKey, items]) => {
          const monthLabel = format(new Date(`${monthKey}-01`), 'MMMM yyyy');
          const monthTotal = items.reduce((s, r) => s + r.amount, 0);
          return (
            <div key={monthKey} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">{monthLabel}</span>
                <Badge variant="outline" className="text-[10px]">
                  {items.length} EMI{items.length === 1 ? '' : 's'} · {formatINR(monthTotal)}
                </Badge>
              </div>
              <div className="space-y-1">
                {items.map(r => {
                  const due = dueLabel(r.daysUntil);
                  return (
                    <div
                      key={`${r.ledgerId}-${r.emiNumber}`}
                      className="flex items-center justify-between gap-2 text-xs border border-border rounded-lg px-2.5 py-1.5"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-mono">{format(new Date(r.dueDate), 'EEE dd MMM')}</span>
                        <span className="mx-1.5 text-muted-foreground">·</span>
                        <span className="truncate">{r.ledgerName}</span>
                        <span className="mx-1.5 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">EMI #{r.emiNumber}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-semibold">{formatINR(r.amount)}</span>
                        <Badge variant="outline" className={`text-[10px] ${due.tone}`}>
                          {due.text}
                        </Badge>
                        {/* [T-T8.4-Requisition-Universal] Request EMI Payment · additive */}
                        <Button size="sm" variant="outline" className="h-6 text-[10px]"
                          onClick={() => navigate(`/erp/payout/requisition?type=loan_emi&linkedId=${r.ledgerId}-${r.emiNumber}`)}>
                          Request Payment
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
