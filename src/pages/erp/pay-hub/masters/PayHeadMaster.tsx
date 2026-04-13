/**
 * PayHeadMaster.tsx — M-1 Pay Head Master screen
 * Sheet panel for create/edit. 15 seed pay heads auto-present on first open.
 */
import { useState, useCallback } from 'react';
import {
  IndianRupee, Plus, Search, Edit2, ToggleLeft, ToggleRight,
  CheckCircle, XCircle, DollarSign, FileText, Percent, ArrowDownUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { usePayHeads } from '@/hooks/usePayHeads';
import { onEnterNext, useCtrlS } from '@/lib/keyboard';
import { cn } from '@/lib/utils';
import type { PayHead, PayHeadType, PayHeadCalcType } from '@/types/pay-hub';
import { PAY_HEAD_TYPE_LABELS, CALC_TYPE_LABELS } from '@/types/pay-hub';

const TYPE_COLORS: Record<PayHeadType, string> = {
  earning: 'bg-green-500/10 text-green-700 border-green-500/30',
  deduction: 'bg-red-500/10 text-red-700 border-red-500/30',
  employer_contribution: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  reimbursement: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  loan: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
};

const EARNING_SUBTYPES = [
  'basic','hra','da','conveyance','special_allowance','lta','medical',
  'shift_allowance','night_allowance','project_allowance','overtime_pay',
  'incentive','bonus','arrears','other_earning',
];
const DEDUCTION_SUBTYPES = [
  'epf','esi','pt','tds','loan_emi','advance_recovery','lop','vpf','other_deduction',
];
const ER_CONTRIB_SUBTYPES = [
  'epf_employer','eps','edli','esi_employer','gratuity_provision','nps_employer','other_er_contrib',
];

function getSubTypes(type: PayHeadType): string[] {
  switch (type) {
    case 'earning': return EARNING_SUBTYPES;
    case 'deduction': return DEDUCTION_SUBTYPES;
    case 'employer_contribution': return ER_CONTRIB_SUBTYPES;
    default: return ['other'];
  }
}

const EMPTY_FORM: Omit<PayHead, 'id' | 'code' | 'created_at' | 'updated_at'> = {
  name: '', shortName: '', type: 'earning', subType: 'basic',
  calculationType: 'fixed', calculationBasis: '', calculationValue: 0,
  calculationFormula: '', maxValueMonthly: 0, conditionalMaxWage: 0,
  affectsNet: true, taxable: false, partOfCTC: true, partOfGross: true,
  showInPayslip: true, showInCTCLetter: true, proRataOnLOP: true,
  roundToNearestRupee: true, status: 'active', effectiveFrom: '2024-04-01', effectiveTo: '',
};

export function PayHeadMasterPanel() {
  const { payHeads, earningCount, deductionCount, erContribCount, reimbCount, loanCount,
    createPayHead, updatePayHead, toggleStatus } = usePayHeads();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [calcFilter, setCalcFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('all');

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setSheetOpen(true);
  };

  const openEdit = (ph: PayHead) => {
    setEditId(ph.id);
    const { id, code, created_at, updated_at, ...rest } = ph;
    setForm(rest);
    setSheetOpen(true);
  };

  const handleSave = useCallback(() => {
    if (!form.name.trim()) return;
    if (editId) {
      updatePayHead(editId, form);
    } else {
      createPayHead(form);
    }
    setSheetOpen(false);
  }, [form, editId, updatePayHead, createPayHead]);

  useCtrlS(handleSave);

  const updateField = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  };

  // Filtering
  const filtered = payHeads.filter(ph => {
    if (activeTab !== 'all' && ph.type !== activeTab) return false;
    if (statusFilter !== 'all' && ph.status !== statusFilter) return false;
    if (calcFilter !== 'all' && ph.calculationType !== calcFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return ph.name.toLowerCase().includes(s) || ph.code.toLowerCase().includes(s) || ph.shortName.toLowerCase().includes(s);
    }
    return true;
  });

  const showCalcFields = !['computed', 'balancing', 'slab'].includes(form.calculationType);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
            <IndianRupee className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Pay Head Master</h2>
            <p className="text-xs text-muted-foreground">Salary component dictionary</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate} className="bg-violet-600 hover:bg-violet-700 text-white">
          <Plus className="h-4 w-4 mr-1" />New Pay Head
        </Button>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: 'Earnings', count: earningCount, color: 'text-green-600' },
          { label: 'Deductions', count: deductionCount, color: 'text-red-600' },
          { label: 'Employer Contributions', count: erContribCount, color: 'text-blue-600' },
          { label: 'Reimbursements', count: reimbCount, color: 'text-amber-600' },
          { label: 'Loan Heads', count: loanCount, color: 'text-purple-600' },
        ].map(s => (
          <Badge key={s.label} variant="outline" className="text-xs">
            <span className={s.color}>{s.count}</span>
            <span className="ml-1 text-muted-foreground">{s.label}</span>
          </Badge>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({payHeads.length})</TabsTrigger>
          <TabsTrigger value="earning">Earnings ({earningCount})</TabsTrigger>
          <TabsTrigger value="deduction">Deductions ({deductionCount})</TabsTrigger>
          <TabsTrigger value="employer_contribution">ER Contrib ({erContribCount})</TabsTrigger>
          <TabsTrigger value="reimbursement">Reimb ({reimbCount})</TabsTrigger>
          <TabsTrigger value="loan">Loan ({loanCount})</TabsTrigger>
        </TabsList>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search pay heads..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
              onKeyDown={onEnterNext}
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[120px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={calcFilter} onValueChange={setCalcFilter}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calc Types</SelectItem>
              {Object.entries(CALC_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value={activeTab} className="mt-0">
          {/* fallthrough — same table for all tabs */}
        </TabsContent>
      </Tabs>

      {/* Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Short</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Calc Type</TableHead>
                <TableHead className="text-xs">Value</TableHead>
                <TableHead className="text-xs">Flags</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No pay heads found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(ph => (
                  <TableRow key={ph.id} className="group hover:bg-muted/30">
                    <TableCell className="font-mono text-xs text-violet-600">{ph.code}</TableCell>
                    <TableCell className="text-xs font-medium">{ph.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{ph.shortName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]', TYPE_COLORS[ph.type])}>
                        {PAY_HEAD_TYPE_LABELS[ph.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{CALC_TYPE_LABELS[ph.calculationType]}</TableCell>
                    <TableCell className="text-xs font-mono">
                      {ph.calculationType === 'fixed'
                        ? `₹${ph.calculationValue}`
                        : ['percentage_basic', 'percentage_gross', 'percentage_ctc'].includes(ph.calculationType)
                          ? `${ph.calculationValue}%`
                          : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {ph.affectsNet && <span title="Affects Net"><DollarSign className="h-3 w-3 text-green-500" /></span>}
                        {ph.taxable && <span title="Taxable"><FileText className="h-3 w-3 text-amber-500" /></span>}
                        {ph.partOfCTC && <span title="Part of CTC"><Percent className="h-3 w-3 text-blue-500" /></span>}
                        {ph.proRataOnLOP && <span title="Pro-rata LOP"><ArrowDownUp className="h-3 w-3 text-purple-500" /></span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn('text-[10px]',
                        ph.status === 'active' ? 'text-emerald-600 border-emerald-500/30' : 'text-muted-foreground')}>
                        {ph.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ph)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleStatus(ph.id)}>
                          {ph.status === 'active' ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
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
            <SheetTitle>{editId ? 'Edit Pay Head' : 'New Pay Head'}</SheetTitle>
            <SheetDescription>
              {editId ? 'Modify pay head configuration' : 'Define a new salary component'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input value={form.name} onChange={e => updateField('name', e.target.value)}
                  onKeyDown={onEnterNext} placeholder="e.g. Basic Salary" className="text-xs" />
              </div>
              <div>
                <Label className="text-xs">Short Name *</Label>
                <Input value={form.shortName} onChange={e => updateField('shortName', e.target.value.slice(0, 8))}
                  onKeyDown={onEnterNext} placeholder="Max 8 chars" maxLength={8} className="text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={(v) => {
                  const t = v as PayHeadType;
                  updateField('type', t);
                  updateField('subType', getSubTypes(t)[0]);
                }}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PAY_HEAD_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Sub-type</Label>
                <Select value={form.subType} onValueChange={(v) => updateField('subType', v)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {getSubTypes(form.type).map(st => (
                      <SelectItem key={st} value={st}>{st.replace(/_/g, ' ').toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Calculation Type</Label>
                <Select value={form.calculationType} onValueChange={(v) => updateField('calculationType', v as PayHeadCalcType)}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CALC_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {showCalcFields && (
                <div>
                  <Label className="text-xs">Calculation Basis</Label>
                  <Select value={form.calculationBasis} onValueChange={(v) => updateField('calculationBasis', v)}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">— None —</SelectItem>
                      <SelectItem value="ctc">CTC</SelectItem>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="gross">Gross</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {showCalcFields && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    {form.calculationType === 'fixed' ? 'Amount (₹/month)' : 'Percentage (%)'}
                  </Label>
                  <Input type="number" value={form.calculationValue || ''}
                    onChange={e => updateField('calculationValue', parseFloat(e.target.value) || 0)}
                    onKeyDown={onEnterNext} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Max Value (₹/month)</Label>
                  <Input type="number" value={form.maxValueMonthly || ''}
                    onChange={e => updateField('maxValueMonthly', parseFloat(e.target.value) || 0)}
                    onKeyDown={onEnterNext} className="text-xs" placeholder="0 = no cap" />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Conditional Max Wage</Label>
              <Input type="number" value={form.conditionalMaxWage || ''}
                onChange={e => updateField('conditionalMaxWage', parseFloat(e.target.value) || 0)}
                onKeyDown={onEnterNext} className="text-xs" placeholder="0 = always apply. e.g. ESI: 21000" />
            </div>

            <div className="border-t border-border/50 pt-4 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Flags</p>
              {[
                { key: 'affectsNet' as const, label: 'Affects Net Pay' },
                { key: 'taxable' as const, label: 'Taxable' },
                { key: 'partOfCTC' as const, label: 'Part of CTC' },
                { key: 'partOfGross' as const, label: 'Part of Gross' },
                { key: 'showInPayslip' as const, label: 'Show in Payslip' },
                { key: 'showInCTCLetter' as const, label: 'Show in CTC Letter' },
                { key: 'proRataOnLOP' as const, label: 'Pro-Rata on LOP' },
                { key: 'roundToNearestRupee' as const, label: 'Round to Nearest ₹' },
              ].map(flag => (
                <div key={flag.key} className="flex items-center justify-between">
                  <Label className="text-xs">{flag.label}</Label>
                  <Switch checked={form[flag.key]} onCheckedChange={(v) => updateField(flag.key, v)} />
                </div>
              ))}
            </div>

            <div>
              <Label className="text-xs">Effective From</Label>
              <Input type="date" value={form.effectiveFrom}
                onChange={e => updateField('effectiveFrom', e.target.value)}
                onKeyDown={onEnterNext} className="text-xs" />
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
              {editId ? 'Update' : 'Create'} Pay Head
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function PayHeadMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Pay Hub', href: '/erp/pay-hub' }, { label: 'Pay Heads' }]}
          showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6"><PayHeadMasterPanel /></div>
      </div>
    </SidebarProvider>
  );
}
