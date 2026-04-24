/**
 * @file     LoanReceivableLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Loan Receivable ledgers — tree + 5-step sidebar.
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, ArrowUpRight } from 'lucide-react';
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

interface LoanReceivableLedger {
  id: string;
  ledgerType: 'loan_receivable';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  borrowerName: string; borrowerPhone: string; borrowerEmail: string;
  borrowerAddress: string; borrowerState: string; borrowerPincode: string;
  borrowerPAN: string;
  loanAmount: number; interestRate: number;
  interestType: 'simple' | 'compound';
  tenureMonths: number;
  disbursementDate: string; firstRepaymentDate: string;
  collateral: string; purpose: string;
  isTdsApplicable: boolean;
  tdsSection: string;
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

const LOAN_REC_STEPS = [
  { id: 1, title: 'Identity',              description: 'Name, code, counterparty' },
  { id: 2, title: 'Scope & Parent Group',  description: 'Entity, parent group' },
  { id: 3, title: 'Loan Terms',            description: 'Principal, rate, tenure, dates' },
  { id: 4, title: 'Collateral & Security', description: 'Collateral, purpose, guarantor' },
  { id: 5, title: 'Audit & Notes',         description: 'Status, TDS on interest received' },
];

const LOAN_REC_GROUPS = L3_FINANCIAL_GROUPS.filter(g =>
  ['LTLA', 'STLA', 'OTREC', 'ONCA'].includes(g.code));

function emptyDraft(): LoanReceivableLedger {
  return {
    id: `loanrec-${Date.now()}`, ledgerType: 'loan_receivable',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'STLA', parentGroupName: 'Short-Term Loans & Advances',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Dr',
    borrowerName: '', borrowerPhone: '', borrowerEmail: '',
    borrowerAddress: '', borrowerState: '', borrowerPincode: '',
    borrowerPAN: '',
    loanAmount: 0, interestRate: 0,
    interestType: 'simple',
    tenureMonths: 12,
    disbursementDate: '', firstRepaymentDate: '',
    collateral: '', purpose: '',
    isTdsApplicable: false, tdsSection: '194A',
    status: 'active', description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: LoanReceivableLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.parentGroupCode) out.push(2);
  if (d.loanAmount > 0 && d.tenureMonths > 0) out.push(3);
  if (d.collateral.trim() || d.purpose.trim()) out.push(4);
  if (d.description.trim() || d.notes.trim() || d.status) out.push(5);
  return out;
}

export function LoanReceivableLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<LoanReceivableLedger>('loan_receivable');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LoanReceivableLedger>(emptyDraft());
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
    setDraft({ ...emptyDraft(), ...(raw as Partial<LoanReceivableLedger>), id: String(raw.id) } as LoanReceivableLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (isEdit) { update(draft.id, draft); toast.success('Loan receivable updated'); }
    else { create(draft); toast.success('Loan receivable created'); }
    setOpen(false);
  };

  const setField = <K extends keyof LoanReceivableLedger>(k: K, v: LoanReceivableLedger[K]) =>
    setDraft(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-semibold">Loan Receivable Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Loan Receivable
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No loan receivables yet."
        renderLeafMeta={leaf => {
          const r = leaf.raw as Partial<LoanReceivableLedger>;
          return (
            <div className="flex gap-1.5">
              {r.borrowerName && <Badge variant="outline" className="text-[9px]">{r.borrowerName}</Badge>}
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
            <DialogTitle>{isEdit ? 'Edit Loan Receivable' : 'New Loan Receivable'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={LOAN_REC_STEPS}
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
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Borrower Name (who owes us)</Label>
                    <Input value={draft.borrowerName} onChange={e => setField('borrowerName', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Borrower PAN</Label>
                    <Input value={draft.borrowerPAN} onChange={e => setField('borrowerPAN', e.target.value.toUpperCase())} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={draft.borrowerPhone} onChange={e => setField('borrowerPhone', e.target.value)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={draft.borrowerEmail} onChange={e => setField('borrowerEmail', e.target.value)} />
                  </div>
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
                      const g = LOAN_REC_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LOAN_REC_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
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
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Principal (₹)</Label>
                    <Input type="number" value={draft.loanAmount}
                      onChange={e => setField('loanAmount', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Interest Rate (%)</Label>
                    <Input type="number" step="0.01" value={draft.interestRate}
                      onChange={e => setField('interestRate', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Tenure (months)</Label>
                    <Input type="number" value={draft.tenureMonths}
                      onChange={e => setField('tenureMonths', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Interest Type</Label>
                    <Select value={draft.interestType} onValueChange={v => setField('interestType', v as 'simple' | 'compound')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple Interest</SelectItem>
                        <SelectItem value="compound">Compound Interest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Disbursement Date</Label>
                    <Input type="date" value={draft.disbursementDate}
                      onChange={e => setField('disbursementDate', e.target.value)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">First Repayment Date</Label>
                    <Input type="date" value={draft.firstRepaymentDate}
                      onChange={e => setField('firstRepaymentDate', e.target.value)} className="font-mono" />
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Collateral / Security</Label>
                  <Textarea value={draft.collateral} onChange={e => setField('collateral', e.target.value)}
                    rows={2} placeholder="e.g. Personal guarantee from Director · Property at MIDC Plot No. 14" />
                </div>
                <div>
                  <Label className="text-xs">Purpose of Loan</Label>
                  <Textarea value={draft.purpose} onChange={e => setField('purpose', e.target.value)}
                    rows={2} placeholder="Working capital · Asset purchase · Bridge finance" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={draft.isTdsApplicable} onCheckedChange={v => setField('isTdsApplicable', v)} />
                  <Label className="text-xs">TDS deductible on interest received</Label>
                </div>
                {draft.isTdsApplicable && (
                  <div>
                    <Label className="text-xs">TDS Section</Label>
                    <Input value={draft.tdsSection} onChange={e => setField('tdsSection', e.target.value)}
                      className="font-mono" placeholder="194A" />
                  </div>
                )}
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as LoanReceivableLedger['status'])}>
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Loan Receivable'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
