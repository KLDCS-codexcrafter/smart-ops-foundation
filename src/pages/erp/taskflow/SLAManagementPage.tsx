/**
 * @file        src/pages/erp/taskflow/SLAManagementPage.tsx
 * @purpose     S138 Governance · SLA rules CRUD + specificity preview
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Block 4
 * @decisions   Specificity: Category+Priority > Category > Priority > global (preview-only)
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listSLARules, upsertSLARule } from '@/lib/taskflow-governance-engine';
import type { TaskSLARule, TaskCategory, TaskPriority } from '@/types/taskflow';

const CATEGORIES: TaskCategory[] = [
  'operations','finance','compliance','hr','it','sales','marketing','support','general',
  'internal_audit','external_audit',
];
const PRIORITIES: TaskPriority[] = ['critical', 'high', 'medium', 'low'];
const ESCALATE_TO: TaskSLARule['escalateTo'][] = ['manager', 'dept_head', 'admin'];

const newId = (): string => `sla-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export default function SLAManagementPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [rules, setRules] = useState<TaskSLARule[]>(() => listSLARules(entityCode));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TaskSLARule>({
    id: newId(), name: '', category: undefined, priority: undefined,
    maxHours: 24, escalateAfterHours: 12, escalateTo: 'manager', isActive: true,
  });

  const refresh = (): void => setRules(listSLARules(entityCode));

  const submit = (): void => {
    try {
      upsertSLARule(entityCode, form);
      toast.success(`SLA rule '${form.name}' saved`);
      setOpen(false);
      setForm({ id: newId(), name: '', category: undefined, priority: undefined,
        maxHours: 24, escalateAfterHours: 12, escalateTo: 'manager', isActive: true });
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const toggleActive = (r: TaskSLARule): void => {
    upsertSLARule(entityCode, { ...r, isActive: !r.isActive });
    refresh();
  };

  const sorted = useMemo(() => {
    const specificity = (r: TaskSLARule): number =>
      (r.category ? 2 : 0) + (r.priority ? 1 : 0);
    return [...rules].sort((a, b) => specificity(b) - specificity(a));
  }, [rules]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SLA Rules</h1>
          <p className="text-sm text-muted-foreground">
            Specificity: Category+Priority &gt; Category &gt; Priority &gt; global.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New SLA rule</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category ?? 'any'}
                    onValueChange={(v) => setForm({ ...form, category: v === 'any' ? undefined : v as TaskCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority ?? 'any'}
                    onValueChange={(v) => setForm({ ...form, priority: v === 'any' ? undefined : v as TaskPriority })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Max hours *</Label>
                  <Input type="number" value={form.maxHours}
                    onChange={(e) => setForm({ ...form, maxHours: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Escalate after (h)</Label>
                  <Input type="number" value={form.escalateAfterHours}
                    onChange={(e) => setForm({ ...form, escalateAfterHours: Number(e.target.value) })} />
                </div>
              </div>
              <Label>Escalate to</Label>
              <Select value={form.escalateTo}
                onValueChange={(v) => setForm({ ...form, escalateTo: v as TaskSLARule['escalateTo'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ESCALATE_TO.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Rules ({sorted.length})</CardTitle></CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No SLA rules yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="font-mono text-right">Max h</TableHead>
                  <TableHead className="font-mono text-right">Esc after</TableHead>
                  <TableHead>Escalate to</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell><Badge variant="outline">{r.category ?? 'any'}</Badge></TableCell>
                    <TableCell><Badge variant="outline">{r.priority ?? 'any'}</Badge></TableCell>
                    <TableCell className="font-mono text-right">{r.maxHours}</TableCell>
                    <TableCell className="font-mono text-right">{r.escalateAfterHours}</TableCell>
                    <TableCell><Badge variant="secondary">{r.escalateTo}</Badge></TableCell>
                    <TableCell><Switch checked={r.isActive} onCheckedChange={() => toggleActive(r)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
