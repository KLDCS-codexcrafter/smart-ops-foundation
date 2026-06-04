/**
 * @file        src/pages/erp/taskflow/WorkflowsPage.tsx
 * @purpose     Task workflows · sequential stages · S139 Block 4
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Workflow, Plus, Trash2, X } from 'lucide-react';
import {
  listWorkflows, createWorkflow, deleteWorkflow,
} from '@/lib/taskflow-workflow-engine';
import type { TaskWorkflowStage } from '@/types/taskflow';
import { useEntityCode } from '@/hooks/useEntityCode';

const STAGE_TYPES: TaskWorkflowStage['type'][] = ['task', 'approval', 'review', 'notification'];

export default function WorkflowsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [workflows, setWorkflows] = useState(() => listWorkflows(entityCode));
  const refresh = useCallback((): void => { setWorkflows(listWorkflows(entityCode)); }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [stages, setStages] = useState<Omit<TaskWorkflowStage, 'id'>[]>([
    { name: 'Prepare', order: 1, type: 'task', autoTransition: false },
  ]);

  const addStage = (): void => {
    setStages((s) => [...s, { name: `Stage ${s.length + 1}`, order: s.length + 1, type: 'task', autoTransition: false }]);
  };
  const updateStage = (i: number, patch: Partial<Omit<TaskWorkflowStage, 'id'>>): void => {
    setStages((s) => s.map((st, idx) => idx === i ? { ...st, ...patch } : st));
  };
  const removeStage = (i: number): void => {
    setStages((s) => s.filter((_, idx) => idx !== i).map((st, idx) => ({ ...st, order: idx + 1 })));
  };

  const save = (): void => {
    if (!name.trim()) { toast.error('Name required'); return; }
    if (stages.length === 0) { toast.error('At least one stage'); return; }
    try {
      createWorkflow(entityCode, { name, stages });
      toast.success('Workflow created');
      setOpen(false); setName('');
      setStages([{ name: 'Prepare', order: 1, type: 'task', autoTransition: false }]);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Workflow className="h-5 w-5" /> Workflows
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {workflows.length} workflow{workflows.length === 1 ? '' : 's'} · stages materialize as checklist items
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> New Workflow</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Create workflow</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2 max-h-[70vh] overflow-y-auto">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Vendor payment approval" />
              <div className="flex items-center justify-between mt-2">
                <Label>Stages</Label>
                <Button size="sm" variant="outline" onClick={addStage} className="gap-1">
                  <Plus className="h-3.5 w-3.5" /> Add stage
                </Button>
              </div>
              <ul className="space-y-2">
                {stages.map((s, i) => (
                  <li key={`stg-${i}`} className="grid grid-cols-12 gap-2 items-center border border-border rounded-lg p-2">
                    <span className="col-span-1 font-mono text-xs text-muted-foreground">#{i + 1}</span>
                    <Input className="col-span-5" value={s.name}
                      onChange={(e) => updateStage(i, { name: e.target.value })} />
                    <Select value={s.type} onValueChange={(v) => updateStage(i, { type: v as TaskWorkflowStage['type'] })}>
                      <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <label className="col-span-2 flex items-center gap-1 text-xs">
                      <input type="checkbox" checked={s.autoTransition}
                        onChange={(e) => updateStage(i, { autoTransition: e.target.checked })} />
                      auto
                    </label>
                    <Button size="sm" variant="ghost" className="col-span-1"
                      onClick={() => removeStage(i)} aria-label="remove">
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                Note: <span className="font-mono">autoTransition</span> is recorded but not executed client-side
                (server scheduler is future · TF-13 / B.4).
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {workflows.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No workflows yet. Build one to standardise multi-stage processes.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {workflows.map((w) => (
            <Card key={w.id} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span>{w.name}</span>
                  <Badge variant={w.isActive ? 'secondary' : 'outline'}>{w.isActive ? 'active' : 'inactive'}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ol className="space-y-1 text-sm">
                  {[...w.stages].sort((a, b) => a.order - b.order).map((s) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-[10px]">#{s.order}</Badge>
                      <span>{s.name}</span>
                      <Badge variant="secondary" className="text-[10px]">{s.type}</Badge>
                      {s.autoTransition && <Badge variant="outline" className="text-[10px]">auto</Badge>}
                    </li>
                  ))}
                </ol>
                <div className="flex justify-end pt-2">
                  <Button size="sm" variant="ghost" className="gap-2 text-destructive"
                    onClick={() => { deleteWorkflow(entityCode, w.id); toast.success('Workflow deleted'); refresh(); }}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
