/**
 * @file        src/pages/erp/taskflow/MeetingMinutesPage.tsx
 * @purpose     Meeting Minutes + spawn tasks from action items · S139 Block 4
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BookOpen, Plus, Sparkles, X } from 'lucide-react';
import {
  listMinutes, createMeetingMinutes, spawnTasksFromMinutes,
} from '@/lib/taskflow-workflow-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';

interface DraftItem {
  title: string;
  assigneeId: string;
  dueDate: string;
}

export default function MeetingMinutesPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const [minutes, setMinutes] = useState(() => listMinutes(entityCode));
  const refresh = useCallback((): void => { setMinutes(listMinutes(entityCode)); }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [heldAt, setHeldAt] = useState('');
  const [notes, setNotes] = useState('');
  const [attendees, setAttendees] = useState<string[]>([]);
  const [items, setItems] = useState<DraftItem[]>([]);

  const reset = (): void => {
    setTitle(''); setHeldAt(''); setNotes(''); setAttendees([]); setItems([]);
  };

  const save = (): void => {
    if (!title.trim()) { toast.error('Title required'); return; }
    if (!heldAt) { toast.error('Held-at date required'); return; }
    try {
      createMeetingMinutes(entityCode, {
        entityId: entityCode || 'e1',
        title, heldAt: new Date(heldAt).toISOString(),
        attendeeUserIds: attendees,
        notes,
        actionItems: items
          .filter((i) => i.title.trim() && i.assigneeId)
          .map((i) => ({ title: i.title.trim(), assigneeId: i.assigneeId, dueDate: i.dueDate ? new Date(i.dueDate).toISOString() : null })),
        createdByUserId: 'me',
      });
      toast.success('Minutes recorded');
      setOpen(false); reset(); refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  const nameFor = (id: string): string => employees.find((e) => e.id === id)?.displayName ?? id;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5" /> Meeting Minutes
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {minutes.length} meeting{minutes.length === 1 ? '' : 's'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Minutes</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Record meeting minutes</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2 max-h-[70vh] overflow-y-auto">
              <Label>Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Label>Held at *</Label>
              <Input type="datetime-local" value={heldAt} onChange={(e) => setHeldAt(e.target.value)} />
              <Label>Notes</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Label>Attendees</Label>
              <Select value="" onValueChange={(v) => {
                if (!v || attendees.includes(v)) return;
                setAttendees((a) => [...a, v]);
              }}>
                <SelectTrigger><SelectValue placeholder="Add attendee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {attendees.map((id) => (
                    <Badge key={id} variant="outline" className="cursor-pointer"
                      onClick={() => setAttendees((a) => a.filter((x) => x !== id))}>
                      {nameFor(id)} ×
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <Label>Action items</Label>
                <Button size="sm" variant="outline" className="gap-1"
                  onClick={() => setItems((s) => [...s, { title: '', assigneeId: '', dueDate: '' }])}>
                  <Plus className="h-3.5 w-3.5" /> Add item
                </Button>
              </div>
              {items.length > 0 && (
                <ul className="space-y-2">
                  {items.map((it, i) => (
                    <li key={`ai-${i}`} className="grid grid-cols-12 gap-2 items-center border border-border rounded-lg p-2">
                      <Input className="col-span-5" placeholder="Action…" value={it.title}
                        onChange={(e) => setItems((s) => s.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                      <Select value={it.assigneeId}
                        onValueChange={(v) => setItems((s) => s.map((x, idx) => idx === i ? { ...x, assigneeId: v } : x))}>
                        <SelectTrigger className="col-span-4"><SelectValue placeholder="Assignee" /></SelectTrigger>
                        <SelectContent>
                          {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Input className="col-span-2" type="date" value={it.dueDate}
                        onChange={(e) => setItems((s) => s.map((x, idx) => idx === i ? { ...x, dueDate: e.target.value } : x))} />
                      <Button size="sm" variant="ghost" className="col-span-1"
                        onClick={() => setItems((s) => s.filter((_, idx) => idx !== i))} aria-label="remove">
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
              <Button onClick={save}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {minutes.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No minutes recorded yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {[...minutes].reverse().map((m) => {
            const open = m.actionItems.filter((a) => !a.taskId).length;
            return (
              <Card key={m.id} className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{m.title}</span>
                    <Badge variant="outline" className="font-mono text-xs">{m.heldAt.slice(0, 10)}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground whitespace-pre-wrap text-xs">{m.notes || '—'}</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {m.attendeeUserIds.length} attendee{m.attendeeUserIds.length === 1 ? '' : 's'} · {m.actionItems.length} action item{m.actionItems.length === 1 ? '' : 's'}
                  </p>
                  {m.actionItems.length > 0 && (
                    <ul className="text-xs space-y-1">
                      {m.actionItems.map((a, i) => (
                        <li key={`${m.id}-ai-${i}`} className="flex items-center justify-between gap-2">
                          <span>• {a.title} → {nameFor(a.assigneeId)}{a.dueDate ? ` (${a.dueDate.slice(0,10)})` : ''}</span>
                          {a.taskId
                            ? <Badge variant="secondary" className="font-mono text-[10px]">spawned</Badge>
                            : <Badge variant="outline" className="font-mono text-[10px]">pending</Badge>}
                        </li>
                      ))}
                    </ul>
                  )}
                  {open > 0 && (
                    <div className="flex justify-end pt-2">
                      <Button size="sm" className="gap-2"
                        onClick={() => {
                          const spawned = spawnTasksFromMinutes(entityCode, m.id, 'me');
                          toast.success(`Spawned ${spawned.length} task${spawned.length === 1 ? '' : 's'}`);
                          refresh();
                        }}>
                        <Sparkles className="h-3.5 w-3.5" /> Spawn open ({open})
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
