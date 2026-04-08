import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Plus, Search, Lock, Pencil, Trash2, Shield, Info } from 'lucide-react';
import { onEnterNext } from '@/lib/keyboard';
import { TERMS_OF_DELIVERY_SEED, type TermsOfDelivery } from '@/data/masters-seed-data';

const STORAGE_KEY = 'erp_group_terms_of_delivery';

const loadTerms = (): TermsOfDelivery[] => {
  try {
    const r = localStorage.getItem(STORAGE_KEY);
    if (r) return JSON.parse(r);
  } catch {}
  const seeded = TERMS_OF_DELIVERY_SEED.map(s => ({
    ...s, id: crypto.randomUUID(), isSeeded: true, isActive: true,
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  // [JWT] GET /api/group/masters/terms-of-delivery
  return seeded;
};

const saveTerms = (terms: TermsOfDelivery[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(terms));
  // [JWT] PUT /api/group/masters/terms-of-delivery
};

const freightBadge = (fr: string) => {
  if (fr === 'Seller') return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">{fr}</Badge>;
  if (fr === 'Buyer') return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">{fr}</Badge>;
  return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">{fr}</Badge>;
};

export function TermsOfDeliveryMasterPanel() {
  const [terms, setTerms] = useState<TermsOfDelivery[]>(() => loadTerms());
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TermsOfDelivery | null>(null);
  const [form, setForm] = useState({ name: '', freightResponsibility: 'Seller' as string, description: '' });
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    terms.filter(t => `${t.code} ${t.name} ${t.freightResponsibility} ${t.description}`.toLowerCase().includes(search.toLowerCase())),
    [terms, search]);

  const handleSave = () => {
    if (!form.name.trim()) return toast.error('Name is required');
    const allTerms = loadTerms();
    if (editTarget) {
      const updated = allTerms.map(t =>
        t.id === editTarget.id ? {
          ...t,
          name: editTarget.isSeeded ? t.name : form.name.trim(),
          freightResponsibility: editTarget.isSeeded ? t.freightResponsibility : form.freightResponsibility,
          description: form.description.trim(),
        } : t
      );
      saveTerms(updated); setTerms(updated);
      toast.success('Updated');
    } else {
      const newTerm: TermsOfDelivery = {
        id: crypto.randomUUID(),
        code: `TOD-${String(allTerms.length + 1).padStart(3, '0')}`,
        name: form.name.trim(),
        freightResponsibility: form.freightResponsibility,
        description: form.description.trim(),
        isSeeded: false,
        isActive: true,
      };
      const updated = [...allTerms, newTerm];
      saveTerms(updated); setTerms(updated);
      toast.success(`${newTerm.name} added`);
    }
    setAddOpen(false); setEditTarget(null); setForm({ name: '', freightResponsibility: 'Seller', description: '' });
  };

  const handleDelete = (id: string) => {
    const allTerms = loadTerms();
    const target = allTerms.find(t => t.id === id);
    if (!target || target.isSeeded) return;
    const updated = allTerms.filter(t => t.id !== id);
    saveTerms(updated); setTerms(updated);
    toast.success('Deleted');
  };

  const handleToggleActive = (id: string) => {
    const updated = loadTerms().map(t => t.id === id ? { ...t, isActive: !t.isActive } : t);
    saveTerms(updated); setTerms(updated);
  };

  const openEdit = (t: TermsOfDelivery) => {
    setEditTarget(t);
    setForm({ name: t.name, freightResponsibility: t.freightResponsibility, description: t.description });
    setAddOpen(true);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: '', freightResponsibility: 'Seller', description: '' });
    setAddOpen(true);
  };

  const totalCount = terms.length;
  const activeCount = terms.filter(t => t.isActive).length;
  const seededCount = terms.filter(t => t.isSeeded).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Terms of Delivery</h2>
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
          <Input placeholder="Search by code, name, description…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button size="sm" onClick={openAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Terms of Delivery
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
                <TableHead className="w-[140px]">Freight</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(t => (
                <TableRow
                  key={t.id}
                  className={`${!t.isActive ? 'opacity-50' : ''} ${t.code === 'TOD-002' ? 'border-l-2 border-l-blue-500' : ''}`}
                >
                  <TableCell className="font-mono text-xs text-teal-600 dark:text-teal-400">{t.code}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {t.name}
                      {t.code === 'TOD-002' && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>Most common in Indian domestic trade.</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{freightBadge(t.freightResponsibility)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {t.isSeeded && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                          </TooltipTrigger>
                          <TooltipContent>Protected — seeded by system</TooltipContent>
                        </Tooltip>
                      )}
                      {!t.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Switch checked={t.isActive} onCheckedChange={() => handleToggleActive(t.id)} className="scale-75" />
                      {t.isSeeded ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit description only</TooltipContent>
                        </Tooltip>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
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
            <DialogTitle>{editTarget ? 'Edit Terms of Delivery' : 'Add Terms of Delivery'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onKeyDown={onEnterNext}
                disabled={editTarget?.isSeeded}
                placeholder="e.g. CIF Destination"
              />
              {editTarget?.isSeeded && <p className="text-xs text-muted-foreground mt-1">Name is protected for seeded records</p>}
            </div>
            <div>
              <Label>Freight Responsibility</Label>
              <Select
                value={form.freightResponsibility}
                onValueChange={v => setForm(f => ({ ...f, freightResponsibility: v }))}
                disabled={editTarget?.isSeeded}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Seller">Seller</SelectItem>
                  <SelectItem value="Buyer">Buyer</SelectItem>
                  <SelectItem value="Split">Split</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                onKeyDown={onEnterNext}
                placeholder="Describe delivery terms"
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

export default function TermsOfDeliveryMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Masters', href: '/erp/masters' },
            { label: 'Terms of Delivery' },
          ]}
        />
        <main className="p-6"><TermsOfDeliveryMasterPanel /></main>
      </div>
    </SidebarProvider>
  );
}
