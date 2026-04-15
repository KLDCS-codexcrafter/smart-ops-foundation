import { useState } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Edit2, Trash2, Tag, Globe } from 'lucide-react';
import { toast } from 'sonner';
import type { Brand, SubBrand } from '@/types/brand';
import { onEnterNext } from '@/lib/keyboard';

const COUNTRIES = ['India', 'China', 'USA', 'Germany', 'Japan', 'South Korea',
  'UK', 'France', 'Italy', 'Taiwan', 'Netherlands', 'Sweden', 'Switzerland',
  'Singapore', 'Malaysia', 'Bangladesh', 'Pakistan', 'Sri Lanka', 'Other'];

export function BrandMatrixPanel() {
  const loadBrands = (): Brand[] => { try { return JSON.parse(localStorage.getItem('erp_brands') || '[]'); } catch { return []; } };
  const loadSubBrands = (): SubBrand[] => { try { return JSON.parse(localStorage.getItem('erp_sub_brands') || '[]'); } catch { return []; } };

  const [brands, setBrands] = useState<Brand[]>(loadBrands());
  // [JWT] Replace with GET /api/inventory/brands
  const [subBrands, setSubBrands] = useState<SubBrand[]>(loadSubBrands());
  // [JWT] Replace with GET /api/inventory/sub-brands

  const [brandSearch, setBrandSearch] = useState('');
  const [subBrandSearch, setSubBrandSearch] = useState('');
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [subBrandDialogOpen, setSubBrandDialogOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [editSubBrand, setEditSubBrand] = useState<SubBrand | null>(null);

  const [bForm, setBForm] = useState({ code: '', name: '', manufacturer_name: '', country_of_origin: 'India', website: '', notes: '' });
  const [sbForm, setSbForm] = useState({ code: '', name: '', brand_id: '', description: '' });

  const saveBrands = (data: Brand[]) => {
    localStorage.setItem('erp_brands', JSON.stringify(data));
    // [JWT] Replace with POST/PATCH/DELETE /api/inventory/brands
  };
  const saveSubBrands = (data: SubBrand[]) => {
    localStorage.setItem('erp_sub_brands', JSON.stringify(data));
    // [JWT] Replace with POST/PATCH/DELETE /api/inventory/sub-brands
  };

  const handleSaveBrand = () => {
    if (!bForm.code.trim() || !bForm.name.trim()) { toast.error('Code and Name are required'); return; }
    if (editBrand) {
      const updated = brands.map(b => b.id === editBrand.id
        ? { ...b, ...bForm, updated_at: new Date().toISOString() } : b);
      setBrands(updated); saveBrands(updated);
      toast.success(`${bForm.name} updated`);
      // [JWT] Replace with PATCH /api/inventory/brands/:id
    } else {
      const newBrand: Brand = { ...bForm, id: `brand-${Date.now()}`,
        status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const updated = [newBrand, ...brands];
      setBrands(updated); saveBrands(updated);
      toast.success(`${bForm.name} created`);
      // [JWT] Replace with POST /api/inventory/brands
    }
    setBrandDialogOpen(false); setEditBrand(null);
    setBForm({ code: '', name: '', manufacturer_name: '', country_of_origin: 'India', website: '', notes: '' });
  };

  const handleSaveSubBrand = () => {
    if (!sbForm.code.trim() || !sbForm.name.trim() || !sbForm.brand_id) { toast.error('Code, Name and Brand are required'); return; }
    const parentBrand = brands.find(b => b.id === sbForm.brand_id);
    if (editSubBrand) {
      const updated = subBrands.map(s => s.id === editSubBrand.id
        ? { ...s, ...sbForm, brand_name: parentBrand?.name, updated_at: new Date().toISOString() } : s);
      setSubBrands(updated); saveSubBrands(updated);
      toast.success(`${sbForm.name} updated`);
      // [JWT] Replace with PATCH /api/inventory/sub-brands/:id
    } else {
      const newSub: SubBrand = { ...sbForm, id: `sub-${Date.now()}`, brand_name: parentBrand?.name,
        status: 'active', created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      const updated = [newSub, ...subBrands];
      setSubBrands(updated); saveSubBrands(updated);
      toast.success(`${sbForm.name} created`);
      // [JWT] Replace with POST /api/inventory/sub-brands
    }
    setSubBrandDialogOpen(false); setEditSubBrand(null);
    setSbForm({ code: '', name: '', brand_id: '', description: '' });
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
    b.code.toLowerCase().includes(brandSearch.toLowerCase())
  );
  const filteredSubBrands = subBrands.filter(s =>
    s.name.toLowerCase().includes(subBrandSearch.toLowerCase()) ||
    s.brand_name?.toLowerCase().includes(subBrandSearch.toLowerCase()) || false
  );

  return (
    <div data-keyboard-form className="max-w-5xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6" /> Brand Matrix
          </h1>
          <p className="text-sm text-muted-foreground">Brands and sub-brands for item classification</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Brands</CardDescription>
            <CardTitle className="text-2xl">{brands.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{brands.filter(b => b.status === 'active').length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sub-Brands</CardDescription>
            <CardTitle className="text-2xl">{subBrands.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Countries</CardDescription>
            <CardTitle className="text-2xl">{new Set(brands.map(b => b.country_of_origin).filter(Boolean)).size}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="brands">
        <TabsList>
          <TabsTrigger value="brands"><Tag className="h-4 w-4 mr-1.5" /> Brands</TabsTrigger>
          <TabsTrigger value="subbrands">Sub-Brands</TabsTrigger>
        </TabsList>

        {/* ── BRANDS TAB ── */}
        <TabsContent value="brands" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">All Brands</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8 h-9 w-56" placeholder="Search brands..."
                      value={brandSearch} onChange={e => setBrandSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => {
                    setBForm({ code: '', name: '', manufacturer_name: '', country_of_origin: 'India', website: '', notes: '' });
                    setEditBrand(null); setBrandDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4" /> Add Brand
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredBrands.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Tag className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-semibold text-foreground mb-1">No brands yet</p>
                  <p className="text-xs mb-4">Add your first brand or manufacturer</p>
                  <Button data-primary size="sm" onClick={() => { setEditBrand(null); setBrandDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1" /> Add Brand
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Brand Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Manufacturer</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Country</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Sub-Brands</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBrands.map(brand => (
                      <TableRow key={brand.id} className="group">
                        <TableCell className="font-mono text-xs font-medium">{brand.code}</TableCell>
                        <TableCell className="text-sm font-medium">{brand.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{brand.manufacturer_name || '—'}</TableCell>
                        <TableCell>
                          {brand.country_of_origin && (
                            <div className="flex items-center gap-1 text-xs">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              {brand.country_of_origin}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            {subBrands.filter(s => s.brand_id === brand.id).length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${brand.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>
                            {brand.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setBForm({ code: brand.code, name: brand.name,
                                manufacturer_name: brand.manufacturer_name || '',
                                country_of_origin: brand.country_of_origin || 'India',
                                website: brand.website || '', notes: brand.notes || '' });
                              setEditBrand(brand); setBrandDialogOpen(true);
                            }}>
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              const updated = brands.filter(b => b.id !== brand.id);
                              setBrands(updated); saveBrands(updated);
                              toast.success(`${brand.name} deleted`);
                              // [JWT] Replace with DELETE /api/inventory/brands/:id
                            }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SUB-BRANDS TAB ── */}
        <TabsContent value="subbrands" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base">All Sub-Brands</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-8 h-9 w-56" placeholder="Search sub-brands..."
                      value={subBrandSearch} onChange={e => setSubBrandSearch(e.target.value)} />
                  </div>
                  <Button size="sm" className="gap-1.5"
                    onClick={() => { setSbForm({ code: '', name: '', brand_id: '', description: '' }); setEditSubBrand(null); setSubBrandDialogOpen(true); }}>
                    <Plus className="h-4 w-4" /> Add Sub-Brand
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredSubBrands.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No sub-brands yet. Add brands first, then create sub-brands.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Sub-Brand Name</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Parent Brand</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Description</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubBrands.map(sub => (
                      <TableRow key={sub.id} className="group">
                        <TableCell className="font-mono text-xs font-medium">{sub.code}</TableCell>
                        <TableCell className="text-sm font-medium">{sub.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{sub.brand_name || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {sub.description || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${sub.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-500'}`}>
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              setSbForm({ code: sub.code, name: sub.name, brand_id: sub.brand_id, description: sub.description || '' });
                              setEditSubBrand(sub); setSubBrandDialogOpen(true);
                            }}>
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                              const updated = subBrands.filter(s => s.id !== sub.id);
                              setSubBrands(updated); saveSubBrands(updated);
                              toast.success('Sub-brand deleted');
                              // [JWT] Replace with DELETE /api/inventory/sub-brands/:id
                            }}>
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── BRAND DIALOG ── */}
      <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editBrand ? 'Edit Brand' : 'New Brand'}</DialogTitle>
            <DialogDescription>Brand and manufacturer details</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Brand Code *</Label>
                <Input placeholder="e.g. TATA" value={bForm.code}
                  onChange={e => setBForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Brand Name *</Label>
                <Input placeholder="e.g. Tata Steel" value={bForm.name}
                  onChange={e => setBForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Manufacturer / Owner</Label>
              <Input placeholder="Who manufactures or owns this brand?" value={bForm.manufacturer_name}
                onChange={e => setBForm(f => ({ ...f, manufacturer_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Country of Origin</Label>
              <Select value={bForm.country_of_origin}
                onValueChange={v => setBForm(f => ({ ...f, country_of_origin: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input placeholder="https://..." value={bForm.website}
                onChange={e => setBForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Internal notes" value={bForm.notes}
                onChange={e => setBForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBrandDialogOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSaveBrand}>{editBrand ? 'Update' : 'Create'} Brand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── SUB-BRAND DIALOG ── */}
      <Dialog open={subBrandDialogOpen} onOpenChange={setSubBrandDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editSubBrand ? 'Edit Sub-Brand' : 'New Sub-Brand'}</DialogTitle>
            <DialogDescription>Sub-brand must be linked to a parent brand</DialogDescription>
          </DialogHeader>
          <div data-keyboard-form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Sub-Brand Code *</Label>
                <Input placeholder="e.g. TISCON" value={sbForm.code}
                  onChange={e => setSbForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Sub-Brand Name *</Label>
                <Input placeholder="e.g. Tata Tiscon" value={sbForm.name}
                  onChange={e => setSbForm(f => ({ ...f, name: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Parent Brand *</Label>
              <Select value={sbForm.brand_id}
                onValueChange={v => setSbForm(f => ({ ...f, brand_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent brand..." />
                </SelectTrigger>
                <SelectContent>
                  {brands.filter(b => b.status === 'active').map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input placeholder="What distinguishes this sub-brand?" value={sbForm.description}
                onChange={e => setSbForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubBrandDialogOpen(false)}>Cancel</Button>
            <Button data-primary onClick={handleSaveSubBrand}>{editSubBrand ? 'Update' : 'Create'} Sub-Brand</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function BrandMatrix() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex flex-col w-full bg-background">
        <ERPHeader />
        <main className="flex-1"><BrandMatrixPanel /></main>
      </div>
    </SidebarProvider>
  );
}
