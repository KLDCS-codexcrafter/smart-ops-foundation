/**
 * @file        src/pages/erp/taskflow/ApprovalChainsPage.tsx
 * @purpose     S138 Governance · approval chain CRUD (TF-3)
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Block 4
 * @decisions   Steps editor with employee picker (useEmployees SSOT · FR-44)
 */
import { useState } from 'react';
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
import { Plus, Trash2, X } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEmployees } from '@/hooks/useEmployees';
import {
  listApprovalChains, upsertApprovalChain, deleteApprovalChain,
} from '@/lib/taskflow-governance-engine';
import type { TaskApprovalChain, TaskCategory } from '@/types/taskflow';

const CATEGORIES: TaskCategory[] = [
  'operations','finance','compliance','hr','it','sales','marketing','support','general',
  'internal_audit','external_audit',
];

const newId = (): string => `chain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
const emptyChain = (): TaskApprovalChain => ({
  id: newId(), name: '', steps: [], isDefault: false,
});

export default function ApprovalChainsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const { employees } = useEmployees();
  const [chains, setChains] = useState<TaskApprovalChain[]>(() => listApprovalChains(entityCode));
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TaskApprovalChain>(() => emptyChain());

  const refresh = (): void => setChains(listApprovalChains(entityCode));

  const addStep = (): void => {
    setDraft({
      ...draft,
      steps: [...draft.steps, { approverId: '', order: draft.steps.length + 1 }],
    });
  };
  const removeStep = (i: number): void => {
    const next = draft.steps.filter((_, idx) => idx !== i)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    setDraft({ ...draft, steps: next });
  };

  const save = (): void => {
    try {
      if (draft.steps.some((s) => !s.approverId)) {
        toast.error('Every step needs an approver'); return;
      }
      upsertApprovalChain(entityCode, draft);
      toast.success(`Chain '${draft.name}' saved`);
      setOpen(false);
      setDraft(emptyChain());
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  const remove = (id: string): void => {
    deleteApprovalChain(entityCode, id);
    refresh();
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Approval Chains</h1>
          <p className="text-sm text-muted-foreground">
            Sequential approval flows · drives task lifecycle from in_review → approved/rejected.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDraft(emptyChain()); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New chain</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>New approval chain</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2">
              <Label>Name *</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category scope</Label>
                  <Select value={draft.categoryId ?? 'any'}
                    onValueChange={(v) => setDraft({ ...draft, categoryId: v === 'any' ? undefined : v as TaskCategory })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Switch id="def" checked={draft.isDefault}
                    onCheckedChange={(v) => setDraft({ ...draft, isDefault: v })} />
                  <Label htmlFor="def">Default chain</Label>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Steps ({draft.steps.length})</Label>
                  <Button size="sm" variant="outline" onClick={addStep}>+ Step</Button>
                </div>
                {draft.steps.length === 0 && (
                  <p className="text-xs text-muted-foreground">Add at least one step.</p>
                )}
                <ul className="space-y-2">
                  {draft.steps.map((s, i) => (
                    <li key={`step-${i}`} className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono">#{s.order}</Badge>
                      <Select value={s.approverId}
                        onValueChange={(v) => {
                          const next = draft.steps.slice();
                          next[i] = { ...next[i], approverId: v };
                          setDraft({ ...draft, steps: next });
                        }}>
                        <SelectTrigger className="flex-1"><SelectValue placeholder="Approver" /></SelectTrigger>
                        <SelectContent>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>{e.displayName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button size="sm" variant="ghost" onClick={() => removeStep(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Chains ({chains.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {chains.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No approval chains yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {chains.map((c) => (
                <li key={c.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{c.name}</p>
                      {c.isDefault && <Badge variant="secondary">Default</Badge>}
                      {c.categoryId && <Badge variant="outline">{c.categoryId}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {c.steps.length} step(s) · {c.steps.map((s) => `#${s.order}`).join(' → ')}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => remove(c.id)} className="gap-1">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
