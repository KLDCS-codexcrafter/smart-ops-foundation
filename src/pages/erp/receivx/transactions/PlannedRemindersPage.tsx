/**
 * @file        src/pages/erp/receivx/transactions/PlannedRemindersPage.tsx
 * @sprint      Sprint 148 · T-ReceivX-CF.1 · Block 4 · Planned Reminders (7/30 day horizon)
 */
import { useMemo, useState } from 'react';
import { getPlannedReminders } from '@/lib/receivx-followup-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Props { entityCode: string }

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
};

export function PlannedRemindersPanel({ entityCode }: Props): JSX.Element {
  const [days, setDays] = useState<'7' | '30'>('7');
  const groups = useMemo(
    () => getPlannedReminders(entityCode, { days: Number(days) as 7 | 30 }),
    [entityCode, days],
  );
  const total = groups.reduce((s, g) => s + g.tasks.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold">Planned Reminders</h1>
          <p className="text-xs text-muted-foreground">Upcoming next-action dates grouped by day.</p>
        </div>
        <Tabs value={days} onValueChange={(v) => setDays(v as '7' | '30')}>
          <TabsList>
            <TabsTrigger value="7">Next 7 days</TabsTrigger>
            <TabsTrigger value="30">Next 30 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {groups.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          No reminders planned in the next {days} days.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <Card key={g.dateISO}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {fmtDate(g.dateISO)}
                  <Badge variant="outline" className="ml-auto font-mono">{g.tasks.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party</TableHead>
                      <TableHead>Voucher</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.party_name}</TableCell>
                        <TableCell className="font-mono text-xs">{t.voucher_no}</TableCell>
                        <TableCell className="text-right font-mono">{fmtMoney(t.pending_amount)}</TableCell>
                        <TableCell><Badge variant="outline">{t.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
          <p className="text-[10px] text-muted-foreground text-right">{total} tasks across {groups.length} day(s).</p>
        </div>
      )}
    </div>
  );
}
