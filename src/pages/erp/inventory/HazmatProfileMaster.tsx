/**
 * HazmatProfileMaster.tsx — UN DG classification + MSDS + Storage Reqs.
 * Sprint T-Phase-1.2.5
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { AlertTriangle, Plus, Pencil, Trash2, Upload } from 'lucide-react';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { useHazmatProfiles } from '@/hooks/useHazmatProfiles';
import {
  type HazmatProfile, type DGClass, type PackingGroup,
  DG_CLASS_LABELS,
} from '@/types/hazmat-profile';

const BLANK = (entity: string): HazmatProfile => ({
  id: '', entity_id: entity, profile_name: '',
  dg_class: null, dg_sub_class: null, un_number: null,
  packing_group: null, proper_shipping_name: null,
  flash_point_celsius: null, boiling_point_celsius: null,
  is_oxidizer: false, is_water_reactive: false, is_corrosive: false,
  is_toxic: false, is_carcinogenic: false,
  msds_document_url: null, msds_document_filename: null,
  msds_uploaded_at: null, msds_revision_no: null,
  emergency_contact_no: null, emergency_contact_name: null,
  max_storage_temperature_celsius: null, min_storage_temperature_celsius: null,
  ventilation_required: false, segregation_notes: null,
  notes: null, created_at: '', updated_at: '',
});

export function HazmatProfileMasterPanel() {
  const { entityCode } = useCardEntitlement();
  const safeEntity = entityCode || 'SMRT';
  const { profiles, createProfile, updateProfile, deleteProfile } = useHazmatProfiles(safeEntity);

  const [form, setForm] = useState<HazmatProfile>(BLANK(safeEntity));
  const [open, setOpen] = useState(false);
  const [filterClass, setFilterClass] = useState<'all' | DGClass>('all');
  const [search, setSearch] = useState('');

  const filtered = profiles.filter(p => {
    if (filterClass !== 'all' && p.dg_class !== filterClass) return false;
    if (search && !`${p.profile_name} ${p.un_number ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openNew = () => { setForm(BLANK(safeEntity)); setOpen(true); };
  const openEdit = (p: HazmatProfile) => { setForm(p); setOpen(true); };

  const handleSave = () => {
    if (!form.profile_name.trim()) { toast.error('Profile name required'); return; }
    const now = new Date().toISOString();
    if (form.id) {
      updateProfile(form.id, form);
    } else {
      createProfile({
        ...form, id: `hzm-${crypto.randomUUID()}`,
        created_at: now, updated_at: now,
      });
    }
    setOpen(false);
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm(prev => ({
        ...prev,
        msds_document_url: reader.result as string,
        msds_document_filename: f.name,
        msds_uploaded_at: new Date().toISOString(),
      }));
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold">Hazmat Profiles</h2>
          <Badge variant="outline" className="text-[10px]">UN DG · MSDS</Badge>
        </div>
        <Button size="sm" onClick={openNew} className="gap-1">
          <Plus className="h-4 w-4" /> Add Profile
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-8" />
        <Select value={filterClass} onValueChange={v => setFilterClass(v as typeof filterClass)}>
          <SelectTrigger className="w-56 h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All DG Classes</SelectItem>
            {(Object.keys(DG_CLASS_LABELS) as DGClass[]).map(k => (
              <SelectItem key={k} value={k}>{DG_CLASS_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              <TableHead>DG Class</TableHead>
              <TableHead>UN No.</TableHead>
              <TableHead>Packing Grp</TableHead>
              <TableHead>MSDS</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                No profiles
              </TableCell></TableRow>
            )}
            {filtered.map(p => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.profile_name}</TableCell>
                <TableCell>
                  {p.dg_class ? (
                    <Badge variant="outline">{p.dg_class}{p.dg_sub_class ? `.${p.dg_sub_class}` : ''}</Badge>
                  ) : '—'}
                </TableCell>
                <TableCell className="font-mono text-xs">{p.un_number ?? '—'}</TableCell>
                <TableCell>{p.packing_group ?? '—'}</TableCell>
                <TableCell className="text-xs">{p.msds_document_filename ?? '—'}</TableCell>
                <TableCell>
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-7 w-7">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => deleteProfile(p.id)} className="h-7 w-7">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader><SheetTitle>{form.id ? 'Edit' : 'New'} Hazmat Profile</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Profile Name *</Label>
              <Input value={form.profile_name} onChange={e => setForm({ ...form, profile_name: e.target.value })} />
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">UN Classification</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>DG Class</Label>
                  <Select value={form.dg_class ?? ''} onValueChange={v => setForm({ ...form, dg_class: v as DGClass })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(DG_CLASS_LABELS) as DGClass[]).map(k => (
                        <SelectItem key={k} value={k}>{DG_CLASS_LABELS[k]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sub-class</Label>
                  <Input value={form.dg_sub_class ?? ''} onChange={e => setForm({ ...form, dg_sub_class: e.target.value || null })} placeholder="e.g. 4.1" />
                </div>
                <div>
                  <Label>UN Number</Label>
                  <Input value={form.un_number ?? ''} onChange={e => setForm({ ...form, un_number: e.target.value || null })} placeholder="UN1294" />
                </div>
                <div>
                  <Label>Packing Group</Label>
                  <Select value={form.packing_group ?? ''} onValueChange={v => setForm({ ...form, packing_group: v as PackingGroup })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="I">I</SelectItem>
                      <SelectItem value="II">II</SelectItem>
                      <SelectItem value="III">III</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Proper Shipping Name</Label>
                  <Input value={form.proper_shipping_name ?? ''} onChange={e => setForm({ ...form, proper_shipping_name: e.target.value || null })} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Physical Hazards</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Flash Point (°C)</Label>
                  <Input type="number" value={form.flash_point_celsius ?? ''} onChange={e => setForm({ ...form, flash_point_celsius: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Boiling Point (°C)</Label>
                  <Input type="number" value={form.boiling_point_celsius ?? ''} onChange={e => setForm({ ...form, boiling_point_celsius: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['is_oxidizer', 'Oxidizer'],
                  ['is_water_reactive', 'Water Reactive'],
                  ['is_corrosive', 'Corrosive'],
                  ['is_toxic', 'Toxic'],
                  ['is_carcinogenic', 'Carcinogenic'],
                ] as const).map(([k, label]) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="text-xs">{label}</Label>
                    <Switch
                      checked={form[k]}
                      onCheckedChange={v => setForm({ ...form, [k]: v })}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">MSDS / Compliance</p>
              <div>
                <Label>MSDS Document</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept=".pdf,.doc,.docx,.png,.jpg" onChange={e => handleFile(e.target.files?.[0] ?? null)} />
                  {form.msds_document_filename && (
                    <Badge variant="outline" className="gap-1"><Upload className="h-3 w-3" /> {form.msds_document_filename}</Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>MSDS Revision No.</Label>
                  <Input value={form.msds_revision_no ?? ''} onChange={e => setForm({ ...form, msds_revision_no: e.target.value || null })} />
                </div>
                <div>
                  <Label>Emergency Contact Name</Label>
                  <Input value={form.emergency_contact_name ?? ''} onChange={e => setForm({ ...form, emergency_contact_name: e.target.value || null })} />
                </div>
                <div className="col-span-2">
                  <Label>Emergency Contact No.</Label>
                  <Input value={form.emergency_contact_no ?? ''} onChange={e => setForm({ ...form, emergency_contact_no: e.target.value || null })} />
                </div>
              </div>
            </div>

            <div className="border rounded-lg p-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Storage Requirements</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Min Storage Temp (°C)</Label>
                  <Input type="number" value={form.min_storage_temperature_celsius ?? ''} onChange={e => setForm({ ...form, min_storage_temperature_celsius: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Max Storage Temp (°C)</Label>
                  <Input type="number" value={form.max_storage_temperature_celsius ?? ''} onChange={e => setForm({ ...form, max_storage_temperature_celsius: e.target.value === '' ? null : Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Ventilation Required</Label>
                <Switch checked={form.ventilation_required} onCheckedChange={v => setForm({ ...form, ventilation_required: v })} />
              </div>
              <div>
                <Label>Segregation Notes</Label>
                <Textarea rows={2} value={form.segregation_notes ?? ''} onChange={e => setForm({ ...form, segregation_notes: e.target.value || null })} />
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
