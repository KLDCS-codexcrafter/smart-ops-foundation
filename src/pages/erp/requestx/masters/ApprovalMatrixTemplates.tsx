/**
 * @file        ApprovalMatrixTemplates.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block E2
 * @purpose     CRUD for per-entity approval matrix templates.
 * @[JWT]       GET/PUT erp_approval_matrix_templates_<entityCode>
 */
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { APPROVAL_MATRIX, type IndentVoucherKind } from '@/types/requisition-common';
import {
  approvalMatrixTemplatesKey,
  type ApprovalMatrixTemplate,
  type ApprovalTemplateTier,
} from '@/types/approval-matrix-template';
import { inrFmt } from '@/lib/requestx-report-engine';

const KIND_OPTIONS: Array<{ value: IndentVoucherKind | 'all'; label: string }> = [
  { value: 'all', label: 'All Kinds' },
  { value: 'material', label: 'Material' },
  { value: 'service', label: 'Service' },
  { value: 'capital', label: 'Capital' },
];

const seedFromHardcoded = (entityId: string): ApprovalMatrixTemplate[] => {
  const now = new Date().toISOString();
  const tiers: ApprovalTemplateTier[] = APPROVAL_MATRIX.map(t => ({
    tier_no: t.tier,
    threshold_min: t.min_value,
    threshold_max: t.max_value,
    required_approvals: t.required_approvals.map(r => ({
      role: r.role, avg_response_hours: r.avg_response_hours, is_mandatory: true,
    })),
  }));
  return (['material', 'service', 'capital'] as const).map((k, i) => ({
    id: `amt-default-${k}-${Date.now()}-${i}`,
    entity_id: entityId,
    voucher_kind: k,
    name: `${k.charAt(0).toUpperCase() + k.slice(1)} · Default Matrix`,
    is_default: true,
    is_active: true,
    tiers,
    created_at: now,
    updated_at: now,
  }));
};

export function ApprovalMatrixTemplatesPanel(): JSX.Element {
  const { entityCode, entityId } = useEntityCode();
  const [templates, setTemplates] = useState<ApprovalMatrixTemplate[]>([]);
  const [editing, setEditing] = useState<ApprovalMatrixTemplate | null>(null);

  useEffect(() => {
    // [JWT] GET /api/approval-matrix-templates?entityCode=...
    const key = approvalMatrixTemplatesKey(entityCode);
    const raw = localStorage.getItem(key);
    if (raw) {
      try { setTemplates(JSON.parse(raw) as ApprovalMatrixTemplate[]); return; } catch { /* fall through */ }
    }
    const seeded = seedFromHardcoded(entityId);
    setTemplates(seeded);
    // [JWT] POST /api/approval-matrix-templates/seed
    localStorage.setItem(key, JSON.stringify(seeded));
  }, [entityCode, entityId]);

  const persist = (next: ApprovalMatrixTemplate[]): void => {
    setTemplates(next);
    // [JWT] PUT /api/approval-matrix-templates
    localStorage.setItem(approvalMatrixTemplatesKey(entityCode), JSON.stringify(next));
  };

  const startCreate = (): void => {
    setEditing({
      id: `amt-${Date.now()}`,
      entity_id: entityId,
      voucher_kind: 'material',
      name: 'New Approval Matrix',
      is_default: false,
      is_active: true,
      tiers: [
        { tier_no: 1, threshold_min: 0, threshold_max: 50000, required_approvals: [{ role: 'Department Head', avg_response_hours: 4, is_mandatory: true }] },
        { tier_no: 2, threshold_min: 50001, threshold_max: 500000, required_approvals: [{ role: 'Purchase Manager', avg_response_hours: 12, is_mandatory: true }] },
        { tier_no: 3, threshold_min: 500001, threshold_max: Number.MAX_SAFE_INTEGER, required_approvals: [{ role: 'Finance Head', avg_response_hours: 24, is_mandatory: true }] },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  };

  const saveEditing = (): void => {
    if (!editing) return;
    const updated = { ...editing, updated_at: new Date().toISOString() };
    const next = templates.some(t => t.id === editing.id)
      ? templates.map(t => t.id === editing.id ? updated : t)
      : [...templates, updated];
    persist(next);
    setEditing(null);
    toast.success('Approval matrix saved');
  };

  const deleteTemplate = (id: string): void => {
    const t = templates.find(x => x.id === id);
    if (t?.is_default) { toast.error('Cannot delete default matrix'); return; }
    persist(templates.filter(x => x.id !== id));
    toast.success('Matrix deleted');
  };

  const grouped = useMemo(() => {
    const m = new Map<string, ApprovalMatrixTemplate[]>();
    for (const t of templates) {
      const arr = m.get(t.voucher_kind) ?? [];
      arr.push(t); m.set(t.voucher_kind, arr);
    }
    return Array.from(m.entries());
  }, [templates]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Approval Matrix Templates</h1>
          <p className="text-xs text-muted-foreground">
            Per-entity · per voucher kind · routing thresholds and required approvers.
          </p>
        </div>
        <Button onClick={startCreate}><Plus className="h-4 w-4 mr-2" /> New Matrix</Button>
      </div>

      {grouped.map(([kind, list]) => (
        <Card key={kind}>
          <CardHeader><CardTitle className="text-base capitalize">{kind} ({list.length})</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Tiers</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{t.name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.tiers.length}</TableCell>
                    <TableCell>{t.is_default && <Badge variant="outline" className="text-[10px]">Default</Badge>}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{t.is_active ? 'Active' : 'Inactive'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)} disabled={t.is_default}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {editing && (
        <Card className="border-primary">
          <CardHeader><CardTitle className="text-base">Edit Matrix</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Voucher Kind</Label>
                <Select value={editing.voucher_kind} onValueChange={v => setEditing({ ...editing, voucher_kind: v as IndentVoucherKind | 'all' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Tiers</Label>
              {editing.tiers.map((tier, idx) => (
                <div key={`tier-${tier.tier_no}`} className="grid grid-cols-4 gap-2 border rounded-md p-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Tier {tier.tier_no}</p>
                    <p className="font-mono">{inrFmt(tier.threshold_min)} – {tier.threshold_max === Number.MAX_SAFE_INTEGER ? '∞' : inrFmt(tier.threshold_max)}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-[10px] text-muted-foreground">Required approvals</p>
                    {tier.required_approvals.map((r, ri) => (
                      <div key={`tier-${tier.tier_no}-${ri}`} className="flex items-center gap-2 mt-1">
                        <Input
                          className="h-7"
                          value={r.role}
                          onChange={e => {
                            const next = [...editing.tiers];
                            next[idx] = { ...tier, required_approvals: tier.required_approvals.map((rr, rri) => rri === ri ? { ...rr, role: e.target.value } : rr) };
                            setEditing({ ...editing, tiers: next });
                          }}
                        />
                        <Input
                          className="h-7 w-20 font-mono"
                          type="number"
                          value={r.avg_response_hours}
                          onChange={e => {
                            const next = [...editing.tiers];
                            next[idx] = { ...tier, required_approvals: tier.required_approvals.map((rr, rri) => rri === ri ? { ...rr, avg_response_hours: Number(e.target.value) } : rr) };
                            setEditing({ ...editing, tiers: next });
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={saveEditing}>Save</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
