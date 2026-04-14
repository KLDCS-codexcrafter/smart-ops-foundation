/**
 * PayGradeMaster.tsx — M-3 Pay Grade Master screen
 * Grade ladder + table + Sheet panel for create/edit.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  Award, Plus, Edit2, ToggleLeft, ToggleRight, Search,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { usePayGrades } from '@/hooks/usePayGrades';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { cn } from '@/lib/utils';
import type { PayGrade } from '@/types/pay-hub';
import { PAY_GRADES_KEY } from '@/types/pay-hub';
import { MasterPropagationDialog } from '@/components/pay-hub/MasterPropagationDialog';

const EMPTY_FORM: Omit<PayGrade, 'id' | 'code' | 'created_at' | 'updated_at'> = {
  name: '', level: 1, minCTC: 0, maxCTC: 0,
  minGross: 0, maxGross: 0, minBasic: 0, maxBasic: 0,
  salaryStructureId: '', salaryStructureName: '',
  promotionCriteriaYears: 0, promotionCriteriaRating: 0,
  nextGrades: [], description: '', status: 'active',
};

export function PayGradeMasterPanel() {
  const { grades, createGrade, updateGrade, toggleStatus } = usePayGrades();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [validationError, setValidationError] = useState('');
  const [propagateOpen, setPropagateOpen] = useState(false);
  const [lastSavedName, setLastSavedName] = useState('');
  const [lastSavedId, setLastSavedId] = useState('');

  const salaryStructures: { id: string; name: string; code: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/salary-structures
      const raw = localStorage.getItem('erp_salary_structures');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);

  const openCreate = () => {
    setEditId(null); setForm(EMPTY_FORM); setValidationError(''); setSheetOpen(true);
  };
  const openEdit = (g: PayGrade) => {
    setEditId(g.id);
    const { id, code, created_at, updated_at, ...rest } = g;
    setForm(rest);
    setValidationError('');
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;

    if (!form.name.trim()) return;
    if (form.maxCTC > 0 && form.maxCTC <= form.minCTC) {
      setValidationError('Max CTC must be greater than Min CTC');
      return;
    }
    setValidationError('');
    if (editId) {
      updateGrade(editId, form);
      setLastSavedName(form.name);
      setLastSavedId(editId);
    } else {
      const newGrade = createGrade(form);
      setLastSavedName(form.name);
      setLastSavedId(newGrade?.id || '');
    }
    setSheetOpen(false);
    setPropagateOpen(true);
  }, [form, editId, updateGrade, createGrade, sheetOpen]);

  useCtrlS(handleSave);

  const updateField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const filtered = grades.filter(g => {
    if (selectedLevel !== null && g.level !== selectedLevel) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return g.name.toLowerCase().includes(s) || g.code.toLowerCase().includes(s);
  });

  const existingLevels = new Set(grades.map(g => g.level));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Award className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pay Grades</h2>
            <p className="text-xs text-muted-foreground">Career levels and salary bands</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4 mr-1" />New Grade
        </Button>
      </div>

      {/* Grade ladder */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map(level => {
          const exists = existingLevels.has(level);
          const active = selectedLevel === level;
          return (
            <button
              key={level}
              onClick={() => setSelectedLevel(active ? null : level)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                exists
                  ? active
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 hover:bg-violet-500/25'
                  : 'bg-transparent text-muted-foreground/40 border-border/50',
              )}
            >
              L{level}
            </button>
          );
        })}
        {selectedLevel !== null && (
          <button onClick={() => setSelectedLevel(null)} className="text-[10px] text-muted-foreground hover:text-foreground ml-2">
            Clear filter
          </button>
        )}
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search grades..." value={search}
          onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" onKeyDown={onEnterNext} />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Level</TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">CTC Band (Annual)</TableHead>
                <TableHead className="text-xs">Salary Structure</TableHead>
                <TableHead className="text-xs">Promotion Criteria</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No pay grades. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(g => (
                  <TableRow key={g.id} className="group hover:bg-muted/30">
                    <TableCell>
                      <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30 text-xs">
                        L{g.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-violet-600">{g.code}</TableCell>
                    <TableCell className="text-xs font-medium">{g.name}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {g.minCTC > 0 ? `₹${(g.minCTC / 100000).toFixed(1)}L — ₹${(g.maxCTC / 100000).toFixed(1)}L` : '—'}
                    </TableCell>
                    <TableCell className="text-xs">{g.salaryStructureName || '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {g.promotionCriteriaYears > 0 ? `${g.promotionCriteriaYears}y / ≥${g.promotionCriteriaRating}★` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]',
                        g.status === 'active' ? 'text-emerald-600 border-emerald-500/30' : 'text-muted-foreground')}>
                        {g.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(g)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(g.id)}>
                          {g.status === 'active' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto" data-keyboard-form>
          <SheetHeader>
            <SheetTitle>{editId ? 'Edit Pay Grade' : 'New Pay Grade'}</SheetTitle>
            <SheetDescription>Define career level and salary band</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Grade Name *</Label>
                <Input value={form.name} onChange={e => updateField('name', e.target.value)}
                  onKeyDown={onEnterNext} className="text-xs" placeholder="e.g. Junior / Senior" />
              </div>
              <div>
                <Label className="text-xs">Level *</Label>
                <Select value={String(form.level)} onValueChange={(v) => updateField('level', parseInt(v))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(l => (
                      <SelectItem key={l} value={String(l)}>Level {l} (PG-L{l})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min CTC (Annual) *</Label>
                <Input type="number" value={form.minCTC || ''} onChange={e => updateField('minCTC', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" placeholder="₹ Annual" />
              </div>
              <div>
                <Label className="text-xs">Max CTC (Annual) *</Label>
                <Input type="number" value={form.maxCTC || ''} onChange={e => updateField('maxCTC', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" placeholder="₹ Annual" />
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-red-500">{validationError}</p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Gross (Monthly)</Label>
                <Input type="number" value={form.minGross || ''} onChange={e => updateField('minGross', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Max Gross (Monthly)</Label>
                <Input type="number" value={form.maxGross || ''} onChange={e => updateField('maxGross', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min Basic (Monthly)</Label>
                <Input type="number" value={form.minBasic || ''} onChange={e => updateField('minBasic', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Max Basic (Monthly)</Label>
                <Input type="number" value={form.maxBasic || ''} onChange={e => updateField('maxBasic', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Linked Salary Structure</Label>
              <Select value={form.salaryStructureId}
                onValueChange={(v) => {
                  const ss = salaryStructures.find(s => s.id === v);
                  updateField('salaryStructureId', v);
                  updateField('salaryStructureName', ss ? `${ss.code} — ${ss.name}` : '');
                }}>
                <SelectTrigger className="text-xs"><SelectValue placeholder="Select structure" /></SelectTrigger>
                <SelectContent>
                  {salaryStructures.length === 0 ? (
                    <SelectItem value="__none" disabled>No structures created yet</SelectItem>
                  ) : (
                    salaryStructures.map(ss => (
                      <SelectItem key={ss.id} value={ss.id}>{ss.code} — {ss.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Promotion — Min Years</Label>
                <Input type="number" value={form.promotionCriteriaYears || ''} onChange={e => updateField('promotionCriteriaYears', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" placeholder="e.g. 2" />
              </div>
              <div>
                <Label className="text-xs">Promotion — Min Rating</Label>
                <Input type="number" step="0.1" value={form.promotionCriteriaRating || ''} onChange={e => updateField('promotionCriteriaRating', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" placeholder="e.g. 3.5" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => updateField('description', e.target.value)}
                className="text-xs" rows={2} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Status</Label>
              <Switch checked={form.status === 'active'}
                onCheckedChange={(v) => updateField('status', v ? 'active' : 'inactive')} />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} data-primary className="text-xs bg-violet-600 hover:bg-violet-700 text-white">
              {editId ? 'Update' : 'Create'} Grade
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function PayGradeMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Pay Hub', href: '/erp/pay-hub' }, { label: 'Pay Grades' }]}
          showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6"><PayGradeMasterPanel /></div>
      </div>
    </SidebarProvider>
  );
}
