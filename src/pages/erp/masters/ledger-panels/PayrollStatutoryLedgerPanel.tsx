/**
 * @file     PayrollStatutoryLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Payroll-Statutory ledgers (PF/ESI/PT/TDS-Salary/LWF).
 *           Tree + 5-step sidebar. Persists via useLedgerStore (erp_group_ledger_definitions).
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { LedgerTreeList } from '@/features/ledger-master/components/LedgerTreeList';
import { LedgerStepSidebar } from '@/features/ledger-master/components/LedgerStepSidebar';
import { buildLedgerTree } from '@/features/ledger-master/lib/ledger-tree-builder';
import { useLedgerStore } from '@/features/ledger-master/hooks/useLedgerStore';
import { deriveLedgerNumericCode } from '@/data/finframe-seed-data';
import { loadEntities } from '@/data/mock-entities';

type PayrollCategory = 'employee_deduction' | 'employer_contribution';
type PayrollComponent =
  | 'pf_employee' | 'esi_employee' | 'pt_employee' | 'tds_salary'
  | 'pf_employer_epf' | 'pf_employer_eps' | 'pf_edli'
  | 'esi_employer' | 'lwf_employer' | 'gratuity_provision';

interface PayrollStatLedger {
  id: string;
  ledgerType: 'payroll_statutory';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: 'EMPL'; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Cr';
  status: 'active' | 'suspended';
  payrollCategory: PayrollCategory;
  payrollComponent: PayrollComponent;
  statutoryRate: number;
  // Mirror for smoke-test — keep both for compat
  employerSharePercent: number;
  employeeSharePercent: number;
  calculationBase: string;
  wageCeiling: number | null;
  maxAmount: number | null;
  challanFormat?: string;
  dueDayOfMonth?: number;
  portalUrl?: string;
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

const PAYROLL_STAT_STEPS = [
  { id: 1, title: 'Identity',              description: 'Name, code, statutory type' },
  { id: 2, title: 'Scope & Parent Group',  description: 'Entity, parent group' },
  { id: 3, title: 'Employer Share',        description: 'Employer contribution %, threshold' },
  { id: 4, title: 'Employee Share',        description: 'Employee deduction %, threshold' },
  { id: 5, title: 'Return & Challan',      description: 'Challan format, due day, portal' },
];

const COMPONENT_LABELS: Record<PayrollComponent, string> = {
  pf_employee: 'PF — Employee',
  esi_employee: 'ESI — Employee',
  pt_employee: 'Professional Tax — Employee',
  tds_salary: 'TDS — Salary (Sec 192)',
  pf_employer_epf: 'PF — Employer EPF',
  pf_employer_eps: 'PF — Employer EPS',
  pf_edli: 'EDLI — Employer',
  esi_employer: 'ESI — Employer',
  lwf_employer: 'LWF — Employer',
  gratuity_provision: 'Gratuity Provision',
};

function emptyDraft(): PayrollStatLedger {
  return {
    id: `psl-${Date.now()}`, ledgerType: 'payroll_statutory',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'EMPL', parentGroupName: 'Employee Liabilities',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Cr',
    status: 'active',
    payrollCategory: 'employee_deduction',
    payrollComponent: 'pf_employee',
    statutoryRate: 12,
    employerSharePercent: 0, employeeSharePercent: 12,
    calculationBase: 'basic_da',
    wageCeiling: 15000, maxAmount: null,
    challanFormat: '', dueDayOfMonth: 15, portalUrl: '',
    description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: PayrollStatLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode) out.push(2);
  if (typeof d.employerSharePercent === 'number') out.push(3);
  if (typeof d.employeeSharePercent === 'number') out.push(4);
  if (d.challanFormat || d.dueDayOfMonth) out.push(5);
  return out;
}

export function PayrollStatutoryLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<PayrollStatLedger>('payroll_statutory');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<PayrollStatLedger>(emptyDraft());
  const [isEdit, setIsEdit] = useState(false);
  const [step, setStep] = useState(1);
  const entities = useMemo(() => loadEntities(), []);

  const tree = useMemo(() => buildLedgerTree(ledgers, {
    parentGroupField: 'parentGroupCode',
    parentGroupLabelField: 'parentGroupName',
    entityField: 'entityShortCode',
  }), [ledgers]);

  const openCreate = () => {
    const d = emptyDraft();
    d.numericCode = deriveLedgerNumericCode(d.parentGroupCode, ledgers.length + 1);
    setDraft(d); setIsEdit(false); setStep(1); setOpen(true);
  };

  const openEdit = (raw: Record<string, unknown>) => {
    const merged = { ...emptyDraft(), ...(raw as Partial<PayrollStatLedger>), id: String(raw.id) } as PayrollStatLedger;
    if (typeof merged.employerSharePercent !== 'number') merged.employerSharePercent = merged.payrollCategory === 'employer_contribution' ? merged.statutoryRate : 0;
    if (typeof merged.employeeSharePercent !== 'number') merged.employeeSharePercent = merged.payrollCategory === 'employee_deduction' ? merged.statutoryRate : 0;
    setDraft(merged);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    // keep statutoryRate aligned with whichever side is dominant
    const out = { ...draft, statutoryRate: draft.payrollCategory === 'employer_contribution' ? draft.employerSharePercent : draft.employeeSharePercent };
    if (isEdit) { update(draft.id, out); toast.success('Payroll statutory ledger updated'); }
    else { create(out); toast.success('Payroll statutory ledger created'); }
    setOpen(false);
  };

  const setField = <K extends keyof PayrollStatLedger>(k: K, v: PayrollStatLedger[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-600" />
          <h3 className="text-sm font-semibold">Payroll Statutory Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Payroll Statutory
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No payroll statutory ledgers yet."
        renderLeafMeta={leaf => {
          const r = leaf.raw as Partial<PayrollStatLedger>;
          return (
            <div className="flex gap-1.5">
              {r.payrollComponent && (
                <Badge variant="outline" className="text-[9px]">{COMPONENT_LABELS[r.payrollComponent]}</Badge>
              )}
              <Badge variant="outline" className={`text-[9px] ${leaf.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                {leaf.status}
              </Badge>
            </div>
          );
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Payroll Statutory' : 'New Payroll Statutory'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={PAYROLL_STAT_STEPS}
            currentStep={step}
            onStepClick={setStep}
            completedSteps={computeCompletedSteps(draft)}
          >
            {step === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name *</Label>
                    <Input value={draft.name} onChange={e => setField('name', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Numeric Code</Label>
                    <Input value={draft.numericCode} onChange={e => setField('numericCode', e.target.value)} className="font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Code</Label>
                    <Input value={draft.code} onChange={e => setField('code', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Statutory Component</Label>
                    <Select value={draft.payrollComponent} onValueChange={v => {
                      const comp = v as PayrollComponent;
                      const isEmployee = comp === 'pf_employee' || comp === 'esi_employee' || comp === 'pt_employee' || comp === 'tds_salary';
                      setDraft(p => ({ ...p, payrollComponent: comp, payrollCategory: isEmployee ? 'employee_deduction' : 'employer_contribution' }));
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(COMPONENT_LABELS).map(([k, label]) =>
                          <SelectItem key={k} value={k}>{label}</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Parent Group</Label>
                  <Input value={draft.parentGroupName} disabled className="bg-muted/30" />
                  <p className="text-[10px] text-muted-foreground mt-1">Payroll statutory always sits under Employee Liabilities (EMPL).</p>
                </div>
                <div>
                  <Label className="text-xs">Entity Scope</Label>
                  <Select
                    value={draft.entityId ?? '__group__'}
                    onValueChange={v => {
                      if (v === '__group__') setDraft(p => ({ ...p, entityId: null, entityShortCode: null }));
                      else {
                        const e = entities.find(x => x.id === v);
                        setDraft(p => ({ ...p, entityId: v, entityShortCode: e?.shortCode ?? null }));
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__group__">Group Level (all entities)</SelectItem>
                      {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Employer Contribution (%)</Label>
                    <Input type="number" step="0.01" value={draft.employerSharePercent}
                      onChange={e => setField('employerSharePercent', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Wage Ceiling (₹)</Label>
                    <Input type="number" value={draft.wageCeiling ?? ''}
                      onChange={e => setField('wageCeiling', e.target.value === '' ? null : Number(e.target.value))} className="font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Max Amount Cap (₹)</Label>
                  <Input type="number" value={draft.maxAmount ?? ''}
                    onChange={e => setField('maxAmount', e.target.value === '' ? null : Number(e.target.value))} className="font-mono" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Employee Deduction (%)</Label>
                    <Input type="number" step="0.01" value={draft.employeeSharePercent}
                      onChange={e => setField('employeeSharePercent', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Calculation Base</Label>
                    <Select value={draft.calculationBase} onValueChange={v => setField('calculationBase', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic_da">Basic + DA</SelectItem>
                        <SelectItem value="gross">Gross Salary</SelectItem>
                        <SelectItem value="state_slab">State Slab</SelectItem>
                        <SelectItem value="state_specific">State Specific</SelectItem>
                        <SelectItem value="slab">IT Slab</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Challan Format</Label>
                    <Input value={draft.challanFormat ?? ''} onChange={e => setField('challanFormat', e.target.value)}
                      placeholder="e.g. ECR · Challan-281" />
                  </div>
                  <div>
                    <Label className="text-xs">Due Day of Month</Label>
                    <Input type="number" min={1} max={31} value={draft.dueDayOfMonth ?? 15}
                      onChange={e => setField('dueDayOfMonth', Number(e.target.value) || 15)} className="font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Portal URL</Label>
                  <Input value={draft.portalUrl ?? ''} onChange={e => setField('portalUrl', e.target.value)}
                    placeholder="e.g. https://unifiedportal-emp.epfindia.gov.in" />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as PayrollStatLedger['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea value={draft.notes} onChange={e => setField('notes', e.target.value)} rows={2} />
                </div>
              </div>
            )}
          </LedgerStepSidebar>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Payroll Statutory'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
