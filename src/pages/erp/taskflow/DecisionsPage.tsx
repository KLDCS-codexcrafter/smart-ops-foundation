/**
 * @file        src/pages/erp/taskflow/DecisionsPage.tsx
 * @purpose     Decision Register · TF-32 · S139 Block 4
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Gavel, Plus } from 'lucide-react';
import { listDecisions, recordDecision } from '@/lib/taskflow-workflow-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';

export default function DecisionsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const [decisions, setDecisions] = useState(() => listDecisions(entityCode));
  const refresh = useCallback((): void => { setDecisions(listDecisions(entityCode)); }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    decision: '', context: '', decidedByUserId: '', presentUserIds: [] as string[],
  });

  const save = (): void => {
    if (!form.decision.trim()) { toast.error('Decision text required'); return; }
    if (!form.decidedByUserId) { toast.error('Pick a decider'); return; }
    try {
      recordDecision(entityCode, {
        entityId: entityCode || 'e1',
        decision: form.decision,
        context: form.context || null,
        decidedByUserId: form.decidedByUserId,
        presentUserIds: form.presentUserIds,
      });
      toast.success('Decision recorded');
      setOpen(false);
      setForm({ decision: '', context: '', decidedByUserId: '', presentUserIds: [] });
      refresh();
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
            <Gavel className="h-5 w-5" /> Decision Register
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {decisions.length} recorded decision{decisions.length === 1 ? '' : 's'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Record Decision</Button></DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Record decision</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <Label>Decision *</Label>
              <Textarea rows={3} value={form.decision}
                onChange={(e) => setForm({ ...form, decision: e.target.value })}
                placeholder="What was decided…" />
              <Label>Context</Label>
              <Textarea rows={2} value={form.context}
                onChange={(e) => setForm({ ...form, context: e.target.value })} />
              <Label>Decided by *</Label>
              <Select value={form.decidedByUserId} onValueChange={(v) => setForm({ ...form, decidedByUserId: v })}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
              <Label>Add present attendee</Label>
              <Select value="" onValueChange={(v) => {
                if (!v || form.presentUserIds.includes(v)) return;
                setForm((f) => ({ ...f, presentUserIds: [...f.presentUserIds, v] }));
              }}>
                <SelectTrigger><SelectValue placeholder="Pick attendee…" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
              {form.presentUserIds.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.presentUserIds.map((id) => (
                    <Badge key={id} variant="outline" className="cursor-pointer"
                      onClick={() => setForm((f) => ({ ...f, presentUserIds: f.presentUserIds.filter((x) => x !== id) }))}>
                      {nameFor(id)} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Record</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {decisions.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No decisions recorded yet.
          </CardContent>
        </Card>
      ) : (
        <Card className="rounded-2xl">
          <CardHeader><CardTitle className="text-base">Decisions</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {[...decisions].reverse().map((d) => (
                <li key={d.id} className="py-3 space-y-1">
                  <p className="text-sm font-medium">{d.decision}</p>
                  {d.context && <p className="text-xs text-muted-foreground">{d.context}</p>}
                  <p className="text-xs font-mono text-muted-foreground">
                    {d.decidedAt} · by {nameFor(d.decidedByUserId)}
                    {d.presentUserIds.length > 0 && ` · present: ${d.presentUserIds.map(nameFor).join(', ')}`}
                  </p>
                  {d.linkedTaskIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {d.linkedTaskIds.map((tid) => (
                        <Badge key={tid} variant="outline" className="font-mono text-[10px]">{tid}</Badge>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
