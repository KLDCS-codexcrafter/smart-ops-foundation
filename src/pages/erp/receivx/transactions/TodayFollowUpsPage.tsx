/**
 * @file        src/pages/erp/receivx/transactions/TodayFollowUpsPage.tsx
 * @sprint      Sprint 148 · T-ReceivX-CF.1 · Block 4 · Today board (overdue + today)
 * @reads-from  receivx-followup-engine · receivx tasks (READ via engine)
 * @[JWT]       P2BB: server-side board endpoint
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  getTodaysFollowUps, logFollowUp, getLastN, type TodayBoard, type LogFollowUpInput,
} from '@/lib/receivx-followup-engine';
import { getContactsForParty } from '@/lib/frontdesk-engine';
import type { FollowUpChannel } from '@/types/receivx-followup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Props { entityCode: string }

const CHANNELS: FollowUpChannel[] = ['call', 'whatsapp', 'email', 'sms', 'meeting', 'visit'];

const fmtMoney = (n: number): string => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en-IN', { month: 'short' })} ${d.getFullYear()}`;
};

export function TodayFollowUpsPanel({ entityCode }: Props): JSX.Element {
  const me = useCurrentUser();
  const [board, setBoard] = useState<TodayBoard>({ overdue: [], today: [] });
  const [openFor, setOpenFor] = useState<string | null>(null); // taskId
  const [channel, setChannel] = useState<FollowUpChannel>('call');
  const [remarks, setRemarks] = useState('');
  const [contactPersonId, setContactPersonId] = useState<string>('');
  const [nextDate, setNextDate] = useState('');
  const [promised, setPromised] = useState('');

  const reload = useCallback((): void => {
    setBoard(getTodaysFollowUps(entityCode));
  }, [entityCode]);
  useEffect(() => { reload(); }, [reload]);

  const active = useMemo(
    () => [...board.overdue, ...board.today].find((r) => r.task.id === openFor) ?? null,
    [board, openFor],
  );
  const contacts = active ? getContactsForParty(entityCode, active.task.party_id) : [];

  function reset(): void {
    setOpenFor(null); setChannel('call'); setRemarks('');
    setContactPersonId(''); setNextDate(''); setPromised('');
  }

  function submit(): void {
    if (!active) return;
    try {
      const ctc = contacts.find((c) => c.id === contactPersonId);
      const input: LogFollowUpInput = {
        taskId: active.task.id,
        followedUpByUserId: me?.id ?? 'demo-user',
        followedUpByName: me?.name ?? 'Demo User',
        channel,
        remarks,
        contactPersonId: ctc?.id ?? null,
        contactPersonName: ctc?.name ?? null,
        nextFollowUpDate: nextDate || null,
        promisedAmount: promised ? Number(promised) : null,
      };
      logFollowUp(entityCode, input);
      toast.success('Follow-up logged');
      reset();
      reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  const section = (label: string, tone: string, rows: TodayBoard['today']): JSX.Element => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
          {label}
          <Badge variant="outline" className="ml-auto font-mono">{rows.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Nothing pending here.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Party</TableHead>
                <TableHead>Voucher</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead>Next Action</TableHead>
                <TableHead>Last Touch</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.task.id}>
                  <TableCell className="font-medium">{r.task.party_name}</TableCell>
                  <TableCell className="font-mono text-xs">{r.task.voucher_no}</TableCell>
                  <TableCell className="text-right font-mono">{fmtMoney(r.task.pending_amount)}</TableCell>
                  <TableCell className="text-xs">{fmtDate(r.task.next_action_date)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.lastFollowUp
                      ? `${r.lastFollowUp.channel} · ${fmtDate(r.lastFollowUp.at)}`
                      : 'No follow-ups yet'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => setOpenFor(r.task.id)}>Log</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Today's Follow-Ups</h1>
        <p className="text-xs text-muted-foreground">Overdue first · APPEND-ONLY log · void with reason if mis-entered.</p>
      </div>
      {section('Overdue', 'bg-destructive', board.overdue)}
      {section('Due Today', 'bg-warning', board.today)}

      <Dialog open={!!openFor} onOpenChange={(o) => { if (!o) reset(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Follow-Up · {active?.task.party_name}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="rounded-md border border-border bg-muted/30 p-2 text-xs">
                <div className="font-mono">{active.task.voucher_no}</div>
                <div className="text-muted-foreground">Pending {fmtMoney(active.task.pending_amount)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Channel</Label>
                  <Select value={channel} onValueChange={(v) => setChannel(v as FollowUpChannel)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Contact Person</Label>
                  <Select value={contactPersonId} onValueChange={setContactPersonId}>
                    <SelectTrigger>
                      <SelectValue placeholder={contacts.length ? 'Optional' : 'No contacts on file'} />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.isPrimary ? ' (primary)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs">Remarks (mandatory)</Label>
                <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Next follow-up date</Label>
                  <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Promised amount (₹)</Label>
                  <Input type="number" min={0} value={promised} onChange={(e) => setPromised(e.target.value)} />
                </div>
              </div>
              <div className="rounded-md border border-border p-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Last 3 follow-ups</div>
                {(() => {
                  const last = getLastN(entityCode, active.task.party_id, 3);
                  if (!last.length) return <p className="text-xs text-muted-foreground">No prior follow-ups.</p>;
                  return (
                    <ul className="space-y-1 text-xs">
                      {last.map((f) => (
                        <li key={f.id} className="flex gap-2">
                          <span className="font-mono text-muted-foreground">{fmtDate(f.at)}</span>
                          <span className="uppercase text-[10px] rounded bg-muted px-1.5">{f.channel}</span>
                          <span className="truncate">{f.remarks}</span>
                        </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={submit}>Log Follow-Up</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
