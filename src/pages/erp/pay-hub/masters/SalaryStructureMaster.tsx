/**
 * SalaryStructureMaster.tsx — M-2 Salary Structure screen
 * Sheet panel with embedded components sub-table + CTC preview calculator.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  Calculator, Plus, Edit2, ToggleLeft, ToggleRight, Search,
  Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { usePayHubSalaryStructures } from '@/hooks/usePayHubSalaryStructures';
import { usePayHeads } from '@/hooks/usePayHeads';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { cn } from '@/lib/utils';
import type { SalaryStructure, SalaryStructureComponent, PayHeadType } from '@/types/pay-hub';
import { PAY_HEAD_TYPE_LABELS, CALC_TYPE_LABELS } from '@/types/pay-hub';

const EMPTY_FORM: Omit<SalaryStructure, 'id' | 'code' | 'created_at' | 'updated_at'> = {
  name: '', description: '', basedOn: 'ctc', minCTC: 0, maxCTC: 0,
  components: [], applicableGrades: [], applicableDesignations: [],
  effectiveFrom: '2024-04-01', effectiveTo: '', status: 'active',
};

const TYPE_ORDER: Record<PayHeadType, number> = {
  earning: 0, deduction: 1, employer_contribution: 2, reimbursement: 3, loan: 4,
};

function computeBreakdown(components: SalaryStructureComponent[], annualCTC: number) {
  if (annualCTC <= 0) return [];
  const monthlyCTC = annualCTC / 12;
  const results: { name: string; type: PayHeadType; monthly: number; annual: number }[] = [];
  let basic = 0;
  const gross = 0;

  // First pass: compute basic
  const basicComp = components.find(c => c.payHeadCode === 'BASIC');
  if (basicComp) {
    if (basicComp.calculationType === 'percentage_ctc') basic = (annualCTC * basicComp.calculationValue / 100) / 12;
    else if (basicComp.calculationType === 'fixed') basic = basicComp.calculationValue;
    else basic = monthlyCTC * 0.4;
  }

  // Second pass: compute all
  let totalEarnings = 0;
  const targetGross = monthlyCTC; // simplified

  components.forEach(c => {
    let val = 0;
    if (c.calculationType === 'percentage_ctc') val = (annualCTC * c.calculationValue / 100) / 12;
    else if (c.calculationType === 'percentage_basic') val = basic * c.calculationValue / 100;
    else if (c.calculationType === 'percentage_gross') val = gross > 0 ? gross * c.calculationValue / 100 : 0;
    else if (c.calculationType === 'fixed') val = c.calculationValue;
    else if (c.calculationType === 'balancing') val = 0; // filled later

    if (c.maxValueMonthly > 0 && val > c.maxValueMonthly) val = c.maxValueMonthly;

    if (c.payHeadType === 'earning') totalEarnings += val;
    results.push({ name: c.payHeadName, type: c.payHeadType, monthly: Math.round(val), annual: Math.round(val * 12) });
  });

  // Fill balancing component
  const balIdx = results.findIndex((_, i) => components[i]?.calculationType === 'balancing');
  if (balIdx >= 0) {
    const remaining = targetGross - totalEarnings;
    results[balIdx].monthly = Math.max(0, Math.round(remaining));
    results[balIdx].annual = results[balIdx].monthly * 12;
  }

  return results;
}

export function SalaryStructureMasterPanel() {
  const { structures, createStructure, updateStructure, toggleStatus } = usePayHubSalaryStructures();
  const { payHeads } = usePayHeads();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [previewCTC, setPreviewCTC] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);

  const activePayHeads = useMemo(() => payHeads.filter(ph => ph.status === 'active'), [payHeads]);

  const _grades: { id: string; name: string; code: string }[] = useMemo(() => {
    try {
      // [JWT] GET /api/pay-hub/masters/pay-grades
      const raw = localStorage.getItem('erp_pay_grades');
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, []);
  void _grades;

  const openCreate = () => { setEditId(null); setForm(EMPTY_FORM); setPreviewCTC(0); setSheetOpen(true); };
  const openEdit = (ss: SalaryStructure) => {
    setEditId(ss.id);
    const { id, code, created_at, updated_at, ...rest } = ss;
    setForm(rest);
    setPreviewCTC(0);
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!sheetOpen) return;

    if (!form.name.trim()) return;
    if (editId) updateStructure(editId, form);
    else createStructure(form);
    setSheetOpen(false);
  }, [form, editId, updateStructure, createStructure, sheetOpen]);

  useCtrlS(handleSave);

  const updateField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  const addComponent = (phId: string) => {
    const ph = activePayHeads.find(p => p.id === phId);
    if (!ph) return;
    if (form.components.some(c => c.payHeadId === phId)) return;
    const comp: SalaryStructureComponent = {
      payHeadId: ph.id, payHeadCode: ph.code, payHeadName: ph.name,
      payHeadType: ph.type, calculationType: ph.calculationType,
      calculationBasis: ph.calculationBasis, calculationValue: ph.calculationValue,
      maxValueMonthly: ph.maxValueMonthly, sortOrder: form.components.length,
    };
    updateField('components', [...form.components, comp]);
  };

  const removeComponent = (idx: number) => {
    updateField('components', form.components.filter((_, i) => i !== idx));
  };

  const moveComponent = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= form.components.length) return;
    const arr = [...form.components];
    [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
    updateField('components', arr.map((c, i) => ({ ...c, sortOrder: i })));
  };

  const sortedComponents = [...form.components].sort((a, b) => TYPE_ORDER[a.payHeadType] - TYPE_ORDER[b.payHeadType]);

  const filtered = structures.filter(ss => {
    if (!search) return true;
    const s = search.toLowerCase();
    return ss.name.toLowerCase().includes(s) || ss.code.toLowerCase().includes(s);
  });

  const totalComponents = structures.reduce((sum, ss) => sum + ss.components.length, 0);

  const previewBreakdown = useMemo(
    () => computeBreakdown(form.components, previewCTC),
    [form.components, previewCTC]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <Calculator className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Salary Structures</h2>
            <p className="text-xs text-muted-foreground">Define salary breakdown templates</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4 mr-1" />New Structure
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          <span className="text-violet-600">{structures.filter(s => s.status === 'active').length}</span>
          <span className="ml-1 text-muted-foreground">Active Structures</span>
        </Badge>
        <Badge variant="outline" className="text-xs">
          <span className="text-blue-600">{totalComponents}</span>
          <span className="ml-1 text-muted-foreground">Total Components</span>
        </Badge>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search structures..." value={search}
          onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" onKeyDown={onEnterNext} />
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-8" />
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Based On</TableHead>
                <TableHead className="text-xs">CTC Band</TableHead>
                <TableHead className="text-xs">Components</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No salary structures. Create your first one.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(ss => (
                  <>
                    <TableRow key={ss.id} className="group hover:bg-muted/30 cursor-pointer"
                      onClick={() => setExpandedRow(expandedRow === ss.id ? null : ss.id)}>
                      <TableCell>
                        {expandedRow === ss.id ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-violet-600">{ss.code}</TableCell>
                      <TableCell className="text-xs font-medium">{ss.name}</TableCell>
                      <TableCell className="text-xs uppercase">{ss.basedOn}</TableCell>
                      <TableCell className="text-xs font-mono">
                        {ss.minCTC > 0 ? `₹${(ss.minCTC / 100000).toFixed(1)}L — ₹${(ss.maxCTC / 100000).toFixed(1)}L` : '—'}
                      </TableCell>
                      <TableCell className="text-xs">{ss.components.length}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]',
                          ss.status === 'active' ? 'text-emerald-600 border-emerald-500/30' : 'text-muted-foreground')}>
                          {ss.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ss)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(ss.id)}>
                            {ss.status === 'active' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedRow === ss.id && ss.components.length > 0 && (
                      <TableRow key={`${ss.id}-expand`}>
                        <TableCell colSpan={8} className="bg-muted/20 p-4">
                          <div className="grid grid-cols-4 gap-2 text-[10px] font-semibold text-muted-foreground mb-2">
                            <span>Component</span><span>Type</span><span>Calc</span><span>Value</span>
                          </div>
                          {ss.components.map((c, i) => (
                            <div key={i} className="grid grid-cols-4 gap-2 text-xs py-1 border-t border-border/30">
                              <span className="font-medium">{c.payHeadName}</span>
                              <span>{PAY_HEAD_TYPE_LABELS[c.payHeadType]}</span>
                              <span>{CALC_TYPE_LABELS[c.calculationType]}</span>
                              <span className="font-mono">
                                {c.calculationType === 'fixed' ? `₹${c.calculationValue}` :
                                  ['percentage_basic', 'percentage_gross', 'percentage_ctc'].includes(c.calculationType)
                                    ? `${c.calculationValue}%` : '—'}
                              </span>
                            </div>
                          ))}
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto" data-keyboard-form>
          <SheetHeader>
            <SheetTitle>{editId ? 'Edit Salary Structure' : 'New Salary Structure'}</SheetTitle>
            <SheetDescription>Define salary breakdown template with components</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Section 1 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => updateField('name', e.target.value)}
                  onKeyDown={onEnterNext} className="text-xs" placeholder="e.g. Standard CTC Structure" />
              </div>
              <div>
                <Label className="text-xs">Based On</Label>
                <Select value={form.basedOn} onValueChange={(v) => updateField('basedOn', v as 'ctc' | 'gross' | 'basic')}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ctc">CTC</SelectItem>
                    <SelectItem value="gross">Gross</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs">Description</Label>
              <Textarea value={form.description} onChange={e => updateField('description', e.target.value)}
                className="text-xs" rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min CTC (Annual)</Label>
                <Input type="number" value={form.minCTC || ''} onChange={e => updateField('minCTC', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Max CTC (Annual)</Label>
                <Input type="number" value={form.maxCTC || ''} onChange={e => updateField('maxCTC', parseFloat(e.target.value) || 0)}
                  onKeyDown={onEnterNext} className="text-xs" />
              </div>
            </div>

            <div>
              <Label className="text-xs">Effective From</Label>
              <Input type="date" value={form.effectiveFrom} onChange={e => updateField('effectiveFrom', e.target.value)}
                onKeyDown={onEnterNext} className="text-xs" />
            </div>

            {/* Section 2 — Components */}
            <div className="border-t border-border/50 pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold">Salary Components ({form.components.length})</p>
                <Select onValueChange={addComponent}>
                  <SelectTrigger className="w-[200px] h-8 text-xs">
                    <SelectValue placeholder="+ Add Component" />
                  </SelectTrigger>
                  <SelectContent>
                    {activePayHeads.filter(ph => !form.components.some(c => c.payHeadId === ph.id)).map(ph => (
                      <SelectItem key={ph.id} value={ph.id}>
                        {ph.code} — {ph.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {sortedComponents.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No components added yet</p>
              ) : (
                <div className="space-y-1">
                  {sortedComponents.map((comp, idx) => {
                    const bgColor = comp.payHeadType === 'earning' ? 'bg-green-500/5'
                      : comp.payHeadType === 'deduction' ? 'bg-red-500/5' : 'bg-blue-500/5';
                    return (
                      <div key={comp.payHeadId} className={cn('flex items-center gap-2 rounded-md p-2 text-xs', bgColor)}>
                        <div className="flex flex-col gap-0.5">
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveComponent(idx, -1)}><ArrowUp className="h-3 w-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => moveComponent(idx, 1)}><ArrowDown className="h-3 w-3" /></Button>
                        </div>
                        <span className="font-mono text-violet-600 w-16 shrink-0">{comp.payHeadCode}</span>
                        <span className="flex-1 font-medium">{comp.payHeadName}</span>
                        <span className="text-muted-foreground w-28">{CALC_TYPE_LABELS[comp.calculationType]}</span>
                        <Input type="number" className="w-20 h-7 text-xs"
                          value={comp.calculationValue || ''}
                          onChange={e => {
                            const updated = form.components.map(c =>
                              c.payHeadId === comp.payHeadId ? { ...c, calculationValue: parseFloat(e.target.value) || 0 } : c
                            );
                            updateField('components', updated);
                          }}
                          onKeyDown={onEnterNext}
                        />
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeComponent(idx)}>
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 3 — CTC Preview */}
            <Collapsible open={previewOpen} onOpenChange={setPreviewOpen} className="border-t border-border/50 pt-4">
              <CollapsibleTrigger className="flex items-center gap-1 text-xs font-semibold text-violet-600">
                {previewOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                CTC Preview Calculator
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-3">
                <div>
                  <Label className="text-xs">Annual CTC</Label>
                  <Input type="number" value={previewCTC || ''} onChange={e => setPreviewCTC(parseFloat(e.target.value) || 0)}
                    onKeyDown={onEnterNext} className="text-xs" placeholder="Enter annual CTC" />
                </div>
                {previewCTC > 0 && previewBreakdown.length > 0 && (
                  <div className="rounded-md border border-border/50 p-3 space-y-1">
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold text-muted-foreground">
                      <span>Component</span><span className="text-right">Monthly ₹</span><span className="text-right">Annual ₹</span>
                    </div>
                    {previewBreakdown.map((row, i) => (
                      <div key={i} className="grid grid-cols-3 gap-2 text-xs border-t border-border/20 py-1">
                        <span>{row.name}</span>
                        <span className="text-right font-mono">{row.monthly.toLocaleString('en-IN')}</span>
                        <span className="text-right font-mono">{row.annual.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <p className="text-[9px] text-muted-foreground/60 pt-2">
                      This is indicative — actual computation runs during payroll processing
                    </p>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            <div className="flex items-center justify-between">
              <Label className="text-xs">Status</Label>
              <Switch
                checked={form.status === 'active'}
                onCheckedChange={(v) => updateField('status', v ? 'active' : 'inactive')}
              />
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} className="text-xs">Cancel</Button>
            <Button onClick={handleSave} data-primary className="text-xs bg-violet-600 hover:bg-violet-700 text-white">
              {editId ? 'Update' : 'Create'} Structure
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function SalaryStructureMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Pay Hub', href: '/erp/pay-hub' }, { label: 'Salary Structures' }]}
          showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6"><SalaryStructureMasterPanel /></div>
      </div>
    </SidebarProvider>
  );
}
