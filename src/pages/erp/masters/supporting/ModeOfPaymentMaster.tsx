import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Search, Lock, Pencil, Trash2, Shield } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { MODE_OF_PAYMENT_SEED, type ModeOfPayment } from '@/data/masters-seed-data';

const STORAGE_KEY = 'erp_group_mode_of_payment';

const loadModes = (): ModeOfPayment[] => {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  const seeded = MODE_OF_PAYMENT_SEED.map(s => ({
    ...s, id: crypto.randomUUID(), isSeeded: true, isActive: true,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  // [JWT] GET /api/group/masters/mode-of-payment
  return seeded;
};

const saveModes = (modes: ModeOfPayment[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(modes));
  // [JWT] PUT /api/group/masters/mode-of-payment
};

export function ModeOfPaymentMasterPanel() {
  const [modes, setModes] = useState<ModeOfPayment[]>(() => loadModes());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ModeOfPayment | null>(null);
  const [form, setForm] = useState({ name: '', remarks: '' });
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    modes.filter(m => `${m.code} ${m.name} ${m.remarks}`.toLowerCase().includes(search.toLowerCase())),
    [modes, search]);

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Name is required');
    const allModes = loadModes();
    if (editTarget) {
      const updated = allModes.map(m =>
        m.id === editTarget.id ? { ...m, name: editTarget.isSeeded ? m.name : form.name.trim(), remarks: form.remarks.trim() } : m
      );
      saveModes(updated); setModes(updated);
      toast.success('Updated');
    } else {
      const newMode: ModeOfPayment = {
        id: crypto.randomUUID(),
        code: `MOP-${String(allModes.length + 1).padStart(3, '0')}`,
        name: form.name.trim(),
        remarks: form.remarks.trim(),
        isSeeded: false,
        isActive: true,
      };
      const updated = [...allModes, newMode];
      saveModes(updated); setModes(updated);
      toast.success(`${newMode.name} added`);
    }
    setAddOpen(false); setEditTarget(null); setForm({ name: '', remarks: '' });
  };

  const handleDelete = (id: string) => {
    const allModes = loadModes();
    const target = allModes.find(m => m.id === id);
    if (!target || target.isSeeded) return;
    const updated = allModes.filter(m => m.id !== id);
    saveModes(updated); setModes(updated);
    toast.success('Deleted');
  };

  const handleToggleActive = (id: string) => {
    const updated = loadModes().map(m => m.id === id ? { ...m, isActive: !m.isActive } : m);
    saveModes(updated); setModes(updated);
  };

  const openEdit = (m: ModeOfPayment) => {
    setEditTarget(m);
    setForm({ name: m.name, remarks: m.remarks });
    setAddOpen(true);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', remarks: '' });
    setAddOpen(true);
  };

  const totalCount = modes.length;
  const activeCount = modes.filter(m => m.isActive).length;
  const seededCount = modes.filter(m => m.isSeeded).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mode of Payment</h2>
        <p className="text-sm text-muted-foreground">Supporting master — auto-created on company setup</p>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline">Total {totalCount}</Badge>
        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">Active {activeCount}</Badge>
        <Badge variant="outline" className="border-amber-500/30 text-amber-600">
          <Shield className="h-3 w-3 mr-1" /> Protected {seededCount}
        </Badge>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by code, name, remarks…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Mode of Payment
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No records found. Run company setup to auto-create defaults.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id} className={`${!m.isActive ? 'opacity-50' : ''} group`}>
                  <TableCell className="font-mono text-xs text-teal-600 dark:text-teal-400">{m.code}</TableCell>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.remarks}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {m.isSeeded && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Protected — seeded by system</TooltipContent>
                        </Tooltip>
                      )}
                      {!m.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch checked={m.isActive} onCheckedChange={() => handleToggleActive(m.id)} className="scale-75" />
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {m.isSeeded ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit remarks only</TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={o => { if (!o) { setAddOpen(false); setEditTarget(null); } else setAddOpen(true); }}>
        <DialogContent className="max-w-md" data-keyboard-form>
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Mode of Payment' : 'Add Mode of Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={onEnterNext}
                disabled={editTarget?.isSeeded}
                placeholder="e.g. Credit Card"
              />
              {editTarget?.isSeeded && <p className="text-xs text-muted-foreground mt-1">Name is protected for seeded records</p>}
            </div>
            <div>
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditTarget(null); }}>Cancel</Button>
            <Button onClick={handleSave} data-primary>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ModeOfPaymentMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Masters', href: '/erp/masters' },
            { label: 'Mode of Payment' },
          ]}
        />
        <main className="p-6"><ModeOfPaymentMasterPanel /></main>
      </div>
    </SidebarProvider>
  );
}
