/**
 * @file        src/pages/erp/frontdesk/rooms/MeetingRoomsPage.tsx
 * @sprint      Sprint 146 · T-FrontDesk-A6F.2 · Block 4 · Room Board + CRUD.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  createRoom, updateRoom, listRooms, computeRoomStatus, listBookings,
  type RoomInput,
} from '@/lib/frontdesk-scheduling-engine';
import type { MeetingRoom, RoomAmenity, RoomBooking, RoomComputedStatus } from '@/types/frontdesk';
import type { FrontDeskModule } from '../FrontDeskSidebar.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';

const ALL_AMENITIES: RoomAmenity[] = ['Projector', 'Whiteboard', 'Video Conference', 'TV Screen', 'Mic System', 'AC', 'Catering'];

function statusBadge(s: RoomComputedStatus): { variant: 'default' | 'secondary' | 'outline'; label: string } {
  if (s === 'in_use')   return { variant: 'default',   label: 'In use' };
  if (s === 'reserved') return { variant: 'secondary', label: 'Reserved' };
  return { variant: 'outline', label: 'Available' };
}

interface Props { onNavigate?: (m: FrontDeskModule) => void }

const EMPTY_FORM: RoomInput = { name: '', floor: '', capacity: 8, amenities: [], isActive: true };

export function MeetingRoomsPage({ onNavigate }: Props = {}): JSX.Element {
  const { entityCode } = useEntityCode();
  const me = useCurrentUser();
  const computeAll = useCallback(() => {
    const r = listRooms(entityCode);
    const tb = listBookings(entityCode, { dateISO: new Date().toISOString() })
      .filter((b) => b.status !== 'cancelled');
    return { rooms: r, todayBookings: tb };
  }, [entityCode]);
  const [snap, setSnap] = useState(() => computeAll());
  const reload = useCallback(() => setSnap(computeAll()), [computeAll]);
  useEffect(() => { reload(); }, [reload]);
  const rows = snap.rooms;
  const todayBookings: RoomBooking[] = snap.todayBookings;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingRoom | null>(null);
  const [form, setForm] = useState<RoomInput>(EMPTY_FORM);

  function openCreate(): void { setEditing(null); setForm(EMPTY_FORM); setOpen(true); }
  function openEdit(r: MeetingRoom): void {
    setEditing(r);
    setForm({ name: r.name, floor: r.floor, capacity: r.capacity, amenities: r.amenities, isActive: r.isActive });
    setOpen(true);
  }
  function toggleAmenity(a: RoomAmenity): void {
    setForm((f) => ({ ...f, amenities: f.amenities?.includes(a) ? f.amenities.filter((x) => x !== a) : [...(f.amenities ?? []), a] }));
  }
  function submit(): void {
    try {
      if (editing) {
        updateRoom(entityCode, editing.id, form);
        toast.success(`Room updated · ${form.name}`);
      } else {
        createRoom(entityCode, form, { entityId: entityCode, userId: me?.id ?? 'demo-user' });
        toast.success(`Room created · ${form.name}`);
      }
      setOpen(false); reload();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Meeting Rooms · Board</CardTitle>
            <p className="text-xs text-muted-foreground">Status is computed from bookings · never stored.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onNavigate?.('booking-calendar')}>
              <CalendarRange className="h-4 w-4 mr-2" /> Open Calendar
            </Button>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> New Room</Button>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <div className="text-sm text-muted-foreground p-8 text-center">No rooms yet. Create one to start booking.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((r) => {
                const status = computeRoomStatus(entityCode, r.id);
                const sb = statusBadge(status);
                const next = todayBookings
                  .filter((b) => b.roomId === r.id && new Date(b.startAt).getTime() > Date.now())
                  .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
                const current = todayBookings.find((b) => {
                  const s = new Date(b.startAt).getTime(); const e = new Date(b.endAt).getTime();
                  return Date.now() >= s && Date.now() < e && b.roomId === r.id;
                });
                return (
                  <Card key={r.id} className={r.isActive ? '' : 'opacity-50'}>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{r.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">Floor {r.floor} · cap {r.capacity}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sb.variant}>{sb.label}</Badge>
                        <button onClick={() => openEdit(r)} aria-label="Edit room" className="text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {r.amenities.length === 0
                          ? <span className="text-xs text-muted-foreground">No amenities</span>
                          : r.amenities.map((a) => <Badge key={a} variant="outline" className="text-[10px]">{a}</Badge>)}
                      </div>
                      <div className="text-xs">
                        {current ? (
                          <p className="text-foreground"><span className="text-muted-foreground">Now:</span> {current.title} · until {new Date(current.endAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        ) : <p className="text-muted-foreground">No active meeting</p>}
                        {next && (
                          <p className="text-muted-foreground">Next: {next.title} @ {new Date(next.startAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Room' : 'New Room'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Floor</Label><Input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
              <div><Label>Capacity</Label><Input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
            </div>
            <div>
              <Label className="mb-2 block">Amenities</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_AMENITIES.map((a) => {
                  const on = form.amenities?.includes(a);
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleAmenity(a)}
                      className={`text-xs px-2 py-1 rounded-md border ${on ? 'bg-primary text-primary-foreground border-primary' : 'border-input'}`}
                    >{a}</button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive ?? true} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!form.name.trim() || !form.floor.trim() || form.capacity <= 0}>{editing ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
