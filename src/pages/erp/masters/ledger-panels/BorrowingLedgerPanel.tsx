/**
 * @file     BorrowingLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Borrowing ledgers — tree + 7-step sidebar.
 *           Foundation for H1.5-D Loan/EMI module. Captures lender, loan
 *           agreement, EMI schedule preview, charges master, TDS/GST config,
 *           collateral & audit. Persists via useLedgerStore.
 * @sprint   T-H1.5-C-S6.5b
 * @finding  CC-059 / CC-061
 */
import { useMemo, useState } from 'react';
import { Plus, ArrowDownLeft, Eye, FileText, PlayCircle, History } from 'lucide-react';
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
import { LoanAgreementModal, type LenderType, type LoanType }
  from '@/features/ledger-master/components/modals/LoanAgreementModal';
import { EMIPreviewModal } from '@/features/ledger-master/components/modals/EMIPreviewModal';
import { calculateEMIAmount, type EMIScheduleRow }
  from '@/features/ledger-master/lib/emi-schedule-builder';
import { EMIScheduleTable } from '@/features/loan-emi/components/EMIScheduleTable';
import { LoanChargesMaster } from '@/features/loan-emi/components/LoanChargesMaster';
import { AccrualRunModal } from '@/features/loan-emi/components/AccrualRunModal';
import { LoanAccrualLog } from '@/features/loan-emi/components/LoanAccrualLog';
import type { EMIScheduleLiveRow } from '@/features/loan-emi/lib/emi-lifecycle-engine';
import type { AccrualLogEntry } from '@/features/loan-emi/lib/accrual-log';

interface BorrowingLedger {
  id: string;
  ledgerType: 'borrowing';
  name: string; mailingName: string; numericCode: string; code: string; alias: string;
  parentGroupCode: string; parentGroupName: string;
  entityId: string | null; entityShortCode: string | null;
  openingBalance: number; openingBalanceType: 'Dr' | 'Cr';
  lenderName: string;
  lenderType: LenderType;
  lenderPhone: string; lenderEmail: string; lenderAddress: string;
  loanAmount: number; interestRate: number;
  loanType: LoanType;
  tenureMonths: number; firstEmiDate: string;
  loanAccountNo: string; collateralPledged: string;
  emiAmount: number;
  repaymentScheduleGenerated: boolean;
  status: 'active' | 'suspended';
  description: string;
  notes: string;
  // ── S6.5b · H1.5-D foundation (all OPTIONAL — backward compat) ──
  processingFee?: number;
  processingFeeGst?: number;
  penalInterestRate?: number;
  chequeBounceCharge?: number;
  foreclosureChargeRate?: number;
  tdsApplicable?: boolean;
  tdsSection?: string;
  gstOnChargesApplicable?: boolean;
  emiScheduleCached?: EMIScheduleRow[];
  emiScheduleLive?: EMIScheduleLiveRow[];   // T-H1.5-D-D1: actionable lifecycle rows
  accrualLog?: AccrualLogEntry[];           // T-H1.5-D-D2: per-loan posting audit trail
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

const BORROWING_STEPS = [
  { id: 1, title: 'Identity',               description: 'Name, code, loan account no' },
  { id: 2, title: 'Lender Details',         description: 'Lender type, name, contact' },
  { id: 3, title: 'Loan Agreement',         description: 'Loan type, principal, rate, tenure' },
  { id: 4, title: 'EMI Schedule',           description: 'First EMI date, amount, preview' },
  { id: 5, title: 'Charges Master',         description: 'Processing, foreclosure, penal, bounce' },
  { id: 6, title: 'TDS & GST',              description: 'TDS 194A, GST on charges' },
  { id: 7, title: 'Collateral & Audit',     description: 'Collateral, status, history' },
];

const BORROW_GROUPS = L3_FINANCIAL_GROUPS.filter(g =>
  ['LTBOR', 'STBOR', 'BOND'].includes(g.code));

function emptyDraft(): BorrowingLedger {
  return {
    id: `borrow-${Date.now()}`, ledgerType: 'borrowing',
    name: '', mailingName: '', numericCode: '', code: '', alias: '',
    parentGroupCode: 'STBOR', parentGroupName: 'Short-Term Borrowings',
    entityId: null, entityShortCode: null,
    openingBalance: 0, openingBalanceType: 'Cr',
    lenderName: '', lenderType: 'bank',
    lenderPhone: '', lenderEmail: '', lenderAddress: '',
    loanAmount: 0, interestRate: 0,
    loanType: 'term_loan',
    tenureMonths: 12, firstEmiDate: '',
    loanAccountNo: '', collateralPledged: '',
    emiAmount: 0,
    repaymentScheduleGenerated: false,
    status: 'active', description: '', notes: '',
    processingFee: 0, processingFeeGst: 18,
    penalInterestRate: 0, chequeBounceCharge: 0, foreclosureChargeRate: 0,
    tdsApplicable: false, tdsSection: '194A',
    gstOnChargesApplicable: true,
    emiScheduleCached: [],
    emiScheduleLive: [],
    accrualLog: [],
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: BorrowingLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.lenderName.trim() && d.lenderType) out.push(2);
  if (d.loanAmount > 0 && d.interestRate >= 0 && d.tenureMonths > 0) out.push(3);
  if (d.firstEmiDate && d.emiAmount > 0) out.push(4);
  if ((d.processingFee ?? 0) >= 0) out.push(5);
  if (typeof d.tdsApplicable === 'boolean') out.push(6);
  if (d.status) out.push(7);
  return out;
}

export function BorrowingLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<BorrowingLedger>('borrowing');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BorrowingLedger>(emptyDraft());
  const [isEdit, setIsEdit] = useState(false);
  const [step, setStep] = useState(1);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [emiPreviewOpen, setEmiPreviewOpen] = useState(false);
  const [showChargesMaster, setShowChargesMaster] = useState(false);
  const [accrualRunOpen, setAccrualRunOpen] = useState(false);
  const [accrualLogOpen, setAccrualLogOpen] = useState(false);
  const entities = useMemo(() => loadEntities(), []);

  const tree = useMemo(() => buildLedgerTree(ledgers, {
    parentGroupField: 'parentGroupCode',
    parentGroupLabelField: 'parentGroupName',
    entityField: 'entityShortCode',
  }), [ledgers]);

  const recomputeEMI = (next: BorrowingLedger): BorrowingLedger => {
    const emi = calculateEMIAmount(next.loanAmount, next.interestRate, next.tenureMonths);
    return { ...next, emiAmount: emi };
  };

  const openCreate = () => {
    const d = emptyDraft();
    d.numericCode = deriveLedgerNumericCode(d.parentGroupCode, ledgers.length + 1);
    setDraft(d); setIsEdit(false); setStep(1); setOpen(true);
  };

  const openEdit = (raw: Record<string, unknown>) => {
    setDraft({ ...emptyDraft(), ...(raw as Partial<BorrowingLedger>), id: String(raw.id) } as BorrowingLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    const out = recomputeEMI(draft);
    if (isEdit) { update(draft.id, out); toast.success('Borrowing updated'); }
    else { create(out); toast.success('Borrowing created'); }
    setOpen(false);
  };

  const setField = <K extends keyof BorrowingLedger>(k: K, v: BorrowingLedger[K]) =>
    setDraft(p => recomputeEMI({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-4 w-4 text-rose-600" />
          <h3 className="text-sm font-semibold">Borrowings</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Borrowing
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No borrowings yet."
        renderLeafMeta={leaf => {
          const r = leaf.raw as Partial<BorrowingLedger>;
          return (
            <div className="flex gap-1.5">
              {r.lenderName && <Badge variant="outline" className="text-[9px]">{r.lenderName}</Badge>}
              {typeof r.emiAmount === 'number' && r.emiAmount > 0 && (
                <Badge variant="outline" className="text-[9px] font-mono">
                  EMI ₹{r.emiAmount.toLocaleString('en-IN')}
                </Badge>
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
            <DialogTitle>{isEdit ? 'Edit Borrowing' : 'New Borrowing'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={BORROWING_STEPS}
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
                    <Label className="text-xs">Loan Account No</Label>
                    <Input value={draft.loanAccountNo} onChange={e => setField('loanAccountNo', e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Parent Group</Label>
                  <Select value={draft.parentGroupCode} onValueChange={v => {
                    const g = BORROW_GROUPS.find(x => x.code === v);
                    setDraft(p => recomputeEMI({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BORROW_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Entity Scope</Label>
                  <Select
                    value={draft.entityId ?? '__group__'}
                    onValueChange={v => {
                      if (v === '__group__') setDraft(p => recomputeEMI({ ...p, entityId: null, entityShortCode: null }));
                      else {
                        const e = entities.find(x => x.id === v);
                        setDraft(p => recomputeEMI({ ...p, entityId: v, entityShortCode: e?.shortCode ?? null }));
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

            {step === 2 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Lender Name</Label>
                    <Input value={draft.lenderName} onChange={e => setField('lenderName', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Lender Type</Label>
                    <Select value={draft.lenderType} onValueChange={v => setField('lenderType', v as LenderType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank">Bank</SelectItem>
                        <SelectItem value="nbfc">NBFC</SelectItem>
                        <SelectItem value="director">Director</SelectItem>
                        <SelectItem value="group_company">Group Company</SelectItem>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input value={draft.lenderPhone} onChange={e => setField('lenderPhone', e.target.value)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input value={draft.lenderEmail} onChange={e => setField('lenderEmail', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Address</Label>
                  <Textarea rows={2} value={draft.lenderAddress} onChange={e => setField('lenderAddress', e.target.value)} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-sm font-semibold">Loan Agreement</Label>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAgreementOpen(true)}>
                    <FileText className="h-3.5 w-3.5" /> Open Agreement Modal
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Loan Type</Label>
                    <Select value={draft.loanType} onValueChange={v => setField('loanType', v as LoanType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="term_loan">Term Loan</SelectItem>
                        <SelectItem value="od">Overdraft (OD)</SelectItem>
                        <SelectItem value="cc">Cash Credit (CC)</SelectItem>
                        <SelectItem value="demand_loan">Demand Loan</SelectItem>
                        <SelectItem value="vehicle_loan">Vehicle Loan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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
                </div>
                <div>
                  <Label className="text-xs">Tenure (months)</Label>
                  <Input type="number" value={draft.tenureMonths}
                    onChange={e => setField('tenureMonths', Number(e.target.value) || 0)} className="font-mono" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">First EMI Date</Label>
                    <Input type="date" value={draft.firstEmiDate}
                      onChange={e => setField('firstEmiDate', e.target.value)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">EMI Amount (auto)</Label>
                    <Input type="number" value={draft.emiAmount} readOnly className="font-mono bg-muted/30" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold">EMI Schedule</h3>
                    <p className="text-xs text-muted-foreground">
                      Track each EMI through its lifecycle. Mark payments and bounces as they happen.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEmiPreviewOpen(true)}
                      disabled={draft.loanAmount <= 0 || draft.tenureMonths <= 0 || !draft.firstEmiDate}>
                      <Eye className="h-3.5 w-3.5" /> Preview / Generate
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => setAccrualRunOpen(true)}
                      disabled={!isEdit || draft.id.startsWith('borrow-')}>
                      <PlayCircle className="h-3.5 w-3.5" /> Run Accrual
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => setAccrualLogOpen(true)}
                      disabled={!isEdit || draft.id.startsWith('borrow-')}>
                      <History className="h-3.5 w-3.5" /> Accrual Log
                    </Button>
                  </div>
                </div>
                {isEdit && draft.id && !draft.id.startsWith('borrow-') ? (
                  <EMIScheduleTable ledgerId={draft.id} />
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                    Save the loan first to access the actionable schedule. Use Step 3 to enter loan terms.
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">Charges Master</h3>
                    <p className="text-xs text-muted-foreground">
                      Configure processing, penal, bounce, and foreclosure charges for this loan.
                    </p>
                  </div>
                  <Button size="sm" onClick={() => setShowChargesMaster(true)} className="gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Configure Charges
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Badge variant="outline" className="justify-start gap-2 py-1.5">
                    Processing Fee: <span className="font-mono ml-auto">₹{(draft.processingFee ?? 0).toLocaleString('en-IN')}</span>
                  </Badge>
                  <Badge variant="outline" className="justify-start gap-2 py-1.5">
                    Penal Rate: <span className="font-mono ml-auto">{(draft.penalInterestRate ?? 0).toFixed(3)}%/d</span>
                  </Badge>
                  <Badge variant="outline" className="justify-start gap-2 py-1.5">
                    Cheque Bounce: <span className="font-mono ml-auto">₹{(draft.chequeBounceCharge ?? 0).toLocaleString('en-IN')}</span>
                  </Badge>
                  <Badge variant="outline" className="justify-start gap-2 py-1.5">
                    Foreclosure: <span className="font-mono ml-auto">{(draft.foreclosureChargeRate ?? 0).toFixed(2)}%</span>
                  </Badge>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch checked={draft.tdsApplicable ?? false} onCheckedChange={v => setField('tdsApplicable', v)} />
                  <Label className="text-xs">TDS deductible on interest paid (Sec 194A)</Label>
                </div>
                {draft.tdsApplicable && (
                  <div>
                    <Label className="text-xs">TDS Section</Label>
                    <Input value={draft.tdsSection ?? '194A'}
                      onChange={e => setField('tdsSection', e.target.value)} className="font-mono" />
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <Switch checked={draft.gstOnChargesApplicable ?? true}
                    onCheckedChange={v => setField('gstOnChargesApplicable', v)} />
                  <Label className="text-xs">GST applicable on loan charges</Label>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Collateral Pledged</Label>
                  <Textarea rows={2} value={draft.collateralPledged}
                    onChange={e => setField('collateralPledged', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as BorrowingLedger['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea rows={2} value={draft.description} onChange={e => setField('description', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={draft.notes} onChange={e => setField('notes', e.target.value)} />
                </div>
              </div>
            )}
          </LedgerStepSidebar>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Borrowing'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoanAgreementModal
        open={agreementOpen}
        value={{
          lenderName: draft.lenderName,
          lenderType: draft.lenderType,
          loanType: draft.loanType,
          loanAmount: draft.loanAmount,
          interestRate: draft.interestRate,
          tenureMonths: draft.tenureMonths,
        }}
        onChange={v => setDraft(p => recomputeEMI({ ...p, ...v }))}
        onClose={() => setAgreementOpen(false)}
      />

      <EMIPreviewModal
        open={emiPreviewOpen}
        input={{
          principal: draft.loanAmount,
          annualRatePercent: draft.interestRate,
          tenureMonths: draft.tenureMonths,
          firstEmiDate: draft.firstEmiDate,
        }}
        onClose={() => setEmiPreviewOpen(false)}
        onRegenerated={rows => setDraft(p => ({ ...p, emiScheduleCached: rows, repaymentScheduleGenerated: rows.length > 0 }))}
      />

      <LoanChargesMaster
        open={showChargesMaster}
        value={{
          processingFee: draft.processingFee ?? 0,
          processingFeeGst: draft.processingFeeGst ?? 18,
          penalInterestRate: draft.penalInterestRate ?? 0,
          chequeBounceCharge: draft.chequeBounceCharge ?? 0,
          foreclosureChargeRate: draft.foreclosureChargeRate ?? 0,
          gstOnChargesApplicable: draft.gstOnChargesApplicable ?? true,
        }}
        onChange={v => setDraft(p => ({ ...p, ...v }))}
        onClose={() => setShowChargesMaster(false)}
      />

      <AccrualRunModal
        open={accrualRunOpen}
        onClose={() => setAccrualRunOpen(false)}
        ledgerId={isEdit && !draft.id.startsWith('borrow-') ? draft.id : undefined}
      />

      <Dialog open={accrualLogOpen} onOpenChange={setAccrualLogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Accrual Log — {draft.name || 'Loan'}</DialogTitle>
          </DialogHeader>
          <LoanAccrualLog ledgerId={draft.id} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
