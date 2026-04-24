/**
 * @file     ExpenseLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Expense ledgers — tree + 6-step sidebar.
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { L3_FINANCIAL_GROUPS, deriveLedgerNumericCode } from '@/data/finframe-seed-data';
import { loadEntities } from '@/data/mock-entities';

interface ExpenseLedger {
  id: string;
  ledgerType: 'expense';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  isGstApplicable: boolean;
  hsnSacCode: string; hsnSacType: 'hsn' | 'sac' | '';
  gstRate: number; cgstRate: number; sgstRate: number; igstRate: number; cessRate: number;
  gstType: 'taxable' | 'exempt' | 'nil_rated' | 'non_gst' | 'zero_rated';
  isItcEligible: boolean;
  isRcmApplicable: boolean;
  rcmSection: 'section_9_3' | 'section_9_4' | null;
  isTdsApplicable: boolean;
  tdsSection: string;
  allow_commission_base: boolean;
  usePurchaseAdditionalExpense: boolean;
  costCentreApplicable: boolean;
  isBudgetHead: boolean;
  expenseNature: 'revenue' | 'capital_expense';
  clause44Category: 'auto' | 'regular_taxable' | 'regular_exempted' | 'composition' | 'unregistered' | 'exclude';
  forceIncludeClause44: boolean;
  status: 'active' | 'suspended';
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

const EXPENSE_STEPS = [
  { id: 1, title: 'Identity',             description: 'Name, code, alias' },
  { id: 2, title: 'Scope & Parent Group', description: 'Entity, parent group' },
  { id: 3, title: 'Nature',               description: 'Revenue vs capital expense' },
  { id: 4, title: 'GST Input Config',     description: 'ITC eligible, HSN/SAC, RCM' },
  { id: 5, title: 'TDS Deduction',        description: 'TDS section, payee TDS type' },
  { id: 6, title: 'Audit & Notes',        description: 'Status, description' },
];

const EXPENSE_GROUPS = L3_FINANCIAL_GROUPS.filter(g =>
  ['PURCH', 'PRET', 'DLAB', 'DEXP', 'STCHG', 'EMPB', 'RENT', 'UTIL', 'TRAV', 'PRFEE', 'ADMIN', 'SELL', 'REPAIR',
   'INTEXP', 'BKCHG', 'FXLOSS', 'LSCOST', 'DTAN', 'AMINT'].includes(g.code));

function emptyDraft(): ExpenseLedger {
  return {
    id: `exp-${Date.now()}`, ledgerType: 'expense',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'ADMIN', parentGroupName: 'Administrative Expenses',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Dr',
    isGstApplicable: true, hsnSacCode: '', hsnSacType: '',
    gstRate: 18, cgstRate: 9, sgstRate: 9, igstRate: 18, cessRate: 0,
    gstType: 'taxable', isItcEligible: true,
    isRcmApplicable: false, rcmSection: null,
    isTdsApplicable: false, tdsSection: '',
    allow_commission_base: false, usePurchaseAdditionalExpense: false,
    costCentreApplicable: false, isBudgetHead: false,
    expenseNature: 'revenue',
    clause44Category: 'auto', forceIncludeClause44: false,
    status: 'active', description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: ExpenseLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode) out.push(2);
  if (d.expenseNature) out.push(3);
  if (!d.isGstApplicable || d.hsnSacCode.trim() || d.gstRate > 0) out.push(4);
  if (!d.isTdsApplicable || d.tdsSection.trim()) out.push(5);
  if (d.description.trim() || d.notes.trim() || d.status) out.push(6);
  return out;
}

export function ExpenseLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<ExpenseLedger>('expense');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseLedger>(emptyDraft());
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
    setDraft({ ...emptyDraft(), ...(raw as Partial<ExpenseLedger>), id: String(raw.id) } as ExpenseLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (isEdit) { update(draft.id, draft); toast.success('Expense ledger updated'); }
    else { create(draft); toast.success('Expense ledger created'); }
    setOpen(false);
  };

  const setField = <K extends keyof ExpenseLedger>(k: K, v: ExpenseLedger[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-rose-600" />
          <h3 className="text-sm font-semibold">Expense Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Expense Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No expense ledgers yet. Click + Add Expense Ledger above."
        renderLeafMeta={leaf => {
          const r = leaf.raw as Partial<ExpenseLedger>;
          return (
            <div className="flex gap-1.5">
              {r.isRcmApplicable && (
                <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/20">RCM</Badge>
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
            <DialogTitle>{isEdit ? 'Edit Expense Ledger' : 'New Expense Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={EXPENSE_STEPS}
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
                    <Label className="text-xs">Alias</Label>
                    <Input value={draft.alias} onChange={e => setField('alias', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Mailing Name</Label>
                  <Input value={draft.mailingName} onChange={e => setField('mailingName', e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Parent Group</Label>
                  <Select
                    value={draft.parentGroupCode}
                    onValueChange={v => {
                      const g = EXPENSE_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                <div>
                  <Label className="text-xs">Expense Nature</Label>
                  <Select value={draft.expenseNature} onValueChange={v => setField('expenseNature', v as ExpenseLedger['expenseNature'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Expense (P&amp;L)</SelectItem>
                      <SelectItem value="capital_expense">Capital Expense (Asset)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isBudgetHead} onCheckedChange={v => setField('isBudgetHead', v)} />
                  <Label className="text-xs">Mark as Budget Head</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={draft.costCentreApplicable} onCheckedChange={v => setField('costCentreApplicable', v)} />
                  <Label className="text-xs">Cost Centre Applicable</Label>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isGstApplicable} onCheckedChange={v => setField('isGstApplicable', v)} />
                  <Label className="text-xs">GST Applicable</Label>
                </div>
                {draft.isGstApplicable && (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">HSN/SAC Type</Label>
                        <Select value={draft.hsnSacType || 'sac'} onValueChange={v => setField('hsnSacType', v as ExpenseLedger['hsnSacType'])}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hsn">HSN</SelectItem>
                            <SelectItem value="sac">SAC</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">HSN/SAC Code</Label>
                        <Input value={draft.hsnSacCode} onChange={e => setField('hsnSacCode', e.target.value)} className="font-mono" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">GST Rate (%)</Label>
                        <Input type="number" value={draft.gstRate}
                          onChange={e => {
                            const r = Number(e.target.value) || 0;
                            setDraft(p => ({ ...p, gstRate: r, cgstRate: r / 2, sgstRate: r / 2, igstRate: r }));
                          }} className="font-mono" />
                      </div>
                      <div className="flex items-end gap-2">
                        <Switch checked={draft.isItcEligible} onCheckedChange={v => setField('isItcEligible', v)} />
                        <Label className="text-xs">ITC Eligible</Label>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={draft.isRcmApplicable}
                        onCheckedChange={v => setDraft(p => ({ ...p, isRcmApplicable: v, rcmSection: v ? (p.rcmSection ?? 'section_9_3') : null }))} />
                      <Label className="text-xs">RCM Applicable</Label>
                    </div>
                    {draft.isRcmApplicable && (
                      <div>
                        <Label className="text-xs">RCM Section</Label>
                        <Select value={draft.rcmSection ?? 'section_9_3'} onValueChange={v => setField('rcmSection', v as 'section_9_3' | 'section_9_4')}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="section_9_3">Sec 9(3) — Notified goods/services</SelectItem>
                            <SelectItem value="section_9_4">Sec 9(4) — Unregistered supplier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isTdsApplicable} onCheckedChange={v => setField('isTdsApplicable', v)} />
                  <Label className="text-xs">TDS Deductible on this expense</Label>
                </div>
                {draft.isTdsApplicable && (
                  <div>
                    <Label className="text-xs">TDS Section</Label>
                    <Input value={draft.tdsSection} onChange={e => setField('tdsSection', e.target.value)}
                      placeholder="e.g. 194C · 194I · 194J" className="font-mono" />
                  </div>
                )}
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as ExpenseLedger['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={draft.description} onChange={e => setField('description', e.target.value)} rows={2} />
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Expense Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
