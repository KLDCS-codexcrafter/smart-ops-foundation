/**
 * SubstituteMaster.tsx — Approved substitute materials per item.
 * Sprint T-Phase-1.2.5
 */
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { Replace, Plus, Pencil, Trash2 } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useItemSubstitutes } from '@/hooks/useItemSubstitutes';
import type {
  ItemSubstitute, SubstituteApprovalStatus,
} from '@/types/item-substitute';
import type { InventoryItem } from '@/types/inventory-item';

const IKEY = 'erp_inventory_items';

function loadItems(): InventoryItem[] {
  try { return JSON.parse(localStorage.getItem(IKEY) || '[]'); } catch { return []; }
}

const BLANK = (entity: string): ItemSubstitute => ({
  id: '', entity_id: entity,
  primary_item_id: '', primary_item_code: '', primary_item_name: '',
  substitute_item_id: '', substitute_item_code: '', substitute_item_name: '',
  ratio: 1, scenarios: [], notes: null,
  approval_status: 'pending',
  approved_by_id: null, approved_by_name: null, approved_at: null,
  approval_doc_ref: null,
  effective_from: new Date().toISOString().slice(0, 10),
  effective_until: null,
  is_active: true,
  used_count: 0, last_used_at: null,
  created_at: '', updated_at: '',
});

export function SubstituteMasterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { subs, createSubstitute, updateSubstitute, deleteSubstitute } = useItemSubstitutes(safeEntity);

  const items = useMemo(() => loadItems(), []);
  const [form, setForm] = useState<ItemSubstitute>(BLANK(safeEntity));
  const [open, setOpen] = useState(false);
  const [scenarioInput, setScenarioInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubstituteApprovalStatus>('all');
  const [activeOnly, setActiveOnly] = useState(false);

  const filtered = subs.filter(s => {
    if (statusFilter !== 'all' && s.approval_status !== statusFilter) return false;
    if (activeOnly && !s.is_active) return false;
    return true;
  });

  const openNew = () => { setForm(BLANK(safeEntity)); setScenarioInput(''); setOpen(true); };
  const openEdit = (s: ItemSubstitute) => { setForm(s); setScenarioInput(s.scenarios.join(', ')); setOpen(true); };

  const setPrimary = (id: string) => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    setForm({ ...form, primary_item_id: id, primary_item_code: it.code, primary_item_name: it.name });
  };
  const setSubstitute = (id: string) => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    setForm({ ...form, substitute_item_id: id, substitute_item_code: it.code, substitute_item_name: it.name });
  };

  const handleSave = () => {
    if (!form.primary_item_id || !form.substitute_item_id) {
      toast.error('Both items required'); return;
    }
    if (form.primary_item_id === form.substitute_item_id) {
      toast.error('Primary and substitute must differ'); return;
    }
    if (form.ratio <= 0) { toast.error('Ratio must be > 0'); return; }
    const scenarios = scenarioInput.split(',').map(s => s.trim()).filter(Boolean);
    const now = new Date().toISOString();
    const payload = { ...form, scenarios };
    if (form.id) {
      updateSubstitute(form.id, payload);
    } else {
      createSubstitute({
        ...payload, id: `sub-${crypto.randomUUID()}`,
        created_at: now, updated_at: now,
      });
    }
    setOpen(false);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Replace className="h-5 w-5 text-cyan-500" />
          <h2 className="text-xl font-bold">Substitute Materials</h2>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> Add Substitute
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-44 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant={activeOnly ? 'default' : 'outline'} onClick={() => setActiveOnly(!activeOnly)} className="h-8">
          {activeOnly ? '✓ Active only' : 'Active only'}
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Primary</TableHead>
              <TableHead>Substitute</TableHead>
              <TableHead>Ratio</TableHead>
              <TableHead>Scenarios</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Used</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground text-sm py-6">No substitutes</TableCell></TableRow>
            )}
            {filtered.map(s => (
              <TableRow key={s.id}>
                <TableCell className="text-sm">{s.primary_item_name}</TableCell>
                <TableCell className="text-sm">{s.substitute_item_name}</TableCell>
                <TableCell className="font-mono text-xs">1 : {s.ratio}</TableCell>
                <TableCell className="text-xs">{s.scenarios.join(', ') || '—'}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{s.approval_status}</Badge></TableCell>
                <TableCell className="font-mono text-xs">{s.used_count}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(s)} className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteSubstitute(s.id)} className="h-7 w-7"><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{form.id ? 'Edit' : 'New'} Substitute</SheetTitle></SheetHeader>
          <div className="space-y-3 py-4">
            <div>
              <Label>Primary Item *</Label>
              <Select value={form.primary_item_id} onValueChange={setPrimary}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {items.map(i => <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Substitute Item *</Label>
              <Select value={form.substitute_item_id} onValueChange={setSubstitute}>
                <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>
                  {items.filter(i => i.id !== form.primary_item_id).map(i =>
                    <SelectItem key={i.id} value={i.id}>{i.code} — {i.name}</SelectItem>,
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ratio (1 primary = ratio substitute)</Label>
              <Input type="number" step="0.01" value={form.ratio} onChange={e => setForm({ ...form, ratio: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Scenarios (comma separated)</Label>
              <Input value={scenarioInput} onChange={e => setScenarioInput(e.target.value)} placeholder="production, maintenance, export" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Approval Status</Label>
                <Select value={form.approval_status} onValueChange={v => setForm({ ...form, approval_status: v as SubstituteApprovalStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Approval Doc Ref</Label>
                <Input value={form.approval_doc_ref ?? ''} onChange={e => setForm({ ...form, approval_doc_ref: e.target.value || null })} />
              </div>
              <div>
                <Label>Approved By</Label>
                <Input value={form.approved_by_name ?? ''} onChange={e => setForm({ ...form, approved_by_name: e.target.value || null })} />
              </div>
              <div>
                <Label>Effective From</Label>
                <Input type="date" value={form.effective_from} onChange={e => setForm({ ...form, effective_from: e.target.value })} />
              </div>
              <div>
                <Label>Effective Until</Label>
                <Input type="date" value={form.effective_until ?? ''} onChange={e => setForm({ ...form, effective_until: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea rows={2} value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value || null })} />
            </div>
          </div>
          <SheetFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
