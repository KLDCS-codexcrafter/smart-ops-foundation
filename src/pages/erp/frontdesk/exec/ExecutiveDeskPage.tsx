/**
 * @file        src/pages/erp/frontdesk/exec/ExecutiveDeskPage.tsx
 * @sprint      Sprint 146 · T-FrontDesk-A6F.2 · Block 4 · Executive Day View (DP-FD-10).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  listExecutives, listRooms, buildExecutiveDayView,
  createExecAppointment, cancelExecAppointment,
  type ExecutiveDayView,
} from '@/lib/frontdesk-scheduling-engine';
import { loadVisitors } from '@/lib/frontdesk-engine';
import type { Employee } from '@/types/employee';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, ChevronLeft, ChevronRight, Bell, BellOff, X, Users, DoorOpen, Calendar } from 'lucide-react';
import { toast } from 'sonner';

function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function combine(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).toISOString();
}

export function ExecutiveDeskPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const me = useCurrentUser();
  const executives = useMemo<Employee[]>(() => listExecutives(entityCode), [entityCode]);
  const rooms = useMemo(() => listRooms(entityCode, { activeOnly: true }), [entityCode]);
  const visitors = useMemo(() => loadVisitors(entityCode), [entityCode]);

  const [execId, setExecId] = useState<string>(() => executives[0]?.id ?? '');
  const [dateISO, setDateISO] = useState<string>(() => new Date().toISOString());

  const compute = useCallback((): ExecutiveDayView | null => {
    if (!execId) return null;
    return buildExecutiveDayView(entityCode, execId, dateISO);
  }, [entityCode, execId, dateISO]);
  const [view, setView] = useState<ExecutiveDayView | null>(() => compute());
  const reload = useCallback(() => setView(compute()), [compute]);
  useEffect(() => { reload(); }, [reload]);

  function shift(days: number): void {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + days);
    setDateISO(d.toISOString());
  }

  // new-appointment dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', date: toDateInput(new Date()), startTime: '10:00', endTime: '10:30',
    visitorId: '', withRoomId: '', reminderMinutes: '15', notes: '',
  });
  function openNew(): void {
    setForm({
      title: '', date: toDateInput(new Date(dateISO)), startTime: '10:00', endTime: '10:30',
      visitorId: '', withRoomId: '', reminderMinutes: '15', notes: '',
    });
    setOpen(true);
  }
  function submit(): void {
    try {
      const exec = executives.find((e) => e.id === execId);
      if (!exec) throw new Error('Executive required');
      createExecAppointment(entityCode, {
        executiveEmployeeId: exec.id,
        executiveName: exec.displayName || exec.empCode,
        title: form.title,
        visitorId: form.visitorId || null,
        startAt: combine(form.date, form.startTime),
        endAt: combine(form.date, form.endTime),
        notes: form.notes || null,
        withRoomId: form.withRoomId || null,
        withReminderMinutesBefore: form.reminderMinutes ? Number(form.reminderMinutes) : null,
      }, { entityId: entityCode, userId: me?.id ?? 'demo-user' });
      toast.success('Appointment scheduled');
      setOpen(false); reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  function handleCancel(id: string): void {
    try { cancelExecAppointment(entityCode, id); toast.success('Cancelled'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  if (executives.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle>Executive Desk</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No executives found. Executives are auto-identified from the Employee master by designation
              (CEO/CTO/CFO/COO/Director/VP/President/Head/Founder/Principal/Managing). Add or update employees in HR.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle>Executive Desk</CardTitle>
            <Select value={execId} onValueChange={setExecId}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {executives.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.displayName || e.empCode} · {e.designation}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-mono">{new Date(dateISO).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDateISO(new Date().toISOString())}>Today</Button>
            <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New</Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" /> Appointments</CardTitle></CardHeader>
          <CardContent>
            {!view || view.appointments.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nothing scheduled.</p>
            ) : (
              <div className="space-y-2">
                {view.appointments.map((a) => (
                  <div key={a.id} className="border rounded p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {new Date(a.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} → {new Date(a.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <Badge variant={a.status === 'cancelled' ? 'destructive' : a.status === 'completed' ? 'outline' : 'default'} className="text-[10px]">{a.status}</Badge>
                    </div>
                    {a.notes && <p className="text-xs mt-1 text-muted-foreground">{a.notes}</p>}
                    {a.status === 'scheduled' && (
                      <div className="mt-2 flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(a.id)}><X className="h-3 w-3 mr-1" /> Cancel</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Expected Visitors</CardTitle></CardHeader>
          <CardContent>
            {!view || view.expectedVisitors.length === 0 ? (
              <p className="text-xs text-muted-foreground">No expected visitors.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {view.expectedVisitors.map((v) => (
                  <li key={v.visitorId} className="flex justify-between border-b py-1 last:border-0">
                    <span>{v.name}{v.company ? ` · ${v.company}` : ''}</span>
                    <span className="font-mono text-xs text-muted-foreground">{new Date(v.plannedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><DoorOpen className="h-4 w-4" /> Room Bookings</CardTitle></CardHeader>
          <CardContent>
            {!view || view.roomBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No rooms booked.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {view.roomBookings.map((b) => {
                  const room = rooms.find((r) => r.id === b.roomId);
                  return (
                    <li key={b.id} className="flex justify-between border-b py-1 last:border-0">
                      <span className="truncate">{b.title} · {room?.name ?? b.roomId}</span>
                      <span className="font-mono text-xs text-muted-foreground">{new Date(b.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Reminders (TaskFlow)</CardTitle></CardHeader>
        <CardContent>
          {!view || view.reminderTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No reminder tasks.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {view.reminderTasks.map((t) => (
                <li key={t.taskId} className="flex items-center justify-between border-b py-1 last:border-0">
                  <span className="flex items-center gap-2">
                    {t.acknowledged ? <BellOff className="h-3 w-3 text-muted-foreground" /> : <Bell className="h-3 w-3 text-primary" />}
                    <span className="font-mono text-xs">{t.code}</span>
                    <span>{t.title}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{t.dueDate ? new Date(t.dueDate).toLocaleString('en-IN') : '—'}</span>
                    <Badge variant={t.acknowledged ? 'outline' : 'secondary'} className="text-[10px]">{t.acknowledged ? 'Ack' : 'Pending'}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Start</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
              <div><Label>End</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Visitor (optional)</Label>
                <Select value={form.visitorId || '__none__'} onValueChange={(v) => setForm({ ...form, visitorId: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Link visitor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— none —</SelectItem>
                    {visitors.filter((v) => v.status === 'planned' || v.status === 'on_site').map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}{v.company ? ` · ${v.company}` : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hold Room (optional)</Label>
                <Select value={form.withRoomId || '__none__'} onValueChange={(v) => setForm({ ...form, withRoomId: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="No room hold" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— none —</SelectItem>
                    {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · cap {r.capacity}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Remind me (minutes before)</Label>
                <Select value={form.reminderMinutes} onValueChange={(v) => setForm({ ...form, reminderMinutes: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No reminder</SelectItem>
                    <SelectItem value="5">5 min</SelectItem>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.title.trim()}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
