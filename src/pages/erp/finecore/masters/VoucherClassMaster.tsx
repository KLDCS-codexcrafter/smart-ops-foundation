/**
 * @file     VoucherClassMaster.tsx — Sprint 2.7-b · Voucher class catalogue
 * @purpose  CRUD UI for NonFineCoreVoucherType records · groups by family ·
 *           edit field rules + approval thresholds + defaults.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription,
} from '@/components/ui/sheet';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Copy, Pencil, Trash2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  DEFAULT_NON_FINECORE_VOUCHER_TYPES,
  getNonFineCoreVoucherTypes,
  saveNonFineCoreVoucherTypes,
  type FieldRule,
  type NonFineCoreVoucherFamily,
  type NonFineCoreVoucherType,
} from '@/lib/non-finecore-voucher-type-registry';

const FAMILIES: NonFineCoreVoucherFamily[] = [
  'inventory_in', 'inventory_out', 'inventory_adjust',
  'sales_quote', 'sales_request', 'sales_invoice_memo',
  'sales_secondary', 'sales_sample', 'sales_demo', 'dispatch',
];

function blankRule(): FieldRule {
  return { field_path: '', field_label: '', rule: 'mandatory', enforce_on: 'posted' };
}

function blankType(family: NonFineCoreVoucherFamily): NonFineCoreVoucherType {
  return {
    id: `vt-custom-${Date.now()}`,
    family,
    display_name: 'New Voucher Class',
    prefix: 'VT',
    is_default: false,
    is_active: true,
    field_rules: [],
  };
}

export default function VoucherClassMaster() {
  const { entityCode } = useEntityCode();
  const [types, setTypes] = useState<NonFineCoreVoucherType[]>([]);
  const [editing, setEditing] = useState<NonFineCoreVoucherType | null>(null);

  const refresh = useCallback(() => {
    if (entityCode) setTypes(getNonFineCoreVoucherTypes(entityCode));
  }, [entityCode]);

  useEffect(() => { refresh(); }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<NonFineCoreVoucherFamily, NonFineCoreVoucherType[]>();
    FAMILIES.forEach(f => map.set(f, []));
    for (const t of types) {
      const list = map.get(t.family) ?? [];
      list.push(t);
      map.set(t.family, list);
    }
    return map;
  }, [types]);

  const persist = (next: NonFineCoreVoucherType[]) => {
    saveNonFineCoreVoucherTypes(entityCode, next);
    setTypes(next);
  };

  const onAdd = (family: NonFineCoreVoucherFamily) => {
    setEditing(blankType(family));
  };

  const onClone = (t: NonFineCoreVoucherType) => {
    const cloned: NonFineCoreVoucherType = {
      ...t,
      id: `vt-clone-${Date.now()}`,
      display_name: `${t.display_name} Copy`,
      is_default: false,
    };
    setEditing(cloned);
  };

  const onToggleActive = (t: NonFineCoreVoucherType) => {
    persist(types.map(x => (x.id === t.id ? { ...x, is_active: !x.is_active } : x)));
  };

  const onDelete = (t: NonFineCoreVoucherType) => {
    if (DEFAULT_NON_FINECORE_VOUCHER_TYPES.find(d => d.id === t.id)) {
      toast.error('Cannot delete a default voucher class · toggle inactive instead');
      return;
    }
    persist(types.filter(x => x.id !== t.id));
    toast.success('Voucher class removed');
  };

  const onSave = () => {
    if (!editing) return;
    if (!editing.display_name.trim() || !editing.prefix.trim()) {
      toast.error('Display name and prefix are required');
      return;
    }
    const exists = types.find(x => x.id === editing.id);
    const next = exists
      ? types.map(x => (x.id === editing.id ? editing : x))
      : [...types, editing];
    persist(next);
    setEditing(null);
    toast.success('Voucher class saved');
  };

  const updateRule = (idx: number, patch: Partial<FieldRule>) => {
    if (!editing) return;
    const rules = [...(editing.field_rules ?? [])];
    rules[idx] = { ...rules[idx], ...patch };
    setEditing({ ...editing, field_rules: rules });
  };

  const addRule = () => {
    if (!editing) return;
    setEditing({ ...editing, field_rules: [...(editing.field_rules ?? []), blankRule()] });
  };

  const removeRule = (idx: number) => {
    if (!editing) return;
    const rules = [...(editing.field_rules ?? [])];
    rules.splice(idx, 1);
    setEditing({ ...editing, field_rules: rules });
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6" /> Voucher Class Master
          </h1>
          <p className="text-sm text-muted-foreground">
            Per-voucher-type defaults · approval thresholds · mandatory field rules.
          </p>
        </div>
      </div>

      {FAMILIES.map(family => {
        const list = grouped.get(family) ?? [];
        return (
          <Card key={family}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base capitalize">
                {family.replace(/_/g, ' ')}
                <Badge variant="outline" className="ml-2 font-mono text-xs">{list.length}</Badge>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => onAdd(family)}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Threshold</TableHead>
                    <TableHead>Approver</TableHead>
                    <TableHead className="text-right">Rules</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.display_name}</TableCell>
                      <TableCell className="font-mono text-xs">{t.prefix}</TableCell>
                      <TableCell>{t.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}</TableCell>
                      <TableCell>
                        <Switch checked={t.is_active} onCheckedChange={() => onToggleActive(t)} />
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {t.approval_threshold_value ? `₹${t.approval_threshold_value.toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{t.approval_role ?? '—'}</TableCell>
                      <TableCell className="text-right font-mono">{t.field_rules?.length ?? 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditing({ ...t })}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => onClone(t)}><Copy className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => onDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <Sheet open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing?.display_name || 'New Voucher Class'}</SheetTitle>
            <SheetDescription>Configure identity, defaults, approval thresholds, and field rules.</SheetDescription>
          </SheetHeader>
          {editing && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Display Name</Label>
                  <Input value={editing.display_name} onChange={e => setEditing({ ...editing, display_name: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Prefix</Label>
                  <Input value={editing.prefix} onChange={e => setEditing({ ...editing, prefix: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Family</Label>
                <Select value={editing.family} onValueChange={(v: NonFineCoreVoucherFamily) => setEditing({ ...editing, family: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FAMILIES.map(f => <SelectItem key={f} value={f}>{f.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_default} onCheckedChange={v => setEditing({ ...editing, is_default: v })} />
                  <Label className="text-xs">Is Default</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                  <Label className="text-xs">Active</Label>
                </div>
              </div>
              <div>
                <Label className="text-xs">Default Terms</Label>
                <Textarea rows={2} value={editing.default_terms ?? ''} onChange={e => setEditing({ ...editing, default_terms: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Default Payment Terms</Label>
                <Input value={editing.default_payment_terms ?? ''} onChange={e => setEditing({ ...editing, default_payment_terms: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Approval Threshold (₹)</Label>
                  <Input
                    type="number"
                    value={editing.approval_threshold_value ?? ''}
                    onChange={e => setEditing({ ...editing, approval_threshold_value: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Approver Role</Label>
                  <Input value={editing.approval_role ?? ''} onChange={e => setEditing({ ...editing, approval_role: e.target.value })} />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Field Rules ({editing.field_rules?.length ?? 0})</Label>
                  <Button size="sm" variant="outline" onClick={addRule}><Plus className="h-3.5 w-3.5 mr-1" />Add Rule</Button>
                </div>
                <div className="space-y-2">
                  {(editing.field_rules ?? []).map((r, idx) => (
                    <Card key={`rule-${idx}`} className="p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="field_path" value={r.field_path} onChange={e => updateRule(idx, { field_path: e.target.value })} />
                        <Input placeholder="Field Label" value={r.field_label} onChange={e => updateRule(idx, { field_label: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <Select value={r.rule} onValueChange={(v: FieldRule['rule']) => updateRule(idx, { rule: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mandatory">mandatory</SelectItem>
                            <SelectItem value="optional">optional</SelectItem>
                            <SelectItem value="forbidden">forbidden</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={r.enforce_on} onValueChange={(v: FieldRule['enforce_on']) => updateRule(idx, { enforce_on: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="posted">posted</SelectItem>
                            <SelectItem value="always">always</SelectItem>
                            <SelectItem value="draft">draft</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          placeholder="min_length"
                          value={r.min_length ?? ''}
                          onChange={e => updateRule(idx, { min_length: e.target.value === '' ? undefined : Number(e.target.value) })}
                        />
                      </div>
                      <Input placeholder="custom_message (optional)" value={r.custom_message ?? ''} onChange={e => updateRule(idx, { custom_message: e.target.value })} />
                      <div className="flex justify-end">
                        <Button size="sm" variant="ghost" onClick={() => removeRule(idx)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
          <SheetFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSave}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
