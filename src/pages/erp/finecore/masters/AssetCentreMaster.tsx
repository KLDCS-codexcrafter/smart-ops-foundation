/**
 * AssetCentreMaster.tsx — FineCore Asset Centre master
 * Sprint T-Phase-1.1.2-pre · D-218 two-master architecture (Asset Centre)
 *
 * Two surfaces:
 *  - AssetCentreMasterPanel — embedded inside Command Center
 *  - AssetCentreMasterPage  — standalone route at /erp/finecore/masters/asset-centres
 */
import { useMemo, useState, useEffect } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Lock, Plus, Edit2, Trash2, Search, Building2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { useAssetCentres } from '@/hooks/useAssetCentres';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import type { AssetCentre, AssetCentreCategory } from '@/types/finecore/asset-centre';
import { ASSET_CENTRE_CATEGORY_LABELS, assetCentresKey, ASSET_CENTRE_SEQ_KEY } from '@/types/finecore/asset-centre';
import { DEMO_ASSET_CENTRES } from '@/data/demo-asset-centres';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

interface FormState {
  name: string;
  category: AssetCentreCategory;
  parent_asset_centre_id: string | null;
  division_id: string | null;
  department_id: string | null;
  location: string;
  custodian_name: string;
  custodian_email: string;
  status: 'active' | 'inactive';
  description: string;
  entity_id: string | null;
}

const BLANK: FormState = {
  name: '', category: 'plant_machinery', parent_asset_centre_id: null,
  division_id: null, department_id: null, location: '',
  custodian_name: '', custodian_email: '',
  status: 'active', description: '', entity_id: null,
};

export function AssetCentreMasterPanel() {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const { centres, createAssetCentre, updateAssetCentre, deleteAssetCentre, toggleActive, refresh } =
    useAssetCentres(entityCode);
  const { divisions, departments } = useOrgStructure();

  const [search, setSearch] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<AssetCentre | null>(null);
  const [form, setForm] = useState<FormState>(BLANK);
  const [delTarget, setDelTarget] = useState<AssetCentre | null>(null);

  useEffect(() => {
    if (sheetOpen) {
      if (editing) {
        setForm({
          name: editing.name, category: editing.category,
          parent_asset_centre_id: editing.parent_asset_centre_id,
          division_id: editing.division_id, department_id: editing.department_id,
          location: editing.location, custodian_name: editing.custodian_name,
          custodian_email: editing.custodian_email, status: editing.status,
          description: editing.description, entity_id: editing.entity_id,
        });
      } else {
        setForm(BLANK);
      }
    }
  }, [sheetOpen, editing]);

  const stats = useMemo(() => {
    const active = centres.filter(c => c.status === 'active').length;
    const inactive = centres.length - active;
    const byCat = new Map<AssetCentreCategory, number>();
    centres.forEach(c => byCat.set(c.category, (byCat.get(c.category) ?? 0) + 1));
    return { total: centres.length, active, inactive, categories: byCat.size };
  }, [centres]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return centres;
    return centres.filter(c =>
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.custodian_name.toLowerCase().includes(q),
    );
  }, [centres, search]);

  const activeDivisions = useMemo(() => divisions.filter(d => d.status === 'active'), [divisions]);
  const filteredDepartments = useMemo(() => {
    if (!form.division_id) return departments.filter(d => d.status === 'active');
    return departments.filter(d => d.status === 'active' && d.division_id === form.division_id);
  }, [departments, form.division_id]);

  const parentOptions = useMemo(() =>
    centres.filter(c => c.status === 'active' && c.id !== editing?.id),
  [centres, editing]);

  const centreById = useMemo(() => {
    const m = new Map<string, AssetCentre>();
    centres.forEach(c => m.set(c.id, c));
    return m;
  }, [centres]);
  const divisionById = useMemo(() => {
    const m = new Map<string, string>();
    divisions.forEach(d => m.set(d.id, d.name));
    return m;
  }, [divisions]);
  const departmentById = useMemo(() => {
    const m = new Map<string, string>();
    departments.forEach(d => m.set(d.id, d.name));
    return m;
  }, [departments]);

  const openCreate = () => { setEditing(null); setSheetOpen(true); };
  const openEdit = (ac: AssetCentre) => { setEditing(ac); setSheetOpen(true); };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.custodian_name.trim()) { toast.error('Custodian name is required'); return; }
    if (!form.custodian_email.trim() || !form.custodian_email.includes('@')) {
      toast.error('Valid custodian email required'); return;
    }
    if (editing) {
      updateAssetCentre(editing.id, form);
      toast.success(`Updated ${editing.code}`);
    } else {
      const created = createAssetCentre(form);
      toast.success(`Created ${created.code} — ${created.name}`);
    }
    setSheetOpen(false);
    setEditing(null);
  };

  const handleDelete = () => {
    if (!delTarget) return;
    deleteAssetCentre(delTarget.id);
    toast.success(`Deleted ${delTarget.code}`);
    setDelTarget(null);
  };

  const seedDemo = () => {
    if (centres.length > 0) { toast.error('Asset Centres already exist — cannot seed'); return; }
    localStorage.setItem(assetCentresKey(entityCode), JSON.stringify(DEMO_ASSET_CENTRES));
    localStorage.setItem(ASSET_CENTRE_SEQ_KEY(entityCode), String(DEMO_ASSET_CENTRES.length));
    refresh();
    toast.success(`Seeded ${DEMO_ASSET_CENTRES.length} demo Asset Centres`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5 p-6" data-keyboard-form>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="h-6 w-6 text-teal-500" />
            Asset Centres
          </h1>
          <p className="text-sm text-muted-foreground">
            FineCore master · capital infrastructure cost-tagging (D-218 two-master architecture)
          </p>
        </div>
        <div className="flex gap-2">
          {centres.length === 0 && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={seedDemo}>
              <Database className="h-4 w-4" /> Seed Demo Data
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Asset Centre
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total</CardDescription>
          <CardTitle className="text-2xl font-mono">{stats.total}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription>
          <CardTitle className="text-2xl font-mono text-emerald-600">{stats.active}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Inactive</CardDescription>
          <CardTitle className="text-2xl font-mono text-muted-foreground">{stats.inactive}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Categories</CardDescription>
          <CardTitle className="text-2xl font-mono">{stats.categories}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search code, name, location, custodian..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} centres</span>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Code', 'Name', 'Category', 'Parent', 'Division / Dept', 'Location', 'Custodian', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={9} className="text-center py-16 text-muted-foreground">
              <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">
                {centres.length === 0 ? 'No Asset Centres yet' : 'No matches'}
              </p>
              <p className="text-xs mb-4">
                {centres.length === 0
                  ? "Click 'Add Asset Centre' to create the first one."
                  : 'Try a different search term.'}
              </p>
              {centres.length === 0 && (
                <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Asset Centre</Button>
              )}
            </TableCell></TableRow>
          ) : filtered.map(ac => {
            const parent = ac.parent_asset_centre_id ? centreById.get(ac.parent_asset_centre_id) : null;
            const divName = ac.division_id ? divisionById.get(ac.division_id) : null;
            const deptName = ac.department_id ? departmentById.get(ac.department_id) : null;
            return (
              <TableRow key={ac.id} className="group">
                <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{ac.code}</code></TableCell>
                <TableCell className="font-medium text-sm max-w-[200px] truncate">{ac.name}</TableCell>
                <TableCell><Badge variant="outline" className="text-xs">{ASSET_CENTRE_CATEGORY_LABELS[ac.category]}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {parent ? <span className="font-mono">{parent.code}</span> : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {divName || deptName ? `${divName ?? '—'}${deptName ? ' / ' + deptName : ''}` : '—'}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{ac.location || '—'}</TableCell>
                <TableCell className="text-xs">{ac.custodian_name}</TableCell>
                <TableCell>
                  <Badge className={ac.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-700 text-xs'
                    : 'bg-muted text-muted-foreground text-xs'}>
                    {ac.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Toggle active" onClick={() => toggleActive(ac.id)}>
                      <Switch checked={ac.status === 'active'} className="scale-75 pointer-events-none" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(ac)}>
                      <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete" onClick={() => setDelTarget(ac)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table></CardContent></Card>

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? `Edit ${editing.code}` : 'New Asset Centre'}</SheetTitle>
            <SheetDescription>
              {editing ? 'Update Asset Centre details.' : 'Code auto-generates as ACT-NNNN on save.'}
            </SheetDescription>
          </SheetHeader>
          <div data-keyboard-form className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Plant 1 — CNC Line A" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as AssetCentreCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(ASSET_CENTRE_CATEGORY_LABELS) as AssetCentreCategory[]).map(cat => (
                    <SelectItem key={cat} value={cat}>{ASSET_CENTRE_CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Parent Asset Centre</Label>
              <Select value={form.parent_asset_centre_id ?? 'none'}
                onValueChange={v => setForm(f => ({ ...f, parent_asset_centre_id: v === 'none' ? null : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {parentOptions.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Division</Label>
                <Select value={form.division_id ?? 'none'}
                  onValueChange={v => setForm(f => ({ ...f, division_id: v === 'none' ? null : v, department_id: null }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {activeDivisions.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.department_id ?? 'none'}
                  onValueChange={v => setForm(f => ({ ...f, department_id: v === 'none' ? null : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {filteredDepartments.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input placeholder="e.g. Mumbai Plant 1" value={form.location}
                onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Custodian Name <span className="text-destructive">*</span></Label>
                <Input placeholder="Person responsible" value={form.custodian_name}
                  onChange={e => setForm(f => ({ ...f, custodian_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Custodian Email <span className="text-destructive">*</span></Label>
                <Input type="email" placeholder="email@company.com" value={form.custodian_email}
                  onChange={e => setForm(f => ({ ...f, custodian_email: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Status</Label>
                <p className="text-xs text-muted-foreground">Active centres appear in voucher + asset tag pickers</p>
              </div>
              <Switch checked={form.status === 'active'}
                onCheckedChange={v => setForm(f => ({ ...f, status: v ? 'active' : 'inactive' }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={3} placeholder="Notes / context..." value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={!!delTarget} onOpenChange={v => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset Centre?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? Vouchers / AssetTags using <span className="font-mono font-semibold">{delTarget?.code}</span> will
              retain the reference but reports may show inactive Centre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AssetCentreMasterPage() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><AssetCentreMasterPanel /></main>
      </div>
    </SidebarProvider>
  );
}
