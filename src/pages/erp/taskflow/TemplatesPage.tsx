/**
 * @file        src/pages/erp/taskflow/TemplatesPage.tsx
 * @purpose     Task templates · list + create + delete + "spawn task" (S139 Block 4)
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice
 */
import { useEffect, useMemo, useState } from 'react';
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
import { FileStack, Plus, Trash2, Sparkles } from 'lucide-react';
import {
  listTemplates, createTemplate, deleteTemplate, createTaskFromTemplate,
} from '@/lib/taskflow-workflow-engine';
import type { TaskTemplate, TaskCategory, TaskPriority } from '@/types/taskflow';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';

const CATEGORIES: TaskCategory[] = [
  'operations','finance','compliance','hr','it','sales','marketing','support','general',
  'internal_audit','external_audit',
];
const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

export default function TemplatesPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const [tick, setTick] = useState(0);
  const refresh = (): void => setTick((t) => t + 1);
  const templates: TaskTemplate[] = useMemo(
    () => listTemplates(entityCode),
    [entityCode, tick], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', priority: 'medium' as TaskPriority,
    category: 'operations' as TaskCategory, estimatedHours: '',
    checklist: '',
  });
  useEffect(() => {
    if (!open) setForm({ name: '', description: '', priority: 'medium', category: 'operations', estimatedHours: '', checklist: '' });
  }, [open]);

  const save = (): void => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    try {
      createTemplate(entityCode, {
        name: form.name, description: form.description,
        category: form.category, priority: form.priority,
        checklistItems: form.checklist.split('\n').map((s) => s.trim()).filter(Boolean),
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : 0,
        createdBy: 'me',
      });
      toast.success('Template created');
      setOpen(false); refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <FileStack className="h-5 w-5" /> Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">
            {templates.length} template{templates.length === 1 ? '' : 's'}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Template</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Create template</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2 max-h-[70vh] overflow-y-auto">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Label>Description</Label>
              <Textarea rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TaskCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TaskPriority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Label>Estimated hours</Label>
              <Input type="number" min="0" step="0.5" value={form.estimatedHours}
                onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
              <Label>Checklist items (one per line)</Label>
              <Textarea rows={5} value={form.checklist}
                onChange={(e) => setForm({ ...form, checklist: e.target.value })}
                placeholder={'Gather invoices\nReconcile ledger\nSubmit report'} />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {templates.length === 0 ? (
        <Card className="rounded-2xl">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No templates yet. Create one to standardise repeated workstreams.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <TemplateCard key={t.id} t={t} employees={employees} entityCode={entityCode} onChange={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  t: TaskTemplate;
  employees: { id: string; displayName: string; empCode?: string }[];
  entityCode: string;
  onChange: () => void;
}
function TemplateCard({ t, employees, entityCode, onChange }: CardProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const spawn = (): void => {
    const u = employees.find((e) => e.id === assigneeId);
    try {
      const task = createTaskFromTemplate(
        entityCode, t.id,
        {
          assigneeId: assigneeId || null,
          assigneeName: u?.displayName ?? 'Unassigned',
          entityId: entityCode,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        },
        'me',
      );
      toast.success(`Task ${task.code} spawned`);
      setOpen(false); setAssigneeId(''); setDueDate(''); onChange();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Spawn failed');
    }
  };
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>{t.name}</span>
          <Badge variant="outline" className="font-mono text-xs">{t.category}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground whitespace-pre-wrap">{t.description || '—'}</p>
        <div className="flex items-center gap-2 flex-wrap text-xs font-mono">
          <Badge variant="secondary">{t.priority}</Badge>
          <Badge variant="outline">{t.estimatedHours}h</Badge>
          <Badge variant="outline">{t.checklistItems.length} items</Badge>
        </div>
        {t.checklistItems.length > 0 && (
          <ul className="text-xs list-disc pl-4 space-y-0.5 text-muted-foreground">
            {t.checklistItems.slice(0, 5).map((c, i) => <li key={`${t.id}-${i}`}>{c}</li>)}
            {t.checklistItems.length > 5 && <li>+{t.checklistItems.length - 5} more…</li>}
          </ul>
        )}
        <div className="flex gap-2 pt-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Sparkles className="h-3.5 w-3.5" /> Spawn task</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Spawn task from “{t.name}”</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <Label>Assignee</Label>
                <Select value={assigneeId} onValueChange={setAssigneeId}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Label>Due date</Label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={spawn}>Spawn</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="ghost" className="gap-2 text-destructive"
            onClick={() => {
              deleteTemplate(entityCode, t.id);
              toast.success('Template deleted');
              onChange();
            }}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
