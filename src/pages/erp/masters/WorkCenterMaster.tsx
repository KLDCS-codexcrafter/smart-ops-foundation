/**
 * WorkCenterMaster.tsx — Work Center master CRUD (D-575)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 */
import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Cog } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useWorkCenters } from '@/hooks/useWorkCenters';
import { useFactories } from '@/hooks/useFactories';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { WorkCenter, WorkCenterType, WorkCenterStatus } from '@/types/work-center';

const TYPES: WorkCenterType[] = ['machine_center', 'manual_station', 'inspection_point', 'job_work_external'];
const STATUSES: WorkCenterStatus[] = ['active', 'maintenance', 'breakdown', 'inactive'];

const empty = (entityCode: string): Omit<WorkCenter, 'id' | 'created_at' | 'updated_at'> => ({
  entity_id: entityCode,
  factory_id: '',
  code: '',
  name: '',
  type: 'machine_center',
  capacity_hours_per_shift: 8,
  setup_time_minutes: 15,
  efficiency_pct: 85,
  hourly_run_cost: 0,
  hourly_idle_cost: 0,
  department_id: null,
  parent_work_center_id: null,
  current_status: 'active',
  last_breakdown_at: null,
  next_maintenance_due: null,
  notes: '',
  created_by: 'current_user',
  updated_by: 'current_user',
});

export function WorkCenterMasterPanel() {
  const { entityCode } = useEntityCode();
  const { allFactories } = useFactories();
  const [factoryFilter, setFactoryFilter] = useState<string>('all');
  const { allWorkCenters, createWorkCenter, updateWorkCenter, deleteWorkCenter } = useWorkCenters();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WorkCenter | null>(null);
  const [form, setForm] = useState(() => empty(entityCode));

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allWorkCenters.filter(w => {
      if (factoryFilter !== 'all' && w.factory_id !== factoryFilter) return false;
      if (s && !w.name.toLowerCase().includes(s) && !w.code.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [allWorkCenters, search, factoryFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(empty(entityCode));
    setDialogOpen(true);
  };
  const openEdit = (w: WorkCenter) => {
    setEditing(w);
    const { id: _i, created_at: _c, updated_at: _u, ...rest } = w;
    void _i; void _c; void _u;
    setForm(rest);
    setDialogOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.factory_id) { toast.error('Factory required'); return; }
    try {
      if (editing) { updateWorkCenter(editing.id, form); toast.success('Updated'); }
      else { const c = createWorkCenter(form); toast.success(`Created ${c.code}`); }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };
  const onDelete = (w: WorkCenter) => {
    if (!window.confirm(`Delete ${w.code}?`)) return;
    if (deleteWorkCenter(w.id)) toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Cog className="h-5 w-5" /> Work Center Master</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Work Center</Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="pl-8" />
            </div>
            <Select value={factoryFilter} onValueChange={setFactoryFilter}>
              <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All factories</SelectItem>
                {allFactories.map(f => <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Factory</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Cap (hr/shift)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No work centers</TableCell></TableRow>
              ) : filtered.map(w => {
                const fac = allFactories.find(f => f.id === w.factory_id);
                return (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.code}</TableCell>
                    <TableCell>{w.name}</TableCell>
                    <TableCell className="text-xs">{fac?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{w.type}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{w.capacity_hours_per_shift}</TableCell>
                    <TableCell><Badge>{w.current_status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(w)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(w)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.code}` : 'New Work Center'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code (auto)</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="col-span-2">
              <Label>Factory *</Label>
              <Select value={form.factory_id} onValueChange={v => setForm({ ...form, factory_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick factory..." /></SelectTrigger>
                <SelectContent>
                  {allFactories.map(f => <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as WorkCenterType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.current_status} onValueChange={v => setForm({ ...form, current_status: v as WorkCenterStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Capacity hrs/shift</Label><Input type="number" value={form.capacity_hours_per_shift} onChange={e => setForm({ ...form, capacity_hours_per_shift: Number(e.target.value) })} /></div>
            <div><Label>Setup time (min)</Label><Input type="number" value={form.setup_time_minutes} onChange={e => setForm({ ...form, setup_time_minutes: Number(e.target.value) })} /></div>
            <div><Label>Efficiency %</Label><Input type="number" value={form.efficiency_pct} onChange={e => setForm({ ...form, efficiency_pct: Number(e.target.value) })} /></div>
            <div><Label>Run cost ₹/hr</Label><Input type="number" value={form.hourly_run_cost} onChange={e => setForm({ ...form, hourly_run_cost: Number(e.target.value) })} /></div>
            <div><Label>Idle cost ₹/hr</Label><Input type="number" value={form.hourly_idle_cost} onChange={e => setForm({ ...form, hourly_idle_cost: Number(e.target.value) })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
