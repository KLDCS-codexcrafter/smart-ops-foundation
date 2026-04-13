import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Building2, Users, Plus, Edit2, Trash2, ChevronDown, Network,
  Sparkles, Package, Check } from 'lucide-react';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import { ORG_PRESETS } from '@/data/org-presets';
import type { Division, Department } from '@/types/org-structure';
import { DIVISION_CATEGORY_LABELS } from '@/types/org-structure';
import type { DivisionCategory } from '@/types/org-structure';
import { cn } from '@/lib/utils';
import { onEnterNext } from '@/lib/keyboard';

// ── Blanks ───────────────────────────────────────────────────────────

const BLANK_DIVISION: {
  name: string; category: DivisionCategory; parent_division_id: string | null;
  head_name: string; head_email: string; location: string; status: 'active' | 'inactive';
  description: string; entity_id: string | null;
} = {
  name: '', category: 'operations', parent_division_id: null,
  head_name: '', head_email: '', location: '', status: 'active',
  description: '', entity_id: null,
};

const BLANK_DEPARTMENT: {
  name: string; division_id: string | null; parent_department_id: string | null;
  head_name: string; head_email: string; location: string; budget: number | null;
  status: 'active' | 'inactive'; description: string; entity_id: string | null;
} = {
  name: '', division_id: null, parent_department_id: null,
  head_name: '', head_email: '', location: '', budget: null,
  status: 'active', description: '', entity_id: null,
};

// ── Preset Dialog ────────────────────────────────────────────────────

function PresetDialog({
  open, onOpenChange, onImport
}: { open: boolean; onOpenChange: (v: boolean) => void; onImport: (preset: any) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const preset = selected ? ORG_PRESETS.find(p => p.id === selected) : null;

  const handleImport = () => {
    if (!preset) return;
    onImport(preset);
    onOpenChange(false);
    setSelected(null);
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) setSelected(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Quick Setup
          </DialogTitle>
          <DialogDescription>
            Pick your business type. We will create divisions and departments instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-2">
          {ORG_PRESETS.map(p => (
            <button key={p.id} type="button"
              onClick={() => setSelected(p.id === selected ? null : p.id)}
              className={cn(
                'flex flex-col gap-1 p-3 rounded-xl border text-left transition-all',
                selected === p.id
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg">{p.icon}</span>
                {selected === p.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </div>
              <p className="text-[12px] font-semibold text-foreground">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.description}</p>
            </button>
          ))}
        </div>

        {preset && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Preview — {preset.divisions.length} divisions · {preset.departments.length} departments
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border/50 bg-muted/20 p-3 space-y-2">
                {preset.divisions.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">No divisions — departments only.</p>
                ) : preset.divisions.map((div: any) => {
                  const depts = (preset.departments as any[]).filter(d => d.division_name === div.name);
                  return (
                    <div key={div.name}>
                      <p className="text-[11px] font-semibold text-foreground">{div.name}</p>
                      {depts.map((d: any) => (
                        <p key={d.name} className="text-[10px] text-muted-foreground pl-3">↳ {d.name}</p>
                      ))}
                    </div>
                  );
                })}
                {(preset.departments as any[]).filter(d => !d.division_name).map((d: any) => (
                  <p key={d.name} className="text-[10px] text-muted-foreground">· {d.name}</p>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" disabled={!preset} onClick={handleImport}
            className="gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {preset ? `Import ${preset.name}` : "Select a preset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Panel ───────────────────────────────────────────────────────

export function OrgStructurePanel() {
  const { divisions, departments, activeDivisions, activeDepartments,
    createDivision, updateDivision, deleteDivision, toggleDivisionStatus,
    createDepartment, updateDepartment, deleteDepartment, toggleDepartmentStatus,
    importPreset } = useOrgStructure();

  const [tab, setTab] = useState<'divisions' | 'departments'>('divisions');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'div' | 'dept'>('div');
  const [editDiv, setEditDiv] = useState<Division | null>(null);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [divSearch, setDivSearch] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [deptDivFilter, setDeptDivFilter] = useState('all');
  const [divForm, setDivForm] = useState({ ...BLANK_DIVISION });
  const [deptForm, setDeptForm] = useState({ ...BLANK_DEPARTMENT });

  // ── Sheet open helpers ─────────────────────────────────────────────

  const openAddDiv = () => {
    setDivForm({ ...BLANK_DIVISION });
    setEditDiv(null);
    setSheetMode('div');
    setSheetOpen(true);
  };
  const openEditDiv = (d: Division) => {
    setDivForm({
      name: d.name, category: d.category, parent_division_id: d.parent_division_id,
      head_name: d.head_name, head_email: d.head_email, location: d.location,
      status: d.status, description: d.description, entity_id: d.entity_id,
    });
    setEditDiv(d);
    setSheetMode('div');
    setSheetOpen(true);
  };
  const openAddDept = () => {
    setDeptForm({ ...BLANK_DEPARTMENT });
    setEditDept(null);
    setSheetMode('dept');
    setSheetOpen(true);
  };
  const openEditDept = (d: Department) => {
    setDeptForm({
      name: d.name, division_id: d.division_id, parent_department_id: d.parent_department_id,
      head_name: d.head_name, head_email: d.head_email, location: d.location,
      budget: d.budget, status: d.status, description: d.description, entity_id: d.entity_id,
    });
    setEditDept(d);
    setSheetMode('dept');
    setSheetOpen(true);
  };

  // ── Save handlers ──────────────────────────────────────────────────

  const handleSaveDiv = () => {
    if (!divForm.name.trim()) { toast.error('Division name is required'); return; }
    if (editDiv) {
      updateDivision(editDiv.id, divForm);
    } else {
      createDivision(divForm);
    }
    setSheetOpen(false);
  };

  const handleSaveDept = () => {
    if (!deptForm.name.trim()) { toast.error('Department name is required'); return; }
    if (editDept) {
      updateDepartment(editDept.id, deptForm);
    } else {
      createDepartment(deptForm);
    }
    setSheetOpen(false);
  };

  // ── Filtering ──────────────────────────────────────────────────────

  const filteredDivisions = useMemo(() =>
    divisions.filter(d => !divSearch || d.name.toLowerCase().includes(divSearch.toLowerCase()) || d.code.toLowerCase().includes(divSearch.toLowerCase())),
    [divisions, divSearch]);

  const filteredDepartments = useMemo(() =>
    departments.filter(d => {
      if (deptDivFilter === '__none__' && d.division_id !== null) return false;
      if (deptDivFilter !== 'all' && deptDivFilter !== '__none__' && d.division_id !== deptDivFilter) return false;
      if (deptSearch && !d.name.toLowerCase().includes(deptSearch.toLowerCase()) && !d.code.toLowerCase().includes(deptSearch.toLowerCase())) return false;
      return true;
    }),
    [departments, deptDivFilter, deptSearch]);

  // ── Dept parent options based on division ──────────────────────────
  const deptParentOptions = useMemo(() =>
    departments.filter(d => {
      if (editDept && d.id === editDept.id) return false;
      if (deptForm.division_id && d.division_id !== deptForm.division_id) return false;
      return true;
    }),
    [departments, deptForm.division_id, editDept]);

  const getCategoryColor = (cat: DivisionCategory) => {
    switch (cat) {
      case 'corporate': return 'bg-blue-500/15 text-blue-700 border-blue-500/30';
      case 'operations': return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
      case 'commercial': return 'bg-teal-500/15 text-teal-700 border-teal-500/30';
      case 'technical': return 'bg-purple-500/15 text-purple-700 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 font-display">
            <Network className="h-5 w-5 text-teal-600" /> Organisation Structure
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {activeDivisions} division{activeDivisions !== 1 ? 's' : ''} · {activeDepartments} department{activeDepartments !== 1 ? 's' : ''} active
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPresetOpen(true)} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Quick Setup
          </Button>
          <Button size="sm" onClick={() => tab === 'divisions' ? openAddDiv() : openAddDept()} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add {tab === 'divisions' ? 'Division' : 'Department'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as 'divisions' | 'departments')}>
        <TabsList>
          <TabsTrigger value="divisions" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Divisions
            <Badge variant="secondary" className="text-[10px] ml-1">{divisions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">
            <Users className="h-3.5 w-3.5" /> Departments
            <Badge variant="secondary" className="text-[10px] ml-1">{departments.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Divisions Tab ── */}
        <TabsContent value="divisions" className="space-y-4">
          <Input placeholder="Search divisions…" value={divSearch}
            onChange={e => setDivSearch(e.target.value)} className="max-w-sm h-9 text-xs" />

          {filteredDivisions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No divisions yet. Use <strong>Quick Setup</strong> or add manually.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDivisions.map(div => {
                const depts = departments.filter(d => d.division_id === div.id);
                return (
                  <Collapsible key={div.id}>
                    <div className="border rounded-lg">
                      <div className="flex items-center gap-3 p-3">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="shrink-0">
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                          </button>
                        </CollapsibleTrigger>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{div.name}</span>
                            <Badge variant="outline" className={cn('text-[10px]', getCategoryColor(div.category))}>
                              {DIVISION_CATEGORY_LABELS[div.category]}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">{div.code}</Badge>
                            {div.status === 'inactive' && <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-700 border-red-500/30">Inactive</Badge>}
                          </div>
                          {div.description && <p className="text-[10px] text-muted-foreground mt-0.5">{div.description}</p>}
                          <p className="text-[10px] text-muted-foreground">{depts.length} department{depts.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDiv(div)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => deleteDivision(div.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <CollapsibleContent>
                        {depts.length > 0 && (
                          <div className="border-t px-3 py-2 space-y-1 bg-muted/20">
                            {depts.map(d => (
                              <div key={d.id} className="flex items-center justify-between text-xs py-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{d.code}</span>
                                  <span>{d.name}</span>
                                  {d.status === 'inactive' && <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-700">Inactive</Badge>}
                                </div>
                                <div className="flex gap-1">
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditDept(d)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600" onClick={() => deleteDepartment(d.id)}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Departments Tab ── */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex gap-3">
            <Input placeholder="Search departments…" value={deptSearch}
              onChange={e => setDeptSearch(e.target.value)} className="max-w-sm h-9 text-xs" />
            <Select value={deptDivFilter} onValueChange={setDeptDivFilter}>
              <SelectTrigger className="w-52 h-9 text-xs"><SelectValue placeholder="All divisions" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Divisions</SelectItem>
                {divisions.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredDepartments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No departments found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Division</TableHead>
                  <TableHead className="text-xs">Head</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDepartments.map(d => {
                  const div = divisions.find(v => v.id === d.division_id);
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs font-mono">{d.code}</TableCell>
                      <TableCell className="text-xs font-medium">{d.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{div?.name ?? '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.head_name || '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]',
                          d.status === 'active' ? 'bg-green-500/10 text-green-700 border-green-500/30' : 'bg-red-500/10 text-red-700 border-red-500/30'
                        )}>{d.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDept(d)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => deleteDepartment(d.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Sheet — Division or Department form ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {sheetMode === 'div'
                ? (editDiv ? 'Edit Division' : 'Add Division')
                : (editDept ? 'Edit Department' : 'Add Department')}
            </SheetTitle>
            <SheetDescription>
              {sheetMode === 'div' ? 'Division details' : 'Department details'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-3 mt-4" data-keyboard-form>
            {sheetMode === 'div' ? (
              <>
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={divForm.name}
                    onChange={e => setDivForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={onEnterNext} placeholder="e.g. Operations Division" />
                </div>
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select value={divForm.category} onValueChange={v => setDivForm(f => ({ ...f, category: v as DivisionCategory }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(DIVISION_CATEGORY_LABELS) as [DivisionCategory, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Head Name</Label>
                  <Input value={divForm.head_name}
                    onChange={e => setDivForm(f => ({ ...f, head_name: e.target.value }))}
                    onKeyDown={onEnterNext} />
                </div>
                <div>
                  <Label className="text-xs">Head Email</Label>
                  <Input type="email" value={divForm.head_email}
                    onChange={e => setDivForm(f => ({ ...f, head_email: e.target.value }))}
                    onKeyDown={onEnterNext} />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={divForm.location}
                    onChange={e => setDivForm(f => ({ ...f, location: e.target.value }))}
                    onKeyDown={onEnterNext} placeholder="Office, Plant, Floor" />
                </div>
                <div>
                  <Label className="text-xs">Parent Division</Label>
                  <Select value={divForm.parent_division_id ?? '__none__'}
                    onValueChange={v => setDivForm(f => ({ ...f, parent_division_id: v === '__none__' ? null : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None (top-level)</SelectItem>
                      {divisions.filter(d => !editDiv || d.id !== editDiv.id).map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} value={divForm.description}
                    onChange={e => setDivForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={divForm.status === 'active'}
                    onCheckedChange={v => setDivForm(f => ({ ...f, status: v ? 'active' : 'inactive' }))} />
                  <Label className="text-xs">Active</Label>
                </div>
                <Separator />
                <Button size="sm" onClick={handleSaveDiv} data-primary className="w-full">
                  {editDiv ? 'Update Division' : 'Create Division'}
                </Button>
              </>
            ) : (
              <>
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={deptForm.name}
                    onChange={e => setDeptForm(f => ({ ...f, name: e.target.value }))}
                    onKeyDown={onEnterNext} placeholder="e.g. Finance & Accounts" />
                </div>
                <div>
                  <Label className="text-xs">Division</Label>
                  <Select value={deptForm.division_id ?? '__none__'}
                    onValueChange={v => setDeptForm(f => ({ ...f, division_id: v === '__none__' ? null : v, parent_department_id: null }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— No Division</SelectItem>
                      {divisions.filter(d => d.status === 'active').map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Head Name</Label>
                  <Input value={deptForm.head_name}
                    onChange={e => setDeptForm(f => ({ ...f, head_name: e.target.value }))}
                    onKeyDown={onEnterNext} />
                </div>
                <div>
                  <Label className="text-xs">Head Email</Label>
                  <Input type="email" value={deptForm.head_email}
                    onChange={e => setDeptForm(f => ({ ...f, head_email: e.target.value }))}
                    onKeyDown={onEnterNext} />
                </div>
                <div>
                  <Label className="text-xs">Location</Label>
                  <Input value={deptForm.location}
                    onChange={e => setDeptForm(f => ({ ...f, location: e.target.value }))}
                    onKeyDown={onEnterNext} />
                </div>
                <div>
                  <Label className="text-xs">Parent Department</Label>
                  <Select value={deptForm.parent_department_id ?? '__none__'}
                    onValueChange={v => setDeptForm(f => ({ ...f, parent_department_id: v === '__none__' ? null : v }))}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— None</SelectItem>
                      {deptParentOptions.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Budget</Label>
                  <Input type="text" inputMode="decimal" value={deptForm.budget ?? ''}
                    onChange={e => setDeptForm(f => ({ ...f, budget: e.target.value ? parseFloat(e.target.value) || null : null }))}
                    onKeyDown={onEnterNext} placeholder="Optional" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} value={deptForm.description}
                    onChange={e => setDeptForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={deptForm.status === 'active'}
                    onCheckedChange={v => setDeptForm(f => ({ ...f, status: v ? 'active' : 'inactive' }))} />
                  <Label className="text-xs">Active</Label>
                </div>
                <Separator />
                <Button size="sm" onClick={handleSaveDept} data-primary className="w-full">
                  {editDept ? 'Update Department' : 'Create Department'}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Preset Dialog */}
      <PresetDialog open={presetOpen} onOpenChange={setPresetOpen} onImport={importPreset} />
    </div>
  );
}

export default function OrgStructure() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <div className="flex-1 flex flex-col">
          <ERPHeader breadcrumbs={[
            { label: 'Foundation', href: '/erp/foundation/entities' },
            { label: 'Organisation Structure' },
          ]} />
          <main className="flex-1 p-6">
            <OrgStructurePanel />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
