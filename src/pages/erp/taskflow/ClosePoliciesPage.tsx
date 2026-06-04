/**
 * @file        src/pages/erp/taskflow/ClosePoliciesPage.tsx
 * @purpose     S141 · TF-29d evidence-mandatory close policies (per category).
 * @sprint      Sprint 141 · T-TaskFlow-A641.5 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listClosePolicies, upsertClosePolicy,
} from '@/lib/taskflow-accountability-engine';
import type { TaskCategory, TaskClosePolicy } from '@/types/taskflow';

const CATEGORIES: TaskCategory[] = [
  'operations', 'finance', 'compliance', 'hr', 'it', 'sales',
  'marketing', 'support', 'general', 'internal_audit', 'external_audit',
];

export default function ClosePoliciesPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [policies, setPolicies] = useState<TaskClosePolicy[]>([]);
  const [form, setForm] = useState({
    category: 'compliance' as TaskCategory,
    requireEvidence: true,
    minEvidenceCount: 1,
    isActive: true,
  });

  const refresh = useCallback(() => {
    setPolicies(listClosePolicies(entityCode));
  }, [entityCode]);
  useEffect(() => { refresh(); }, [refresh]);

  const save = (): void => {
    try {
      upsertClosePolicy(entityCode, {
        entityId: entityCode || 'default',
        category: form.category,
        requireEvidence: form.requireEvidence,
        minEvidenceCount: form.minEvidenceCount,
        isActive: form.isActive,
      });
      toast.success(`Policy saved for ${form.category}`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Close Policies</h1>
        <p className="text-sm text-muted-foreground">
          Evidence-mandatory completion gates per category (TF-29d).
        </p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Upsert policy</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-5 gap-3 items-end">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as TaskCategory })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.requireEvidence}
              onCheckedChange={(v) => setForm({ ...form, requireEvidence: v })} />
            <Label className="text-xs">Require evidence</Label>
          </div>
          <div>
            <Label className="text-xs">Min count</Label>
            <Input type="number" min={1} value={form.minEvidenceCount}
              onChange={(e) => setForm({ ...form, minEvidenceCount: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            <Label className="text-xs">Active</Label>
          </div>
          <Button onClick={save}>Save</Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader><CardTitle className="text-base">Current policies</CardTitle></CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No policies configured.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Require evidence</TableHead>
                  <TableHead className="text-right">Min count</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.category}</TableCell>
                    <TableCell>{p.requireEvidence ? 'Yes' : 'No'}</TableCell>
                    <TableCell className="text-right font-mono">{p.minEvidenceCount}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'default' : 'outline'}>
                        {p.isActive ? 'active' : 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{p.updatedAt.slice(0, 16)}</TableCell>
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
