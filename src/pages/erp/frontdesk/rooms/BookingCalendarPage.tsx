/**
 * @file        src/pages/erp/frontdesk/rooms/BookingCalendarPage.tsx
 * @sprint      Sprint 146 · T-FrontDesk-A6F.2 · Block 4 · day/week grid + create.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useEmployees } from '@/hooks/useEmployees';
import {
  buildDayGrid, buildWeekGrid, listRooms, listBookings,
  createBooking, cancelBooking, completeBooking,
  type DayGrid, type WeekGrid,
} from '@/lib/frontdesk-scheduling-engine';
import { loadVisitors, getVisitor } from '@/lib/frontdesk-engine';
import type { RoomBooking } from '@/types/frontdesk';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronLeft, ChevronRight, Plus, AlertTriangle, X, Check } from 'lucide-react';
import { toast } from 'sonner';

function toDateInput(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function toTimeInput(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function combine(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).toISOString();
}
function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
  return m;
}

export function BookingCalendarPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const me = useCurrentUser();
  const { employees } = useEmployees();
  const rooms = useMemo(() => listRooms(entityCode, { activeOnly: true }), [entityCode]);
  const visitors = useMemo(() => loadVisitors(entityCode).filter((v) => v.status === 'planned' || v.status === 'on_site'), [entityCode]);

  const [view, setView] = useState<'day' | 'week'>('day');
  const [dateISO, setDateISO] = useState<string>(() => new Date().toISOString());

  const computeDay = useCallback((): DayGrid => buildDayGrid(entityCode, dateISO), [entityCode, dateISO]);
  const computeWeek = useCallback((): WeekGrid => buildWeekGrid(entityCode, mondayOf(new Date(dateISO)).toISOString()), [entityCode, dateISO]);
  const [day, setDay] = useState<DayGrid>(() => computeDay());
  const [week, setWeek] = useState<WeekGrid>(() => computeWeek());
  const reload = useCallback(() => { setDay(computeDay()); setWeek(computeWeek()); }, [computeDay, computeWeek]);
  useEffect(() => { reload(); }, [reload]);

  // create-booking dialog
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    roomId: '', title: '', organizerId: '', startDate: toDateInput(new Date()),
    startTime: '10:00', endTime: '11:00', attendeeCount: '', visitorId: '',
  });
  function openCreate(roomId: string, hour: number, dStr?: string): void {
    const d = dStr ? new Date(dStr) : new Date(dateISO);
    setForm({
      roomId, title: '', organizerId: me?.id ?? '',
      startDate: toDateInput(d),
      startTime: `${String(hour).padStart(2, '0')}:00`,
      endTime: `${String(Math.min(hour + 1, 23)).padStart(2, '0')}:00`,
      attendeeCount: '', visitorId: '',
    });
    // pre-link visitor from VisitorsPage shortcut
    const prefill = sessionStorage.getItem('fd_prefill_visitor');
    if (prefill) {
      const v = getVisitor(entityCode, prefill);
      if (v) {
        setForm((f) => ({ ...f, visitorId: v.id, title: `Meeting with ${v.name}`, organizerId: v.hostEmployeeId }));
      }
      sessionStorage.removeItem('fd_prefill_visitor');
    }
    setOpen(true);
  }

  function submit(): void {
    try {
      const organizer = employees.find((e) => e.id === form.organizerId);
      if (!organizer) throw new Error('Organizer required');
      const res = createBooking(entityCode, {
        roomId: form.roomId,
        title: form.title,
        organizerEmployeeId: organizer.id,
        organizerName: organizer.fullName ?? organizer.name ?? 'Unknown',
        visitorId: form.visitorId || null,
        startAt: combine(form.startDate, form.startTime),
        endAt: combine(form.startDate, form.endTime),
        attendeeCount: form.attendeeCount ? Number(form.attendeeCount) : null,
      }, { entityId: entityCode, userId: me?.id ?? 'demo-user' });
      if (res.warning) toast.warning(res.warning);
      else toast.success('Booking created');
      setOpen(false); reload();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function shiftDate(days: number): void {
    const d = new Date(dateISO);
    d.setDate(d.getDate() + days);
    setDateISO(d.toISOString());
  }

  // current-user bookings
  const myBookings = useMemo<RoomBooking[]>(() =>
    listBookings(entityCode).filter((b) => b.organizerEmployeeId === (me?.id ?? '__none__')),
    [entityCode, me?.id, day, week]);

  function handleCancel(b: RoomBooking): void {
    try { cancelBooking(entityCode, b.id); toast.success('Cancelled'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }
  function handleComplete(b: RoomBooking): void {
    try { completeBooking(entityCode, b.id); toast.success('Completed'); reload(); }
    catch (e) { toast.error((e as Error).message); }
  }

  const hours = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00..20:00

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Booking Calendar</CardTitle>
            <p className="text-xs text-muted-foreground">Click an empty slot to book. Overlap throws · touching boundaries pass.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shiftDate(view === 'day' ? -1 : -7)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-mono">{new Date(dateISO).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <Button variant="outline" size="icon" onClick={() => shiftDate(view === 'day' ? 1 : 7)}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDateISO(new Date().toISOString())}>Today</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No active rooms. Create a room first.</div>
          ) : (
            <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week')}>
              <TabsList><TabsTrigger value="day">Day</TabsTrigger><TabsTrigger value="week">Week</TabsTrigger></TabsList>

              <TabsContent value="day" className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="border p-1 text-left w-32">Room</th>
                        {hours.map((h) => <th key={h} className="border p-1 font-mono">{String(h).padStart(2, '0')}:00</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {day.rows.map((row) => (
                        <tr key={row.room.id}>
                          <td className="border p-2 align-top">
                            <div className="font-medium">{row.room.name}</div>
                            <div className="text-[10px] text-muted-foreground">Floor {row.room.floor} · cap {row.room.capacity}</div>
                          </td>
                          {hours.map((h) => {
                            const slot = row.slots[h];
                            const has = slot.bookings.length > 0;
                            return (
                              <td
                                key={h}
                                className={`border p-1 align-top h-14 ${has ? 'bg-primary/10' : 'cursor-pointer hover:bg-accent/30'}`}
                                onClick={() => { if (!has) openCreate(row.room.id, h); }}
                              >
                                {slot.bookings.map((b) => (
                                  <div key={b.id} className="text-[10px] leading-tight">
                                    <div className="font-medium truncate">{b.title}</div>
                                    <div className="text-muted-foreground font-mono">{new Date(b.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                                  </div>
                                ))}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="week" className="mt-4">
                <div className="grid grid-cols-7 gap-2">
                  {week.days.map((d) => (
                    <div key={d.dateISO} className="border rounded-md p-2">
                      <div className="text-xs font-mono mb-2">{new Date(d.dateISO).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}</div>
                      {d.rows.map((row) => {
                        const count = row.slots.reduce((acc, s) => acc + s.bookings.length, 0);
                        return (
                          <div key={row.room.id} className="text-[10px] flex justify-between py-0.5">
                            <span className="truncate">{row.room.name}</span>
                            <Badge variant={count > 0 ? 'default' : 'outline'} className="text-[9px]">{count}</Badge>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {me?.id && (
        <Card>
          <CardHeader><CardTitle className="text-base">My Bookings</CardTitle></CardHeader>
          <CardContent>
            {myBookings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No bookings yet.</p>
            ) : (
              <div className="space-y-2">
                {myBookings.map((b) => {
                  const room = rooms.find((r) => r.id === b.roomId);
                  return (
                    <div key={b.id} className="flex items-center justify-between text-sm border rounded p-2">
                      <div>
                        <div className="font-medium">{b.title} <Badge variant={b.status === 'cancelled' ? 'destructive' : b.status === 'completed' ? 'outline' : 'default'} className="text-[10px] ml-2">{b.status}</Badge></div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {room?.name ?? b.roomId} · {new Date(b.startAt).toLocaleString('en-IN')} → {new Date(b.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      {b.status === 'booked' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleComplete(b)}><Check className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => handleCancel(b)}><X className="h-3 w-3" /></Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Booking</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Room</Label>
                <Select value={form.roomId} onValueChange={(v) => setForm({ ...form, roomId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                  <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name} · cap {r.capacity}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Organizer</Label>
                <Select value={form.organizerId} onValueChange={(v) => setForm({ ...form, organizerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.slice(0, 50).map((e) => <SelectItem key={e.id} value={e.id}>{e.fullName ?? e.name ?? e.empCode}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>Start</Label><Input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></div>
              <div><Label>End</Label><Input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Attendees</Label><Input type="number" min={0} value={form.attendeeCount} onChange={(e) => setForm({ ...form, attendeeCount: e.target.value })} /></div>
              <div>
                <Label>Visitor (optional)</Label>
                <Select value={form.visitorId || '__none__'} onValueChange={(v) => setForm({ ...form, visitorId: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Link a visitor" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— none —</SelectItem>
                    {visitors.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} {v.company ? `· ${v.company}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Overlap throws · capacity overflow warns only.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.roomId || !form.title.trim() || !form.organizerId}>Book</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// silence unused import lint when Plus icon is reserved for future quick-create FAB
void Plus;
