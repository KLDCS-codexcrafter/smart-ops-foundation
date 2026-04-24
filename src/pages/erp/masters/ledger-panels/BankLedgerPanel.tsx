/**
 * @file     BankLedgerPanel.tsx
 * @purpose  Full-pattern Panel for Bank ledgers — tree view + 7-step sidebar
 *           with IFSC auto-fill (reuses useIfscLookup from party-master).
 *           Reads/writes via useLedgerStore against erp_group_ledger_definitions.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { useMemo, useState } from 'react';
import { Plus, Landmark, Loader2 } from 'lucide-react';
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
import { useIfscLookup } from '@/features/party-master/hooks/useIfscLookup';
import { L3_FINANCIAL_GROUPS, deriveLedgerNumericCode } from '@/data/finframe-seed-data';
import { loadEntities } from '@/data/mock-entities';

type BankAccountType = 'current' | 'savings' | 'fixed_deposit' | 'eefc' | 'cash_credit' | 'overdraft';

interface BankLedger {
  id: string;
  ledgerType: 'bank';
  numericCode: string;
  code: string;
  name: string;
  alias: string;
  parentGroupCode: string;
  parentGroupName: string;
  entityId: string | null;
  entityShortCode: string | null;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: BankAccountType;
  currency: string;
  odLimit: number;
  branchName: string;
  branchAddress: string;
  branchCity: string;
  branchState: string;
  branchPincode: string;
  micrCode: string;
  swiftCode: string;
  ifscAutoFilled: boolean;
  bankGstin: string;
  bankStateCode: string;
  gstOnCharges: boolean;
  chequeFormat: 'HDFC_CTS' | 'SBI_CTS' | 'ICICI_CTS' | 'AXIS_CTS' | 'GENERIC_CTS' | 'CUSTOM';
  chequeSize: 'A4' | 'LEAF';
  defaultCrossing: 'account_payee' | 'not_negotiable' | 'none';
  brsEnabled: boolean;
  clearingDays: number;
  cutoffTime: string;
  status: 'active' | 'suspended' | 'dormant' | 'closed';
  mailingName: string;
  acHolderName: string;
  bankPhone: string;
  neftEnabled: boolean;
  rtgsEnabled: boolean;
  impsEnabled: boolean;
  upiEnabled: boolean;
  bankManagerName: string;
  bankManagerPhone: string;
  bankManagerEmail: string;
  description: string;
  notes: string;
  suspendedBy: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  reinstatedBy: string | null;
  reinstatedAt: string | null;
  reinstatedReason: string | null;
}

const BANK_STEPS = [
  { id: 1, title: 'Identity',             description: 'Name, code, alias' },
  { id: 2, title: 'Bank & Account',       description: 'Bank, A/C number, type, IFSC' },
  { id: 3, title: 'Branch Details',       description: 'Branch name, address, MICR, SWIFT' },
  { id: 4, title: 'Payment Rails',        description: 'NEFT, RTGS, IMPS, UPI, OD limit' },
  { id: 5, title: 'Manager Contact',      description: 'Manager name, phone, email' },
  { id: 6, title: 'Cheque & BRS',         description: 'Cheque format, BRS, clearing' },
  { id: 7, title: 'Tax & Audit',          description: 'GSTIN, status, notes' },
];

const BANK_GROUPS = L3_FINANCIAL_GROUPS.filter(g => g.isBank);

function emptyDraft(): BankLedger {
  return {
    id: `bank-${Date.now()}`, ledgerType: 'bank',
    numericCode: '', code: '', name: '', alias: '',
    parentGroupCode: 'BANK', parentGroupName: 'Bank Balances',
    entityId: null, entityShortCode: null,
    bankName: '', accountNumber: '', ifscCode: '',
    accountType: 'current', currency: 'INR', odLimit: 0,
    branchName: '', branchAddress: '', branchCity: '', branchState: '', branchPincode: '',
    micrCode: '', swiftCode: '', ifscAutoFilled: false,
    bankGstin: '', bankStateCode: '', gstOnCharges: true,
    chequeFormat: 'GENERIC_CTS', chequeSize: 'A4', defaultCrossing: 'account_payee',
    brsEnabled: true, clearingDays: 2, cutoffTime: '14:30',
    status: 'active', mailingName: '', acHolderName: '', bankPhone: '',
    neftEnabled: true, rtgsEnabled: true, impsEnabled: true, upiEnabled: true,
    bankManagerName: '', bankManagerPhone: '', bankManagerEmail: '',
    description: '', notes: '',
    suspendedBy: null, suspendedAt: null, suspendedReason: null,
    reinstatedBy: null, reinstatedAt: null, reinstatedReason: null,
  };
}

function computeCompletedSteps(d: BankLedger): number[] {
  const out: number[] = [];
  if (d.name.trim()) out.push(1);
  if (d.bankName.trim() && d.accountNumber.trim() && d.ifscCode.trim()) out.push(2);
  if (d.branchName.trim()) out.push(3);
  if (d.neftEnabled || d.rtgsEnabled || d.impsEnabled || d.upiEnabled) out.push(4);
  if (d.bankManagerName.trim()) out.push(5);
  if (d.chequeFormat) out.push(6);
  if (d.status) out.push(7);
  return out;
}

export function BankLedgerPanel() {
  const { ledgers, create, update } = useLedgerStore<BankLedger>('bank');
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<BankLedger>(emptyDraft());
  const [isEdit, setIsEdit] = useState(false);
  const [step, setStep] = useState(1);
  const { lookup, loading: ifscLoading } = useIfscLookup();
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
    setDraft({ ...emptyDraft(), ...(raw as Partial<BankLedger>), id: String(raw.id) } as BankLedger);
    setIsEdit(true); setStep(1); setOpen(true);
  };

  const handleIfscBlur = async () => {
    if (!draft.ifscCode || draft.ifscCode.length !== 11) return;
    const result = await lookup(draft.ifscCode);
    if (result) {
      setDraft(p => ({
        ...p,
        bankName: p.bankName || result.bankName,
        branchName: p.branchName || result.branchName,
        branchCity: p.branchCity || result.city,
        branchState: p.branchState || result.state,
        ifscAutoFilled: true,
      }));
      toast.success('Bank details auto-filled from IFSC');
    }
  };

  const save = () => {
    if (!draft.name.trim()) { toast.error('Name is required'); return; }
    if (!draft.bankName.trim()) { toast.error('Bank name is required'); return; }
    if (isEdit) { update(draft.id, draft); toast.success('Bank ledger updated'); }
    else { create(draft); toast.success('Bank ledger created'); }
    setOpen(false);
  };

  const setField = <K extends keyof BankLedger>(k: K, v: BankLedger[K]) =>
    setDraft(prev => ({ ...prev, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-semibold">Bank Ledgers</h3>
          <Badge variant="outline" className="text-[10px]">{ledgers.length} total</Badge>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Bank Ledger
        </Button>
      </div>

      <LedgerTreeList
        tree={tree}
        onLeafClick={leaf => openEdit(leaf.raw)}
        emptyState="No bank ledgers yet. Click + Add Bank Ledger above."
        renderLeafMeta={leaf => (
          <Badge variant="outline" className="text-[9px]">
            {String((leaf.raw as Record<string, unknown>).bankName ?? '')}
          </Badge>
        )}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Edit Bank Ledger' : 'New Bank Ledger'}</DialogTitle>
          </DialogHeader>

          <LedgerStepSidebar
            steps={BANK_STEPS}
            currentStep={step}
            onStepClick={setStep}
            completedSteps={computeCompletedSteps(draft)}
          >
            {step === 1 && (
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
                <div className="col-span-2">
                  <Label className="text-xs">Mailing Name</Label>
                  <Input value={draft.mailingName} onChange={e => setField('mailingName', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Parent Group</Label>
                  <Select
                    value={draft.parentGroupCode}
                    onValueChange={v => {
                      const g = BANK_GROUPS.find(x => x.code === v);
                      setDraft(p => ({ ...p, parentGroupCode: v, parentGroupName: g?.name ?? p.parentGroupName }));
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BANK_GROUPS.map(g => <SelectItem key={g.code} value={g.code}>{g.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
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
                      <SelectItem value="__group__">Group Level</SelectItem>
                      {entities.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.shortCode})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Bank Name *</Label>
                  <Input value={draft.bankName} onChange={e => setField('bankName', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Account Number</Label>
                  <Input value={draft.accountNumber} onChange={e => setField('accountNumber', e.target.value)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">A/C Holder Name</Label>
                  <Input value={draft.acHolderName} onChange={e => setField('acHolderName', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1">
                    IFSC Code
                    {ifscLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                    {draft.ifscAutoFilled && <Badge variant="outline" className="text-[9px]">auto</Badge>}
                  </Label>
                  <Input
                    value={draft.ifscCode}
                    onChange={e => setField('ifscCode', e.target.value.toUpperCase())}
                    onBlur={handleIfscBlur}
                    className="font-mono uppercase"
                    maxLength={11}
                  />
                </div>
                <div>
                  <Label className="text-xs">Account Type</Label>
                  <Select value={draft.accountType} onValueChange={v => setField('accountType', v as BankAccountType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current">Current</SelectItem>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                      <SelectItem value="eefc">EEFC</SelectItem>
                      <SelectItem value="cash_credit">Cash Credit</SelectItem>
                      <SelectItem value="overdraft">Overdraft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Input value={draft.currency} onChange={e => setField('currency', e.target.value)} className="font-mono" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs">Branch Name</Label>
                  <Input value={draft.branchName} onChange={e => setField('branchName', e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Branch Address</Label>
                  <Input value={draft.branchAddress} onChange={e => setField('branchAddress', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">City</Label>
                  <Input value={draft.branchCity} onChange={e => setField('branchCity', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">State</Label>
                  <Input value={draft.branchState} onChange={e => setField('branchState', e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Pincode</Label>
                  <Input value={draft.branchPincode} onChange={e => setField('branchPincode', e.target.value)} className="font-mono" maxLength={6} />
                </div>
                <div>
                  <Label className="text-xs">MICR</Label>
                  <Input value={draft.micrCode} onChange={e => setField('micrCode', e.target.value)} className="font-mono" maxLength={9} />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">SWIFT</Label>
                  <Input value={draft.swiftCode} onChange={e => setField('swiftCode', e.target.value.toUpperCase())} className="font-mono uppercase" maxLength={11} />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Switch checked={draft.neftEnabled} onCheckedChange={v => setField('neftEnabled', v)} />
                    <Label className="text-xs">NEFT enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={draft.rtgsEnabled} onCheckedChange={v => setField('rtgsEnabled', v)} />
                    <Label className="text-xs">RTGS enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={draft.impsEnabled} onCheckedChange={v => setField('impsEnabled', v)} />
                    <Label className="text-xs">IMPS enabled</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={draft.upiEnabled} onCheckedChange={v => setField('upiEnabled', v)} />
                    <Label className="text-xs">UPI enabled</Label>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Overdraft Limit (₹)</Label>
                  <Input type="number" value={draft.odLimit} onChange={e => setField('odLimit', Number(e.target.value) || 0)} className="font-mono" />
                </div>
                <div>
                  <Label className="text-xs">Bank Phone</Label>
                  <Input value={draft.bankPhone} onChange={e => setField('bankPhone', e.target.value)} className="font-mono" />
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Manager Name</Label>
                  <Input value={draft.bankManagerName} onChange={e => setField('bankManagerName', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Manager Phone</Label>
                    <Input value={draft.bankManagerPhone} onChange={e => setField('bankManagerPhone', e.target.value)} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Manager Email</Label>
                    <Input type="email" value={draft.bankManagerEmail} onChange={e => setField('bankManagerEmail', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Cheque Format</Label>
                    <Select value={draft.chequeFormat} onValueChange={v => setField('chequeFormat', v as BankLedger['chequeFormat'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HDFC_CTS">HDFC CTS</SelectItem>
                        <SelectItem value="SBI_CTS">SBI CTS</SelectItem>
                        <SelectItem value="ICICI_CTS">ICICI CTS</SelectItem>
                        <SelectItem value="AXIS_CTS">AXIS CTS</SelectItem>
                        <SelectItem value="GENERIC_CTS">Generic CTS</SelectItem>
                        <SelectItem value="CUSTOM">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cheque Size</Label>
                    <Select value={draft.chequeSize} onValueChange={v => setField('chequeSize', v as BankLedger['chequeSize'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A4">A4</SelectItem>
                        <SelectItem value="LEAF">Leaf</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Default Crossing</Label>
                    <Select value={draft.defaultCrossing} onValueChange={v => setField('defaultCrossing', v as BankLedger['defaultCrossing'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="account_payee">A/C Payee</SelectItem>
                        <SelectItem value="not_negotiable">Not Negotiable</SelectItem>
                        <SelectItem value="none">None</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Clearing Days</Label>
                    <Input type="number" value={draft.clearingDays} onChange={e => setField('clearingDays', Number(e.target.value) || 0)} className="font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Switch checked={draft.brsEnabled} onCheckedChange={v => setField('brsEnabled', v)} />
                  <Label className="text-xs">Bank Reconciliation enabled</Label>
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Bank GSTIN</Label>
                    <Input value={draft.bankGstin} onChange={e => setField('bankGstin', e.target.value.toUpperCase())} className="font-mono uppercase" maxLength={15} />
                  </div>
                  <div>
                    <Label className="text-xs">Bank State Code</Label>
                    <Input value={draft.bankStateCode} onChange={e => setField('bankStateCode', e.target.value)} className="font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={draft.gstOnCharges} onCheckedChange={v => setField('gstOnCharges', v)} />
                  <Label className="text-xs">GST applied on bank charges</Label>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={draft.status} onValueChange={v => setField('status', v as BankLedger['status'])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="dormant">Dormant</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
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
            <Button onClick={save}>{isEdit ? 'Save Changes' : 'Create Bank Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
