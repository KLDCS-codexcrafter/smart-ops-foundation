/**
 * MachineMaster.tsx — Machine master CRUD (D-575)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 */
import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useMachines } from '@/hooks/useMachines';
import { useWorkCenters } from '@/hooks/useWorkCenters';
import { useFactories } from '@/hooks/useFactories';
import { useEntityCode } from '@/hooks/useEntityCode';
import { faUnitsKey, type AssetUnitRecord } from '@/types/fixed-asset';
import type { Machine, MachineStatus } from '@/types/machine';

const STATUSES: MachineStatus[] = ['running', 'idle', 'breakdown', 'maintenance', 'decommissioned'];

const empty = (entityCode: string): Omit<Machine, 'id' | 'created_at' | 'updated_at'> => ({
  entity_id: entityCode,
  factory_id: '',
  work_center_id: '',
  code: '',
  name: '',
  asset_tag: '',
  fixed_asset_id: null,
  manufacturer: '',
  model: '',
  serial_number: '',
  year_of_make: new Date().getFullYear(),
  capabilities: [],
  rated_capacity_per_hour: 0,
  rated_capacity_uom: 'units',
  setup_time_minutes: 0,
  current_status: 'idle',
  current_operator_employee_id: null,
  last_maintenance_at: null,
  next_maintenance_due: null,
  maintenance_interval_hours: 0,
  hourly_run_cost: 0,
  power_kw: 0,
  notes: '',
  created_by: 'current_user',
  updated_by: 'current_user',
});

export function MachineMasterPanel() {
  const { entityCode } = useEntityCode();
  const { allFactories } = useFactories();
  const { allWorkCenters } = useWorkCenters();
  const { allMachines, createMachine, updateMachine, deleteMachine } = useMachines();
  const [search, setSearch] = useState('');
  const [factoryFilter, setFactoryFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);
  const [form, setForm] = useState(() => empty(entityCode));
  const [capInput, setCapInput] = useState('');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allMachines.filter(m => {
      if (factoryFilter !== 'all' && m.factory_id !== factoryFilter) return false;
      if (s && !m.name.toLowerCase().includes(s) && !m.code.toLowerCase().includes(s)) return false;
      return true;
    });
  }, [allMachines, search, factoryFilter]);

  const wcsForFactory = useMemo(
    () => allWorkCenters.filter(w => !form.factory_id || w.factory_id === form.factory_id),
    [allWorkCenters, form.factory_id],
  );

  // D-NEW-M · Plant & Machinery fixed assets for dropdown
  const machineryAssets = useMemo<AssetUnitRecord[]>(() => {
    try {
      const raw = localStorage.getItem(faUnitsKey(entityCode));
      const all: AssetUnitRecord[] = raw ? JSON.parse(raw) : [];
      return all.filter(a => a.it_act_block === 'Plant & Machinery' && a.status === 'active');
    } catch { return []; }
  }, [entityCode]);

  const openNew = () => { setEditing(null); setForm(empty(entityCode)); setCapInput(''); setDialogOpen(true); };
  const openEdit = (m: Machine) => {
    setEditing(m);
    const { id: _i, created_at: _c, updated_at: _u, ...rest } = m;
    void _i; void _c; void _u;
    setForm(rest);
    setCapInput(m.capabilities.join(', '));
    setDialogOpen(true);
  };
  const save = () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.factory_id || !form.work_center_id) { toast.error('Factory + Work Center required'); return; }
    const capabilities = capInput.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const payload = { ...form, capabilities };
      if (editing) { updateMachine(editing.id, payload); toast.success('Updated'); }
      else { const c = createMachine(payload); toast.success(`Created ${c.code}`); }
      setDialogOpen(false);
    } catch (err) { toast.error((err as Error).message); }
  };
  const onDelete = (m: Machine) => {
    if (!window.confirm(`Delete ${m.code}?`)) return;
    if (deleteMachine(m.id)) toast.success('Deleted');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2"><Wrench className="h-5 w-5" /> Machine Master</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Machine</Button>
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
                <TableHead>Work Center</TableHead>
                <TableHead>Capabilities</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No machines</TableCell></TableRow>
              ) : filtered.map(m => {
                const fac = allFactories.find(f => f.id === m.factory_id);
                const wc = allWorkCenters.find(w => w.id === m.work_center_id);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.code}</TableCell>
                    <TableCell>{m.name}</TableCell>
                    <TableCell className="text-xs">{fac?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{wc?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{m.capabilities.slice(0, 3).join(', ')}{m.capabilities.length > 3 ? '…' : ''}</TableCell>
                    <TableCell><Badge>{m.current_status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.code}` : 'New Machine'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code (auto)</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>
            <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>Factory *</Label>
              <Select value={form.factory_id} onValueChange={v => setForm({ ...form, factory_id: v, work_center_id: '' })}>
                <SelectTrigger><SelectValue placeholder="Pick..." /></SelectTrigger>
                <SelectContent>{allFactories.map(f => <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Work Center *</Label>
              <Select value={form.work_center_id} onValueChange={v => setForm({ ...form, work_center_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick..." /></SelectTrigger>
                <SelectContent>{wcsForFactory.map(w => <SelectItem key={w.id} value={w.id}>{w.code} · {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Asset Tag</Label><Input value={form.asset_tag} onChange={e => setForm({ ...form, asset_tag: e.target.value })} /></div>
            <div>
              <Label>Linked Fixed Asset</Label>
              <Select
                value={form.fixed_asset_id ?? '__none__'}
                onValueChange={v => setForm({ ...form, fixed_asset_id: v === '__none__' ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {machineryAssets.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.asset_id} · {a.item_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.current_status} onValueChange={v => setForm({ ...form, current_status: v as MachineStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Manufacturer</Label><Input value={form.manufacturer} onChange={e => setForm({ ...form, manufacturer: e.target.value })} /></div>
            <div><Label>Model</Label><Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} /></div>
            <div><Label>Serial No</Label><Input value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} /></div>
            <div><Label>Year</Label><Input type="number" value={form.year_of_make} onChange={e => setForm({ ...form, year_of_make: Number(e.target.value) })} /></div>
            <div><Label>Rated Capacity / hr</Label><Input type="number" value={form.rated_capacity_per_hour} onChange={e => setForm({ ...form, rated_capacity_per_hour: Number(e.target.value) })} /></div>
            <div><Label>Capacity UOM</Label><Input value={form.rated_capacity_uom} onChange={e => setForm({ ...form, rated_capacity_uom: e.target.value })} /></div>
            <div><Label>Run cost ₹/hr</Label><Input type="number" value={form.hourly_run_cost} onChange={e => setForm({ ...form, hourly_run_cost: Number(e.target.value) })} /></div>
            <div><Label>Power (kW)</Label><Input type="number" value={form.power_kw} onChange={e => setForm({ ...form, power_kw: Number(e.target.value) })} /></div>
            <div className="col-span-2">
              <Label>Capabilities (comma-separated)</Label>
              <Input value={capInput} onChange={e => setCapInput(e.target.value)} placeholder="CNC milling, 3-axis, EDM" />
            </div>
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
