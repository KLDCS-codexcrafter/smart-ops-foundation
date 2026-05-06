/**
 * FactoryMaster.tsx — Factory / Plant / Unit master CRUD (D-575)
 * Sprint T-Phase-1.3-3-PlantOps-pre-1
 */
import { useState, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Factory as FactoryIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useFactories } from '@/hooks/useFactories';
import type { Factory, FactoryUnitType, FactoryStatus, ManufacturingConfig } from '@/types/factory';
import { buildFactoryAncestry } from '@/types/factory';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getAllTemplates } from '@/config/manufacturing-templates';

const UNIT_TYPES: FactoryUnitType[] = ['manufacturing', 'job_work', 'warehouse_only', 'hybrid'];
const STATUSES: FactoryStatus[] = ['active', 'inactive', 'planned', 'decommissioned'];

const emptyFactory = (entityCode: string): Omit<Factory, 'id' | 'created_at' | 'updated_at'> => ({
  entity_id: entityCode,
  code: '',
  name: '',
  unit_type: 'manufacturing',
  manufacturing_config: null,
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  pincode: '',
  country: 'India',
  latitude: null,
  longitude: null,
  factory_license_no: '',
  pollution_clearance_no: '',
  fire_safety_certificate: '',
  factory_gstin: '',
  parent_factory_id: null,
  primary_godown_id: null,
  primary_fg_godown_id: null,
  department_ids: [],
  status: 'active',
  notes: '',
  created_by: 'current_user',
  updated_by: 'current_user',
});

export function FactoryMasterPanel() {
  const { entityCode } = useEntityCode();
  const { allFactories, createFactory, updateFactory, deleteFactory } = useFactories();
  const templates = getAllTemplates();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unitTypeFilter, setUnitTypeFilter] = useState<string>('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Factory | null>(null);
  const [form, setForm] = useState(() => emptyFactory(entityCode));
  const [tab, setTab] = useState('identity');

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allFactories.filter(f => {
      if (s && !f.name.toLowerCase().includes(s) && !f.code.toLowerCase().includes(s)) return false;
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (unitTypeFilter !== 'all' && f.unit_type !== unitTypeFilter) return false;
      return true;
    });
  }, [allFactories, search, statusFilter, unitTypeFilter]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyFactory(entityCode));
    setTab('identity');
    setDialogOpen(true);
  };

  const openEdit = (f: Factory) => {
    setEditing(f);
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = f;
    void _id; void _c; void _u;
    setForm(rest);
    setTab('identity');
    setDialogOpen(true);
  };

  const save = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editing) {
        updateFactory(editing.id, form);
        toast.success(`Updated ${form.name}`);
      } else {
        const created = createFactory(form);
        toast.success(`Created ${created.code} · ${created.name}`);
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const onDelete = (f: Factory) => {
    if (!window.confirm(`Delete factory ${f.code}?`)) return;
    if (deleteFactory(f.id)) toast.success(`Deleted ${f.code}`);
  };

  const setConfigField = <K extends keyof ManufacturingConfig>(key: K, value: ManufacturingConfig[K]) => {
    setForm(prev => {
      const cfg: ManufacturingConfig = prev.manufacturing_config ?? {
        primary_template_id: '',
        secondary_template_id: null,
        industry_sector_template_id: null,
        enabled_modules: [],
        compliance_standards: [],
        costing_method: 'standard',
        production_model: 'mts',
        configured_at: new Date().toISOString(),
        configured_by: 'current_user',
      };
      return { ...prev, manufacturing_config: { ...cfg, [key]: value } };
    });
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FactoryIcon className="h-5 w-5" /> Factory Master
          </h2>
          <p className="text-xs text-muted-foreground">
            Multi-unit hierarchy · 4 unit types · embedded manufacturing config
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Add Factory</Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search code or name..."
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={unitTypeFilter} onValueChange={setUnitTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All unit types</SelectItem>
                {UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Unit Type</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No factories found · click Add Factory to create one
                  </TableCell>
                </TableRow>
              ) : filtered.map(f => {
                const ancestry = buildFactoryAncestry(allFactories, f.id);
                const parent = ancestry.length > 1 ? ancestry[ancestry.length - 2] : null;
                const tpl = f.manufacturing_config?.primary_template_id;
                return (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.code}</TableCell>
                    <TableCell>{f.name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{f.unit_type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{parent?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{tpl ?? <span className="text-muted-foreground">unconfigured</span>}</TableCell>
                    <TableCell><Badge>{f.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(f)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(f)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? `Edit ${editing.code}` : 'New Factory'}</DialogTitle></DialogHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="address">Address</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="config">Mfg Config</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code (auto if blank)</Label><Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="FAC-001" /></div>
                <div><Label>Name *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div>
                  <Label>Unit Type</Label>
                  <Select value={form.unit_type} onValueChange={v => setForm({ ...form, unit_type: v as FactoryUnitType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_TYPES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={v => setForm({ ...form, status: v as FactoryStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Parent Factory (multi-unit hierarchy · Q28=b unlimited depth)</Label>
                  <Select
                    value={form.parent_factory_id ?? '__root__'}
                    onValueChange={v => setForm({ ...form, parent_factory_id: v === '__root__' ? null : v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__root__">— Root (no parent)</SelectItem>
                      {allFactories.filter(f => f.id !== editing?.id).map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.code} · {f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label>Address Line 1</Label><Input value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })} /></div>
                <div className="col-span-2"><Label>Address Line 2</Label><Input value={form.address_line2} onChange={e => setForm({ ...form, address_line2: e.target.value })} /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div><Label>State</Label><Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
                <div><Label>Pincode</Label><Input value={form.pincode} onChange={e => setForm({ ...form, pincode: e.target.value })} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="compliance" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Factory License No (Factories Act 1948)</Label><Input value={form.factory_license_no} onChange={e => setForm({ ...form, factory_license_no: e.target.value })} /></div>
                <div><Label>Pollution Clearance No</Label><Input value={form.pollution_clearance_no} onChange={e => setForm({ ...form, pollution_clearance_no: e.target.value })} /></div>
                <div><Label>Fire Safety Certificate</Label><Input value={form.fire_safety_certificate} onChange={e => setForm({ ...form, fire_safety_certificate: e.target.value })} /></div>
                <div><Label>Factory GSTIN (if separate)</Label><Input value={form.factory_gstin} onChange={e => setForm({ ...form, factory_gstin: e.target.value })} /></div>
              </div>
            </TabsContent>

            <TabsContent value="config" className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Primary Template (Q22=a)</Label>
                  <Select
                    value={form.manufacturing_config?.primary_template_id ?? ''}
                    onValueChange={v => setConfigField('primary_template_id', v)}
                  >
                    <SelectTrigger><SelectValue placeholder="Pick template..." /></SelectTrigger>
                    <SelectContent>
                      {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name} · {t.category}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Costing Method</Label>
                  <Select
                    value={form.manufacturing_config?.costing_method ?? 'standard'}
                    onValueChange={v => setConfigField('costing_method', v as ManufacturingConfig['costing_method'])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['standard','actual','fifo','lifo','weighted_average'] as const).map(m =>
                        <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Production Model</Label>
                  <Select
                    value={form.manufacturing_config?.production_model ?? 'mts'}
                    onValueChange={v => setConfigField('production_model', v as ManufacturingConfig['production_model'])}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['mto','mts','eto','ato','hybrid'] as const).map(m =>
                        <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!form.manufacturing_config && (
                <p className="text-xs text-muted-foreground">Pick a template to enable manufacturing config (Q27=a · embedded inside Factory record).</p>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
