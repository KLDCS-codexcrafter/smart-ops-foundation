import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScanLine, Plus, Search, Edit2, Trash2, ArrowRightLeft, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { AssetTag, CustodyTransfer } from '@/types/asset-tag';
import type { InventoryItem } from '@/types/inventory-item';

const KEY = 'erp_asset_tags';
const CTKEY = 'erp_custody_transfers';
const IKEY = 'erp_inventory_items';
// [JWT] GET /api/inventory/asset-tags
const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

const DEPTS = ['Administration', 'Finance', 'HR', 'IT', 'Operations', 'Production', 'QC', 'R&D', 'Sales', 'Warehouse', 'Other'];

const BLANK: Omit<AssetTag, 'id' | 'created_at' | 'updated_at'> = {
  item_id: '', item_code: '', item_name: '', asset_tag_number: '',
  department: '', cost_centre: null, custodian_name: '', custodian_email: null,
  physical_location: '', purchase_date: null, warranty_expiry: null,
  last_verified_date: null, last_verified_by: null,
  barcode_type: 'QR', label_template_id: null, qr_url: null,
  status: 'active', notes: null,
};

export function AssetTagManagerPanel() {
  const [tags, setTags] = useState<AssetTag[]>(ls(KEY));
  // [JWT] GET /api/labels/asset-tags
  const [fixedAssets] = useState<InventoryItem[]>(ls<InventoryItem>(IKEY).filter(i => i.item_type === 'Fixed Asset'));
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [open, setOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [edit, setEdit] = useState<AssetTag | null>(null);
  const [form, setForm] = useState<typeof BLANK>(BLANK);
  const [xferTag, setXferTag] = useState<AssetTag | null>(null);
  const [xferForm, setXferForm] = useState({ to_department: '', to_custodian: '', authorized_by: '', notes: '' });
  const [itemSearch, setItemSearch] = useState('');

  // [JWT] POST /api/inventory/asset-tags
  const sv = (d: AssetTag[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/labels/asset-tags */ };

  const filtered = useMemo(() => tags.filter(t => {
    const q = search.toLowerCase();
    return (!q || t.item_name.toLowerCase().includes(q) || t.asset_tag_number.toLowerCase().includes(q) ||
      t.custodian_name.toLowerCase().includes(q))
      && (statusF === 'all' || t.status === statusF);
  }), [tags, search, statusF]);

  const nextTagNumber = () => `AST-${String(tags.length + 1).padStart(5, '0')}`;

  const openC = () => { setForm({ ...BLANK, asset_tag_number: nextTagNumber() }); setEdit(null); setItemSearch(''); setOpen(true); };
  const openE = (t: AssetTag) => {
    setForm({
      item_id: t.item_id, item_code: t.item_code, item_name: t.item_name, asset_tag_number: t.asset_tag_number,
      department: t.department, cost_centre: t.cost_centre || null, custodian_name: t.custodian_name,
      custodian_email: t.custodian_email || null, physical_location: t.physical_location,
      purchase_date: t.purchase_date || null, warranty_expiry: t.warranty_expiry || null,
      last_verified_date: t.last_verified_date || null, last_verified_by: t.last_verified_by || null,
      barcode_type: t.barcode_type, label_template_id: t.label_template_id || null, qr_url: t.qr_url || null,
      status: t.status, notes: t.notes || null
    });
    setEdit(t); setItemSearch(''); setOpen(true);
  };

  const handleSave = () => {
    if (!form.item_id) { toast.error('Select a Fixed Asset item'); return; }
    if (!form.custodian_name.trim()) { toast.error('Custodian name is required'); return; }
    const now = new Date().toISOString();
    if (edit) {
      const u = tags.map(x => x.id === edit.id ? { ...x, ...form, updated_at: now } : x);
      setTags(u); sv(u); toast.success('Asset tag updated');
      // [JWT] PATCH /api/labels/asset-tags/:id
    } else {
      const nt: AssetTag = { ...form, id: `at-${Date.now()}`, created_at: now, updated_at: now };
      const u = [nt, ...tags]; setTags(u); sv(u); toast.success(`Asset tag ${form.asset_tag_number} created`);
      // [JWT] POST /api/labels/asset-tags
    }
    setOpen(false);
  };

  const markVerified = (tag: AssetTag) => {
    const u = tags.map(x => x.id === tag.id ? { ...x, last_verified_date: new Date().toISOString().split('T')[0], last_verified_by: 'Current User', updated_at: new Date().toISOString() } : x);
    setTags(u); sv(u); toast.success(`${tag.asset_tag_number} marked as verified`);
    // [JWT] PATCH /api/labels/asset-tags/:id/verify
  };

  const handleTransfer = () => {
    if (!xferTag || !xferForm.to_department || !xferForm.to_custodian || !xferForm.authorized_by) {
      toast.error('Fill all transfer fields'); return;
    }
    const now = new Date().toISOString();
    const ct: CustodyTransfer = {
      id: `ct-${Date.now()}`, asset_tag_id: xferTag.id,
      from_department: xferTag.department, from_custodian: xferTag.custodian_name,
      to_department: xferForm.to_department, to_custodian: xferForm.to_custodian,
      transfer_date: now.split('T')[0], authorized_by: xferForm.authorized_by,
      notes: xferForm.notes || undefined, created_at: now
    };
    const existCT = ls<CustodyTransfer>(CTKEY);
    // [JWT] POST /api/inventory/asset-tags
    localStorage.setItem(CTKEY, JSON.stringify([ct, ...existCT]));
    // [JWT] POST /api/labels/asset-tags/:id/transfer
    const u = tags.map(x => x.id === xferTag.id ?
      { ...x, department: xferForm.to_department, custodian_name: xferForm.to_custodian, status: 'transferred' as const, updated_at: now } : x);
    setTags(u); sv(u);
    toast.success(`${xferTag.asset_tag_number} transferred to ${xferForm.to_custodian}`);
    setTransferOpen(false); setXferForm({ to_department: '', to_custodian: '', authorized_by: '', notes: '' });
  };

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/10 text-emerald-700',
    transferred: 'bg-blue-500/10 text-blue-700',
    disposed: 'bg-slate-500/10 text-slate-500',
    missing: 'bg-red-500/10 text-red-700',
  };

  return (
    <div data-keyboard-form className="max-w-6xl mx-auto space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScanLine className="h-6 w-6" />Asset Tag Manager</h1>
          <p className="text-sm text-muted-foreground">Fixed asset tags with QR codes — custody transfer and audit verification</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={openC}><Plus className="h-4 w-4" />New Asset Tag</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardDescription>Total Tagged Assets</CardDescription><CardTitle className="text-2xl">{tags.length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Active</CardDescription><CardTitle className="text-2xl text-emerald-600">{tags.filter(t => t.status === 'active').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Transferred</CardDescription><CardTitle className="text-2xl text-blue-600">{tags.filter(t => t.status === 'transferred').length}</CardTitle></CardHeader></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Missing / Disposed</CardDescription><CardTitle className="text-2xl text-red-600">{tags.filter(t => t.status === 'missing' || t.status === 'disposed').length}</CardTitle></CardHeader></Card>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8 h-9" placeholder="Search by asset tag, item, custodian..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusF} onValueChange={setStatusF}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['active', 'transferred', 'disposed', 'missing'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} assets</span>
      </div>

      <Card><CardContent className="p-0"><Table>
        <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40">
          {['Tag No', 'Asset', 'Department', 'Custodian', 'Location', 'Last Verified', 'Status', ''].map(h => (
            <TableHead key={h} className="text-xs font-semibold uppercase tracking-wider">{h}</TableHead>
          ))}
        </TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
              <ScanLine className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold text-foreground mb-1">No asset tags yet</p>
              <p className="text-xs mb-4">Tag Fixed Assets for audit compliance and tracking</p>
              <Button size="sm" onClick={openC}><Plus className="h-4 w-4 mr-1" />New Asset Tag</Button>
            </TableCell></TableRow>
          ) : filtered.map(tag => (
            <TableRow key={tag.id} className="group">
              <TableCell><code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{tag.asset_tag_number}</code></TableCell>
              <TableCell className="font-medium text-sm max-w-[140px] truncate">{tag.item_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{tag.department}</TableCell>
              <TableCell className="text-xs">{tag.custodian_name}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">{tag.physical_location}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{tag.last_verified_date || 'Never'}</TableCell>
              <TableCell><Badge className={`text-xs ${statusColors[tag.status]}`}>{tag.status}</Badge></TableCell>
              <TableCell>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark Verified" onClick={() => markVerified(tag)}>
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Custody Transfer"
                    onClick={() => { setXferTag(tag); setTransferOpen(true); }}>
                    <ArrowRightLeft className="h-3.5 w-3.5 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openE(tag)}>
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                    const u = tags.filter(x => x.id !== tag.id); setTags(u); sv(u); toast.success('Tag deleted');
                    // [JWT] DELETE /api/labels/asset-tags/:id
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></CardContent></Card>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit ? 'Edit Asset Tag' : 'New Asset Tag'}</DialogTitle>
            <DialogDescription>Tag a Fixed Asset for audit compliance and physical tracking</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Asset Tag Number</Label>
                <Input value={form.asset_tag_number} onChange={e => setForm(f => ({ ...f, asset_tag_number: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Barcode Type</Label>
                <Select value={form.barcode_type} onValueChange={v => setForm(f => ({ ...f, barcode_type: v as typeof f.barcode_type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="QR">QR Code</SelectItem>
                    <SelectItem value="Code128">Code 128</SelectItem>
                    <SelectItem value="DynamicQR">Dynamic QR (live data)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fixed Asset Item *</Label>
              {form.item_id ? (
                <div className="flex items-center gap-2 p-2.5 border rounded-lg bg-muted/30">
                  <div className="flex-1"><p className="text-sm font-medium">{form.item_name}</p><p className="text-xs font-mono text-muted-foreground">{form.item_code}</p></div>
                  <Button variant="ghost" size="sm" className="h-6 text-xs"
                    onClick={() => setForm(f => ({ ...f, item_id: '', item_code: '', item_name: '' }))}>Change</Button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search fixed assets..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                  {itemSearch && (
                    <div className="border rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                      {fixedAssets.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                        i.code.toLowerCase().includes(itemSearch.toLowerCase())).slice(0, 10).map(i => (
                          <button key={i.id} className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b last:border-0 text-sm"
                            onClick={() => { setForm(f => ({ ...f, item_id: i.id, item_code: i.code, item_name: i.name, qr_url: form.barcode_type === 'DynamicQR' ? `https://app.4dsmartops.com/asset/${i.code}` : null })); setItemSearch(''); }}>{i.name} <span className="text-xs text-muted-foreground font-mono ml-1">{i.code}</span></button>
                        ))}
                      {fixedAssets.length === 0 && <p className="p-3 text-xs text-muted-foreground">No Fixed Asset items found. Add items with type "Fixed Asset" in Item Craft.</p>}
                    </div>
                  )}
                </>
              )}
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select value={form.department || 'none'} onValueChange={v => setForm(f => ({ ...f, department: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Select dept..." /></SelectTrigger>
                  <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Cost Centre</Label>
                <Input placeholder="e.g. CC-001" value={form.cost_centre || ''}
                  onChange={e => setForm(f => ({ ...f, cost_centre: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Custodian Name *</Label>
                <Input placeholder="Person responsible" value={form.custodian_name}
                  onChange={e => setForm(f => ({ ...f, custodian_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Custodian Email</Label>
                <Input type="email" placeholder="email@company.com" value={form.custodian_email || ''}
                  onChange={e => setForm(f => ({ ...f, custodian_email: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Physical Location</Label>
                <Input placeholder="e.g. Building A, 2nd Floor, Server Room" value={form.physical_location}
                  onChange={e => setForm(f => ({ ...f, physical_location: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchase_date || ''} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Warranty Expiry</Label>
                <Input type="date" value={form.warranty_expiry || ''} onChange={e => setForm(f => ({ ...f, warranty_expiry: e.target.value || null }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as typeof f.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['active', 'transferred', 'disposed', 'missing'].map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSave}>{edit ? 'Update' : 'Create'} Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custody Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custody Transfer — {xferTag?.asset_tag_number}</DialogTitle>
            <DialogDescription>Transfer {xferTag?.item_name} from {xferTag?.custodian_name} ({xferTag?.department})</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-3">
            <div className="space-y-1.5">
              <Label>Transfer To — Department *</Label>
              <Select value={xferForm.to_department || 'none'}
                onValueChange={v => setXferForm(f => ({ ...f, to_department: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Select new department..." /></SelectTrigger>
                <SelectContent>{DEPTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>New Custodian *</Label>
              <Input placeholder="Name of new responsible person" value={xferForm.to_custodian}
                onChange={e => setXferForm(f => ({ ...f, to_custodian: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Authorized By *</Label>
              <Input placeholder="Manager / HOD name" value={xferForm.authorized_by}
                onChange={e => setXferForm(f => ({ ...f, authorized_by: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Reason for transfer..." value={xferForm.notes}
                onChange={e => setXferForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={handleTransfer}>Confirm Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AssetTagManager() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader /><main className="flex-1"><AssetTagManagerPanel /></main>
      </div>
    </SidebarProvider>
  );
}
