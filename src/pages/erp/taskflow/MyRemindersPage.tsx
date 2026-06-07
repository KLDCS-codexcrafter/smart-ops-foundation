/**
 * @file        src/pages/erp/taskflow/MyRemindersPage.tsx
 * @sprint      Sprint B1S2 · T-B1S2-Adapters-MyReminders · Pillar B.1 CLOSE
 * @purpose     Per-user, self-served reminders. Different from S138 RemindersPage
 *              (task-level admin reminders) — this one is operator-grade.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { BellRing, Plus, Clock4, BellOff, Trash2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listMyReminders, createMyReminder, snoozeMyReminder,
  dismissMyReminder, deleteMyReminder, fireDueMyReminders,
} from '@/lib/taskflow-reminders-engine';
import type { MyReminder } from '@/types/my-reminder';

const fmtIST = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function MyRemindersPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userName = user?.displayName ?? user?.id ?? 'me';
  const [rows, setRows] = useState<MyReminder[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [remindAt, setRemindAt] = useState('');

  const refresh = useCallback((): void => {
    setRows(listMyReminders(entityCode, userName));
  }, [entityCode, userName]);

  // Fire due reminders on mount + every 60s (client-side honesty per banner)
  useEffect(() => {
    fireDueMyReminders(entityCode, userName);
    refresh();
    const t = setInterval(() => { fireDueMyReminders(entityCode, userName); refresh(); }, 60_000);
    return () => clearInterval(t);
  }, [entityCode, userName, refresh]);

  const filtered = useMemo(
    () => [...rows].sort((a, b) => new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime()),
    [rows],
  );

  const onCreate = (): void => {
    if (!title.trim() || !remindAt) {
      toast.error('Title and reminder time required');
      return;
    }
    createMyReminder({
      entityCode,
      user_name: userName,
      kind: 'free',
      title: title.trim(),
      note: note.trim() || undefined,
      remind_at: new Date(remindAt).toISOString(),
    });
    toast.success('Reminder set');
    setOpen(false); setTitle(''); setNote(''); setRemindAt('');
    refresh();
  };

  const snooze = (id: string, h: number): void => {
    snoozeMyReminder(entityCode, id, h);
    toast.success(`Snoozed ${h}h`);
    refresh();
  };
  const dismiss = (id: string): void => {
    dismissMyReminder(entityCode, id);
    refresh();
  };
  const remove = (id: string): void => {
    deleteMyReminder(entityCode, id);
    refresh();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6" /> My Reminders
          </h1>
          <p className="text-sm text-muted-foreground">
            Personal nudges anchored to anything in your workspace. Client-side polling only —
            reminders by email and WhatsApp arrive with B.2 and B.3.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" /> New reminder
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No reminders yet. Press "New reminder" to add one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead className="font-mono">Remind at (IST)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.title}</div>
                      {r.note ? <div className="text-xs text-muted-foreground">{r.note}</div> : null}
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.kind}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{fmtIST(r.remind_at)}</TableCell>
                    <TableCell>
                      {r.status === 'fired'     && <Badge variant="secondary">fired</Badge>}
                      {r.status === 'pending'   && <Badge variant="outline">pending</Badge>}
                      {r.status === 'snoozed'   && <Badge variant="outline">snoozed</Badge>}
                      {r.status === 'dismissed' && <Badge variant="secondary">dismissed</Badge>}
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button size="sm" variant="ghost" onClick={() => snooze(r.id, 1)} className="gap-1">
                        <Clock4 className="h-4 w-4" /> +1h
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => dismiss(r.id)} className="gap-1">
                        <BellOff className="h-4 w-4" /> Dismiss
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)} className="gap-1">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="myr-title">Title</Label>
              <Input id="myr-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Follow up with vendor on PO-1023" />
            </div>
            <div>
              <Label htmlFor="myr-when">Remind at</Label>
              <Input id="myr-when" type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="myr-note">Note (optional)</Label>
              <Textarea id="myr-note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={onCreate}>Set reminder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
