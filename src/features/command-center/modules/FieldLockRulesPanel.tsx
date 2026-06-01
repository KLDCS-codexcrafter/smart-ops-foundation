/**
 * FieldLockRulesPanel — Sprint 98 Block 3 · CC "Lock Rules" panel
 * Lists (master_type, field) rules; lets admin add/edit/delete with
 * audit trail via field-lock-metadata-engine.
 */
import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Lock, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadFieldLockRules, upsertRule, deleteRule,
  type FieldLockRule, type LockMode,
} from '@/lib/field-lock-metadata-engine';
import { ALL_MASTER_TYPES, type MasterType } from '@/lib/master-replication-engine';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';

const FALLBACK_ACTOR = 'system';

const MODE_LABEL: Record<LockMode, string> = {
  locked: 'Locked',
  overrideable: 'Overrideable',
  request_approval: 'Requires Approval',
};

const MODE_CLASS: Record<LockMode, string> = {
  locked: 'text-destructive',
  overrideable: 'text-success',
  request_approval: 'text-warning',
};

interface FormState {
  id?: string;
  master_type: MasterType;
  field_path: string;
  field_label: string;
  mode: LockMode;
  reason: string;
}

const emptyForm = (): FormState => ({
  master_type: 'customer',
  field_path: '',
  field_label: '',
  mode: 'locked',
  reason: '',
});

export function FieldLockRulesPanel() {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? FALLBACK_ACTOR;
  const [rules, setRules] = useState<FieldLockRule[]>(() => loadFieldLockRules());
  const [editing, setEditing] = useState<FormState | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<MasterType, FieldLockRule[]>();
    for (const r of rules) {
      if (!m.has(r.master_type)) m.set(r.master_type, []);
      m.get(r.master_type)!.push(r);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rules]);

  function save() {
    if (!editing) return;
    if (!editing.field_path.trim() || !editing.field_label.trim()) {
      toast.error('Field path and label are required');
      return;
    }
    const next = upsertRule({
      rule: {
        id: editing.id,
        master_type: editing.master_type,
        field_path: editing.field_path.trim(),
        field_label: editing.field_label.trim(),
        mode: editing.mode,
        reason: editing.reason.trim() || undefined,
        updated_by: userId,
      },
      actor: userId,
      entity_code: entityCode || 'GLOBAL',
    });
    setRules(loadFieldLockRules());
    setEditing(null);
    toast.success(`Rule saved · ${next.master_type}.${next.field_path}`);
  }

  function remove(r: FieldLockRule) {
    if (!confirm(`Delete rule for ${r.master_type}.${r.field_path}?`)) return;
    deleteRule({ rule_id: r.id, actor: userId, entity_code: entityCode || 'GLOBAL' });
    setRules(loadFieldLockRules());
    toast.success('Rule deleted');
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> Field Lock Rules
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Governs whether sibling entities may override a group-master field.
            Locked · overrideable · requires approval.
          </p>
        </div>
        <Button onClick={() => setEditing(emptyForm())}>
          <Plus className="w-4 h-4 mr-1" /> New Rule
        </Button>
      </div>

      {grouped.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No field-lock rules configured.
        </CardContent></Card>
      )}

      {grouped.map(([mt, list]) => (
        <Card key={mt}>
          <CardContent className="p-4">
            <div className="font-mono text-xs uppercase text-muted-foreground mb-2">
              {mt} · {list.length} rule{list.length === 1 ? '' : 's'}
            </div>
            <div className="divide-y divide-border">
              {list.map((r) => (
                <div key={r.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {r.field_label}{' '}
                      <span className="font-mono text-xs text-muted-foreground">({r.field_path})</span>
                    </div>
                    {r.reason && (
                      <div className="text-xs text-muted-foreground truncate">{r.reason}</div>
                    )}
                  </div>
                  <span className={`text-xs font-mono uppercase ${MODE_CLASS[r.mode]}`}>
                    {MODE_LABEL[r.mode]}
                  </span>
                  <Button size="icon" variant="ghost" onClick={() => setEditing({
                    id: r.id, master_type: r.master_type, field_path: r.field_path,
                    field_label: r.field_label, mode: r.mode, reason: r.reason ?? '',
                  })}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(r)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit' : 'New'} Field Lock Rule</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Master Type</Label>
                <Select
                  value={editing.master_type}
                  onValueChange={(v) => setEditing({ ...editing, master_type: v as MasterType })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_MASTER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Field Path</Label>
                <Input
                  value={editing.field_path}
                  onChange={(e) => setEditing({ ...editing, field_path: e.target.value })}
                  placeholder="e.g. gstin or address.line1"
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Field Label</Label>
                <Input
                  value={editing.field_label}
                  onChange={(e) => setEditing({ ...editing, field_label: e.target.value })}
                  placeholder="e.g. GSTIN"
                />
              </div>
              <div>
                <Label>Lock Mode</Label>
                <Select
                  value={editing.mode}
                  onValueChange={(v) => setEditing({ ...editing, mode: v as LockMode })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="locked">Locked</SelectItem>
                    <SelectItem value="overrideable">Overrideable</SelectItem>
                    <SelectItem value="request_approval">Requires Approval</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reason (optional)</Label>
                <Input
                  value={editing.reason}
                  onChange={(e) => setEditing({ ...editing, reason: e.target.value })}
                  placeholder="Why this lock?"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
